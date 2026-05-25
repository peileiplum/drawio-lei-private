/**
 * drawio-to-svg.js
 * Converts draw.io mxGraphModel XML to standalone SVG
 * Uses shared XML utilities from ../shared/xml-utils.js
 */

import {
  attr,
  decodeEntities,
  escapeXml,
  extractCells,
  extractGraphAttrs,
  parseStyle
} from '../shared/xml-utils.js'

/**
 * Parse mxGraphModel XML into a structured object
 * @param {string} xml
 * @returns {{ graph: object, cells: object[] }}
 */
function parseDrawioXml(xml) {
  const graph = extractGraphAttrs(xml)
  const cells = extractCells(xml)
  return { graph, cells }
}

// ============================================================================
// Shape Classification
// ============================================================================

const SUPPORTED_MXGRAPH_SHAPES = new Set([
  'mxgraph.cisco.firewalls.firewall',
  'mxgraph.cisco.wireless.access_point'
])

/**
 * Determine the shape type from a parsed style map
 * @param {Map<string, string>} style
 * @returns {string}
 */
function classifyShape(style) {
  const shape = style.get('shape')
  if (shape === 'cylinder3' || shape === 'cylinder') return 'cylinder'
  if (shape === 'parallelogram') return 'parallelogram'
  if (shape === 'document') return 'document'
  if (shape === 'cloud') return 'cloud'
  if (shape === 'switch') return 'switch'
  if (shape === 'hexagon') return 'hexagon'
  if (shape === 'mxgraph.cisco.firewalls.firewall') return 'firewall'
  if (shape === 'mxgraph.cisco.wireless.access_point') return 'wirelessAp'
  if (style.has('rhombus')) return 'rhombus'
  if (style.has('ellipse')) return 'ellipse'
  const rounded = style.get('rounded')
  const arcSize = Number(style.get('arcSize')) || 0
  if (rounded === '1' && arcSize >= 50) return 'stadium'
  if (rounded === '1') return 'roundedRect'
  return 'rect'
}

function addUnsupportedFeature(featureMap, type, value) {
  if (!value) return
  const key = `${type}:${value}`
  const existing = featureMap.get(key)
  if (existing) {
    existing.count += 1
  } else {
    featureMap.set(key, { type, value, count: 1 })
  }
}

function detectUnsupportedStyleFeatures(style, featureMap) {
  const shape = style.get('shape')
  if (shape?.startsWith('mxgraph.') && !SUPPORTED_MXGRAPH_SHAPES.has(shape)) {
    addUnsupportedFeature(featureMap, 'stencil', shape)
  }
  if (shape?.startsWith('stencil(')) {
    addUnsupportedFeature(featureMap, 'stencil', shape)
  }
  if (shape === 'image' || style.has('image')) {
    addUnsupportedFeature(featureMap, 'image', style.get('image') || 'shape=image')
  }

  const resIcon = style.get('resIcon')
  if (resIcon?.startsWith('mxgraph.') && !SUPPORTED_MXGRAPH_SHAPES.has(resIcon)) {
    addUnsupportedFeature(featureMap, 'stencil', resIcon)
  }
}

/**
 * Detect draw.io features that the lightweight SVG renderer approximates.
 * @param {string} xmlString - draw.io mxGraphModel XML content
 * @returns {Array<{type: string, value: string, count: number}>}
 */
export function detectUnsupportedSvgFeatures(xmlString) {
  if (!xmlString || typeof xmlString !== 'string' || xmlString.trim().length === 0) {
    return []
  }

  const { cells } = parseDrawioXml(xmlString)
  const features = new Map()
  for (const cell of cells) {
    if (!cell.vertex) continue
    detectUnsupportedStyleFeatures(parseStyle(cell.style), features)
  }
  return [...features.values()]
}

// ============================================================================
// Arrow Marker Definitions
// ============================================================================

const ARROW_TYPES = ['block', 'open', 'classic', 'diamond']

/**
 * Build SVG <defs> with arrow markers
 * @returns {string}
 */
function buildMarkerDefs() {
  const markers = []

  // block arrow (filled triangle)
  markers.push(
    '<marker id="arrow-block" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">',
    '  <path d="M 0 0 L 10 5 L 0 10 Z" fill="currentColor"/>',
    '</marker>'
  )

  // open arrow (chevron)
  markers.push(
    '<marker id="arrow-open" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">',
    '  <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="currentColor" stroke-width="1.5"/>',
    '</marker>'
  )

  // classic arrow (filled arrow)
  markers.push(
    '<marker id="arrow-classic" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">',
    '  <path d="M 0 0 L 10 5 L 0 10 L 3 5 Z" fill="currentColor"/>',
    '</marker>'
  )

  // diamond
  markers.push(
    '<marker id="arrow-diamond" viewBox="0 0 12 12" refX="12" refY="6" markerWidth="10" markerHeight="10" orient="auto-start-reverse">',
    '  <path d="M 0 6 L 6 0 L 12 6 L 6 12 Z" fill="currentColor"/>',
    '</marker>'
  )

  return `<defs>\n${markers.join('\n')}\n</defs>`
}

/**
 * Resolve an arrow type name to a marker URL reference
 * @param {string} arrowType
 * @param {'start'|'end'} position
 * @returns {string} marker-start or marker-end attribute, or empty string
 */
function markerRef(arrowType, position) {
  if (!arrowType || arrowType === 'none') return ''
  const id = ARROW_TYPES.includes(arrowType) ? `arrow-${arrowType}` : 'arrow-block'
  const attrName = position === 'start' ? 'marker-start' : 'marker-end'
  return ` ${attrName}="url(#${id})"`
}

function numberFromStyle(style, key, fallback = 0) {
  const value = Number(style.get(key))
  return Number.isFinite(value) ? value : fallback
}

function labelLines(value) {
  const decoded = decodeEntities(value)
    .replace(/&#xa;|&#10;/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
  return decoded
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function textStyleAttrs(style) {
  const fontStyle = Number(style.get('fontStyle')) || 0
  const attrs = []
  if ((fontStyle & 1) === 1) attrs.push('font-weight="700"')
  if ((fontStyle & 2) === 2) attrs.push('font-style="italic"')
  if ((fontStyle & 4) === 4) attrs.push('text-decoration="underline"')
  return attrs.length ? ` ${attrs.join(' ')}` : ''
}

function renderTextLabel(cell, style, geo, defaults = {}) {
  const lines = labelLines(cell.value)
  if (lines.length === 0) return ''

  const { x, y, width, height } = geo
  const fontColor = style.get('fontColor') || defaults.fontColor || '#000000'
  const fontSize = Number(style.get('fontSize')) || defaults.fontSize || 12
  const fontFamily = style.get('fontFamily') || defaults.fontFamily || 'sans-serif'
  const lineHeight = Math.max(fontSize * 1.2, fontSize + 2)

  const align = style.get('align') || 'center'
  const verticalAlign = style.get('verticalAlign') || 'middle'
  const spacingLeft = numberFromStyle(style, 'spacingLeft')
  const spacingRight = numberFromStyle(style, 'spacingRight')
  const spacingTop = numberFromStyle(style, 'spacingTop')
  const spacingBottom = numberFromStyle(style, 'spacingBottom')

  let textX = x + width / 2
  let anchor = 'middle'
  if (align === 'left') {
    textX = x + spacingLeft
    anchor = 'start'
  } else if (align === 'right') {
    textX = x + width - spacingRight
    anchor = 'end'
  }

  let textY = y + height / 2 - ((lines.length - 1) * lineHeight) / 2
  let baseline = 'central'
  let firstDy = 0
  if (verticalAlign === 'top') {
    textY = y + spacingTop
    baseline = 'hanging'
  } else if (verticalAlign === 'bottom') {
    textY = y + height - spacingBottom - ((lines.length - 1) * lineHeight)
    baseline = 'auto'
  }

  const tspans = lines.map((line, index) => {
    const dy = index === 0 ? firstDy : lineHeight
    return `<tspan x="${textX}" dy="${dy}">${escapeXml(line)}</tspan>`
  }).join('')

  return (
    `<text x="${textX}" y="${textY}" text-anchor="${anchor}" dominant-baseline="${baseline}" ` +
    `font-family="${escapeXml(fontFamily)}" font-size="${fontSize}" fill="${fontColor}"${textStyleAttrs(style)}>` +
    `${tspans}</text>`
  )
}

// ============================================================================
// Shape SVG Renderers
// ============================================================================

/**
 * Render a vertex cell to SVG elements
 * @param {object} cell - parsed cell
 * @param {Map<string, string>} style - parsed style
 * @returns {string} SVG markup
 */
function renderVertex(cell, style, absoluteGeometry = null) {
  const geo = absoluteGeometry || cell.geometry || { x: 0, y: 0, width: 120, height: 60 }
  const { x, y, width, height } = geo

  const fillColor = style.get('fillColor') || '#FFFFFF'
  const strokeColor = style.get('strokeColor') || '#000000'
  const strokeWidth = Number(style.get('strokeWidth')) || 1
  let dashAttr = ''
  if (style.get('dashed') === '1') {
    const pattern = style.get('dashPattern') || '3 3'
    dashAttr = ` stroke-dasharray="${pattern}"`
  }

  const shapeType = classifyShape(style)
  const parts = []
  const baseAttrs = `fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}"${dashAttr}`

  switch (shapeType) {
    case 'roundedRect': {
      const rx = Number(style.get('arcSize')) || 8
      parts.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" ${baseAttrs}/>`)
      break
    }

    case 'stadium': {
      const rx = height / 2
      parts.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" ${baseAttrs}/>`)
      break
    }

    case 'cylinder': {
      const ellipseRY = Math.min(12, height * 0.15)
      // Body rectangle
      parts.push(`<rect x="${x}" y="${y + ellipseRY}" width="${width}" height="${height - ellipseRY * 2}" ${baseAttrs}/>`)
      // Bottom ellipse
      parts.push(`<ellipse cx="${x + width / 2}" cy="${y + height - ellipseRY}" rx="${width / 2}" ry="${ellipseRY}" ${baseAttrs}/>`)
      // Top ellipse (drawn last so it's on top)
      parts.push(`<ellipse cx="${x + width / 2}" cy="${y + ellipseRY}" rx="${width / 2}" ry="${ellipseRY}" ${baseAttrs}/>`)
      // Side lines connecting top and bottom ellipses
      parts.push(`<line x1="${x}" y1="${y + ellipseRY}" x2="${x}" y2="${y + height - ellipseRY}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`)
      parts.push(`<line x1="${x + width}" y1="${y + ellipseRY}" x2="${x + width}" y2="${y + height - ellipseRY}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`)
      break
    }

    case 'rhombus': {
      const cx = x + width / 2
      const cy = y + height / 2
      const points = `${cx},${y} ${x + width},${cy} ${cx},${y + height} ${x},${cy}`
      parts.push(`<polygon points="${points}" ${baseAttrs}/>`)
      break
    }

    case 'ellipse': {
      const cx = x + width / 2
      const cy = y + height / 2
      parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${width / 2}" ry="${height / 2}" ${baseAttrs}/>`)
      break
    }

    case 'parallelogram': {
      const skew = width * 0.2
      const points = `${x + skew},${y} ${x + width},${y} ${x + width - skew},${y + height} ${x},${y + height}`
      parts.push(`<polygon points="${points}" ${baseAttrs}/>`)
      break
    }

    case 'hexagon': {
      const inset = Math.min(width * 0.22, 24)
      const points = [
        `${x + inset},${y}`,
        `${x + width - inset},${y}`,
        `${x + width},${y + height / 2}`,
        `${x + width - inset},${y + height}`,
        `${x + inset},${y + height}`,
        `${x},${y + height / 2}`
      ].join(' ')
      parts.push(`<polygon points="${points}" ${baseAttrs}/>`)
      break
    }

    case 'switch': {
      const inset = Math.min(width * 0.18, 18)
      const d = [
        `M ${x + inset} ${y}`,
        `L ${x + width - inset} ${y}`,
        `L ${x + width} ${y + height / 2}`,
        `L ${x + width - inset} ${y + height}`,
        `L ${x + inset} ${y + height}`,
        `L ${x} ${y + height / 2}`,
        'Z'
      ].join(' ')
      const portY1 = y + height * 0.35
      const portY2 = y + height * 0.65
      parts.push(`<path d="${d}" ${baseAttrs}/>`)
      parts.push(`<line x1="${x + inset}" y1="${portY1}" x2="${x + width - inset}" y2="${portY1}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`)
      parts.push(`<line x1="${x + inset}" y1="${portY2}" x2="${x + width - inset}" y2="${portY2}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`)
      break
    }

    case 'document': {
      const waveH = height * 0.1
      const d = [
        `M ${x} ${y}`,
        `L ${x + width} ${y}`,
        `L ${x + width} ${y + height - waveH}`,
        `Q ${x + width * 0.75} ${y + height + waveH} ${x + width / 2} ${y + height - waveH}`,
        `Q ${x + width * 0.25} ${y + height - waveH * 3} ${x} ${y + height - waveH}`,
        'Z'
      ].join(' ')
      parts.push(`<path d="${d}" ${baseAttrs}/>`)
      break
    }

    case 'cloud': {
      // Simplified cloud: overlapping circles
      const cx = x + width / 2
      const cy = y + height / 2
      const rx = width * 0.45
      const ry = height * 0.35
      const d = [
        `M ${x + width * 0.25} ${cy + ry * 0.5}`,
        `A ${rx * 0.5} ${ry * 0.6} 0 0 1 ${x + width * 0.15} ${cy - ry * 0.2}`,
        `A ${rx * 0.5} ${ry * 0.6} 0 0 1 ${x + width * 0.35} ${cy - ry * 0.8}`,
        `A ${rx * 0.5} ${ry * 0.5} 0 0 1 ${cx} ${y + height * 0.15}`,
        `A ${rx * 0.5} ${ry * 0.5} 0 0 1 ${x + width * 0.7} ${cy - ry * 0.7}`,
        `A ${rx * 0.6} ${ry * 0.7} 0 0 1 ${x + width * 0.85} ${cy}`,
        `A ${rx * 0.5} ${ry * 0.6} 0 0 1 ${x + width * 0.75} ${cy + ry * 0.7}`,
        `A ${rx * 0.6} ${ry * 0.4} 0 0 1 ${x + width * 0.5} ${cy + ry * 0.8}`,
        `A ${rx * 0.5} ${ry * 0.4} 0 0 1 ${x + width * 0.25} ${cy + ry * 0.5}`,
        'Z'
      ].join(' ')
      parts.push(`<path d="${d}" ${baseAttrs}/>`)
      break
    }

    case 'firewall': {
      const archHeight = height * 0.18
      const bodyTop = y + archHeight
      const brickWidth = width / 4
      const brickHeight = (height - archHeight) / 3
      const outer = [
        `M ${x} ${bodyTop}`,
        `Q ${x + width / 2} ${y - archHeight * 0.2} ${x + width} ${bodyTop}`,
        `L ${x + width} ${y + height}`,
        `L ${x} ${y + height}`,
        'Z'
      ].join(' ')
      const mortar = [
        `M ${x + brickWidth} ${bodyTop} L ${x + brickWidth} ${y + height}`,
        `M ${x + brickWidth * 2} ${bodyTop} L ${x + brickWidth * 2} ${y + height}`,
        `M ${x + brickWidth * 3} ${bodyTop} L ${x + brickWidth * 3} ${y + height}`,
        `M ${x} ${bodyTop + brickHeight} L ${x + width} ${bodyTop + brickHeight}`,
        `M ${x} ${bodyTop + brickHeight * 2} L ${x + width} ${bodyTop + brickHeight * 2}`
      ].join(' ')
      parts.push(`<path d="${outer}" ${baseAttrs}/>`)
      parts.push(`<path d="${mortar}" fill="none" stroke="${strokeColor}" stroke-width="${Math.max(strokeWidth * 0.8, 1)}"/>`)
      break
    }

    case 'wirelessAp': {
      const cx = x + width / 2
      const cy = y + height / 2
      const baseRy = height * 0.12
      const baseY = y + height * 0.78
      const arc1 = [
        `M ${cx - width * 0.16} ${cy + height * 0.02}`,
        `Q ${cx} ${cy - height * 0.18} ${cx + width * 0.16} ${cy + height * 0.02}`
      ].join(' ')
      const arc2 = [
        `M ${cx - width * 0.28} ${cy + height * 0.1}`,
        `Q ${cx} ${cy - height * 0.32} ${cx + width * 0.28} ${cy + height * 0.1}`
      ].join(' ')
      parts.push(`<ellipse cx="${cx}" cy="${baseY}" rx="${width * 0.16}" ry="${baseRy}" ${baseAttrs}/>`)
      parts.push(`<line x1="${cx}" y1="${baseY - baseRy}" x2="${cx}" y2="${cy + height * 0.12}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`)
      parts.push(`<path d="${arc1}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`)
      parts.push(`<path d="${arc2}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`)
      break
    }

    default: {
      // Plain rectangle
      parts.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" ${baseAttrs}/>`)
      break
    }
  }

  // Text label
  const label = renderTextLabel(cell, style, geo)
  if (label) parts.push(label)

  return parts.join('\n')
}

// ============================================================================
// Edge Rendering
// ============================================================================

function isEdgeLabelCell(cell, cellMap) {
  if (!cell?.vertex) return false
  const style = parseStyle(cell.style)
  if (style.has('edgeLabel') || style.get('edgeLabel') === '1') return true
  const parent = cell.parent ? cellMap.get(cell.parent) : null
  return Boolean(parent?.edge)
}

/**
 * Resolve draw.io's parent-relative vertex coordinates to page coordinates.
 * @param {object} cell
 * @param {Map<string, object>} cellMap
 * @param {Map<string, object>} cache
 * @param {Set<string>} visiting
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
function absoluteGeometry(cell, cellMap, cache, visiting = new Set()) {
  if (!cell?.geometry) return { x: 0, y: 0, width: 120, height: 60 }
  if (cache.has(cell.id)) return cache.get(cell.id)

  const geo = {
    x: cell.geometry.x || 0,
    y: cell.geometry.y || 0,
    width: cell.geometry.width || 0,
    height: cell.geometry.height || 0
  }

  if (cell.id && visiting.has(cell.id)) return geo
  if (cell.id) visiting.add(cell.id)

  const parent = cell.parent ? cellMap.get(cell.parent) : null
  if (parent?.vertex && parent.geometry && !isEdgeLabelCell(cell, cellMap)) {
    const parentGeo = absoluteGeometry(parent, cellMap, cache, visiting)
    geo.x += parentGeo.x
    geo.y += parentGeo.y
  }

  if (cell.id) {
    cache.set(cell.id, geo)
    visiting.delete(cell.id)
  }
  return geo
}

/**
 * Compute center point of a cell's absolute geometry
 * @param {object} cell
 * @param {Map<string, object>} cellMap
 * @param {Map<string, object>} geometryCache
 * @returns {{ x: number, y: number }}
 */
function cellCenter(cell, cellMap, geometryCache) {
  const geo = absoluteGeometry(cell, cellMap, geometryCache)
  return {
    x: geo.x + geo.width / 2,
    y: geo.y + geo.height / 2
  }
}

function autoBoundaryPoint(cell, otherCell, cellMap, geometryCache) {
  const geo = absoluteGeometry(cell, cellMap, geometryCache)
  const center = cellCenter(cell, cellMap, geometryCache)
  if (!otherCell) return center

  const other = cellCenter(otherCell, cellMap, geometryCache)
  const dx = other.x - center.x
  const dy = other.y - center.y

  if (Math.abs(dx) >= Math.abs(dy)) {
    return {
      x: dx >= 0 ? geo.x + geo.width : geo.x,
      y: center.y
    }
  }

  return {
    x: center.x,
    y: dy >= 0 ? geo.y + geo.height : geo.y
  }
}

function cellConnectionPoint(cell, otherCell, style, prefix, cellMap, geometryCache) {
  const xKey = `${prefix}X`
  const yKey = `${prefix}Y`
  if (!style.has(xKey) || !style.has(yKey)) {
    return autoBoundaryPoint(cell, otherCell, cellMap, geometryCache)
  }

  const relX = Number(style.get(xKey))
  const relY = Number(style.get(yKey))
  if (!Number.isFinite(relX) || !Number.isFinite(relY)) {
    return autoBoundaryPoint(cell, otherCell, cellMap, geometryCache)
  }

  const geo = absoluteGeometry(cell, cellMap, geometryCache)
  const dx = numberFromStyle(style, `${prefix}Dx`)
  const dy = numberFromStyle(style, `${prefix}Dy`)
  return {
    x: geo.x + geo.width * relX + dx,
    y: geo.y + geo.height * relY + dy
  }
}

function orthogonalRoutePoints(start, end) {
  if (Math.abs(start.x - end.x) < 1 || Math.abs(start.y - end.y) < 1) {
    return [start, end]
  }

  if (Math.abs(start.x - end.x) >= Math.abs(start.y - end.y)) {
    const midX = (start.x + end.x) / 2
    return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end]
  }

  const midY = (start.y + end.y) / 2
  return [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end]
}

/**
 * Render an edge cell to SVG elements
 * @param {object} cell - parsed edge cell
 * @param {Map<string, string>} style - parsed style
 * @param {Map<string, object>} cellMap - id → cell lookup
 * @returns {string} SVG markup
 */
function renderEdge(cell, style, cellMap, geometryCache, edgeLabelsByParent) {
  const strokeColor = style.get('strokeColor') || '#000000'
  const strokeWidth = Number(style.get('strokeWidth')) || 1
  const fontColor = style.get('fontColor') || '#000000'
  const fontSize = Number(style.get('fontSize')) || 11

  let dashAttr = ''
  if (style.get('dashed') === '1') {
    const pattern = style.get('dashPattern') || '3 3'
    dashAttr = ` stroke-dasharray="${pattern}"`
  }

  const sourceCell = cell.source ? cellMap.get(cell.source) : null
  const targetCell = cell.target ? cellMap.get(cell.target) : null

  let x1 = 0, y1 = 0, x2 = 100, y2 = 100
  if (sourceCell) {
    const c = cellConnectionPoint(sourceCell, targetCell, style, 'exit', cellMap, geometryCache)
    x1 = c.x
    y1 = c.y
  }
  if (targetCell) {
    const c = cellConnectionPoint(targetCell, sourceCell, style, 'entry', cellMap, geometryCache)
    x2 = c.x
    y2 = c.y
  }

  const parts = []

  // Arrow markers
  const endArrow = style.get('endArrow') || 'classic'
  const startArrow = style.get('startArrow') || ''
  const endRef = markerRef(endArrow, 'end')
  const startRef = markerRef(startArrow, 'start')
  const colorStyle = ` style="color: ${strokeColor}"`

  const explicitPoints = cell.geometry?.points || []
  const edgeStyle = style.get('edgeStyle')
  const points = explicitPoints.length > 0
    ? [{ x: x1, y: y1 }, ...explicitPoints, { x: x2, y: y2 }]
    : edgeStyle === 'orthogonalEdgeStyle'
      ? orthogonalRoutePoints({ x: x1, y: y1 }, { x: x2, y: y2 })
      : [{ x: x1, y: y1 }, { x: x2, y: y2 }]

  if (points.length === 2) {
    parts.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ` +
      `stroke="${strokeColor}" stroke-width="${strokeWidth}"${dashAttr}` +
      `${endRef}${startRef}${colorStyle} fill="none"/>`
    )
  } else {
    const d = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ')
    parts.push(
      `<path d="${d}" stroke="${strokeColor}" stroke-width="${strokeWidth}"${dashAttr}` +
      `${endRef}${startRef}${colorStyle} fill="none"/>`
    )
  }

  // Edge label
  const label = decodeEntities(cell.value || edgeLabelsByParent.get(cell.id))
  if (label) {
    const midIndex = Math.floor((points.length - 1) / 2)
    const a = points[midIndex]
    const b = points[midIndex + 1] || a
    const midX = (a.x + b.x) / 2
    const midY = (a.y + b.y) / 2
    parts.push(
      `<text x="${midX}" y="${midY - 6}" text-anchor="middle" dominant-baseline="auto" ` +
      `font-size="${fontSize}" fill="${fontColor}">${escapeXml(label)}</text>`
    )
  }

  return parts.join('\n')
}

// ============================================================================
// Main Converter
// ============================================================================

/**
 * Convert draw.io mxGraphModel XML to standalone SVG
 * @param {string} xmlString - draw.io XML content
 * @returns {string} SVG markup
 * @throws {Error} if input is empty or not a string
 */
export function drawioToSvg(xmlString) {
  if (!xmlString || typeof xmlString !== 'string' || xmlString.trim().length === 0) {
    throw new Error('Input XML string must be non-empty')
  }

  const { graph, cells } = parseDrawioXml(xmlString)

  // Build cell lookup map
  const cellMap = new Map()
  for (const cell of cells) {
    if (cell.id) cellMap.set(cell.id, cell)
  }

  // Separate vertices and edges
  const geometryCache = new Map()
  const edgeLabelsByParent = new Map()
  for (const c of cells) {
    if (isEdgeLabelCell(c, cellMap) && c.parent) {
      const label = decodeEntities(c.value)
      if (label) edgeLabelsByParent.set(c.parent, label)
    }
  }

  const vertices = cells.filter(c => c.vertex && c.parent !== '0' && !isEdgeLabelCell(c, cellMap))
  const edges = cells.filter(c => c.edge)

  // Calculate viewBox dimensions from content if default
  let svgWidth = graph.pageWidth
  let svgHeight = graph.pageHeight

  // Expand viewBox if any shape extends beyond page bounds
  for (const v of vertices) {
    if (v.geometry) {
      const geo = absoluteGeometry(v, cellMap, geometryCache)
      svgWidth = Math.max(svgWidth, geo.x + geo.width + 20)
      svgHeight = Math.max(svgHeight, geo.y + geo.height + 20)
    }
  }

  // Encode original XML as base64 for round-trip editing
  const base64Xml = Buffer.from(xmlString, 'utf-8').toString('base64')

  // Build SVG
  const svgParts = []
  svgParts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" ` +
    `viewBox="0 0 ${svgWidth} ${svgHeight}" data-drawio="${base64Xml}">`
  )

  // Defs (arrow markers)
  svgParts.push(buildMarkerDefs())

  // Background
  if (graph.background && graph.background !== 'none') {
    svgParts.push(`<rect width="100%" height="100%" fill="${graph.background}"/>`)
  }

  // Render vertices first, then edges on top
  for (const v of vertices) {
    const style = parseStyle(v.style)
    svgParts.push(renderVertex(v, style, absoluteGeometry(v, cellMap, geometryCache)))
  }

  for (const e of edges) {
    const style = parseStyle(e.style)
    svgParts.push(renderEdge(e, style, cellMap, geometryCache, edgeLabelsByParent))
  }

  svgParts.push('</svg>')
  return svgParts.join('\n')
}
