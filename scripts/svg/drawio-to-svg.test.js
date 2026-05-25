/**
 * drawio-to-svg.test.js
 * Unit tests for the draw.io XML to SVG converter
 * Uses Node.js built-in test runner
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'
import { detectUnsupportedSvgFeatures, drawioToSvg } from './drawio-to-svg.js'

// ============================================================================
// Test Fixtures
// ============================================================================

const BASIC_TWO_NODES_ONE_EDGE = `
<mxGraphModel dx="0" dy="0" pageWidth="800" pageHeight="600">
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Node A" style="rounded=1;fillColor=#DBEAFE;strokeColor=#2563EB;" vertex="1" parent="1">
      <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
    </mxCell>
    <mxCell id="3" value="Node B" style="rounded=1;fillColor=#D1FAE5;strokeColor=#059669;" vertex="1" parent="1">
      <mxGeometry x="400" y="100" width="120" height="60" as="geometry"/>
    </mxCell>
    <mxCell id="4" style="endArrow=block;" edge="1" source="2" target="3" parent="1">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`

const SERVICE_NODE = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="API Gateway" style="rounded=1;fillColor=#DBEAFE;strokeColor=#2563EB;" vertex="1" parent="1">
      <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`

const DATABASE_NODE = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="PostgreSQL" style="shape=cylinder3;fillColor=#D1FAE5;strokeColor=#059669;" vertex="1" parent="1">
      <mxGeometry x="100" y="100" width="100" height="80" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`

const EDGE_WITH_BLOCK_ARROW = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="A" style="rounded=1;" vertex="1" parent="1">
      <mxGeometry x="50" y="50" width="80" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="3" value="B" style="rounded=1;" vertex="1" parent="1">
      <mxGeometry x="250" y="50" width="80" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="4" style="endArrow=block;" edge="1" source="2" target="3" parent="1">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`

const NODE_WITH_LABEL = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Hello" style="rounded=0;" vertex="1" parent="1">
      <mxGeometry x="50" y="50" width="100" height="50" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`

const NODE_WITH_COLOR = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Red Box" style="fillColor=#FF0000;strokeColor=#CC0000;" vertex="1" parent="1">
      <mxGeometry x="50" y="50" width="100" height="50" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`

const SWITCH_NODE = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Core Switch" style="shape=switch;fillColor=#DBEAFE;strokeColor=#2563EB;" vertex="1" parent="1">
      <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`

const LOAD_BALANCER_NODE = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Reverse Proxy" style="shape=hexagon;perimeter=hexagonPerimeter2;fillColor=#DBEAFE;strokeColor=#2563EB;" vertex="1" parent="1">
      <mxGeometry x="100" y="100" width="140" height="80" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`

const FIREWALL_NODE = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Firewall" style="shape=mxgraph.cisco.firewalls.firewall;fillColor=#FDE68A;strokeColor=#B45309;" vertex="1" parent="1">
      <mxGeometry x="100" y="100" width="120" height="80" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`

const AP_NODE = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Wireless AP" style="shape=mxgraph.cisco.wireless.access_point;fillColor=#DBEAFE;strokeColor=#2563EB;" vertex="1" parent="1">
      <mxGeometry x="100" y="100" width="100" height="100" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`

const AWS_ICON_NODE = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="TGW" style="shape=mxgraph.aws4.transit_gateway;fillColor=#232F3E;strokeColor=#ffffff;" vertex="1" parent="1">
      <mxGeometry x="100" y="100" width="78" height="78" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`

const IMAGE_NODE = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Logo" style="shape=image;image=data:image/png;base64,abc123;" vertex="1" parent="1">
      <mxGeometry x="100" y="100" width="78" height="78" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`

const EDGE_WITH_START_ARROW = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="X" style="rounded=1;" vertex="1" parent="1">
      <mxGeometry x="50" y="50" width="80" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="3" value="Y" style="rounded=1;" vertex="1" parent="1">
      <mxGeometry x="250" y="50" width="80" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="4" style="startArrow=diamond;endArrow=block;" edge="1" source="2" target="3" parent="1">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`

const MULTI_EDGE_TRIANGLE = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="A" style="rounded=1;" vertex="1" parent="1">
      <mxGeometry x="50" y="50" width="80" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="3" value="B" style="rounded=1;" vertex="1" parent="1">
      <mxGeometry x="250" y="50" width="80" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="4" value="C" style="rounded=1;" vertex="1" parent="1">
      <mxGeometry x="150" y="200" width="80" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="5" style="endArrow=block;" edge="1" source="2" target="3" parent="1">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>
    <mxCell id="6" style="endArrow=block;" edge="1" source="3" target="4" parent="1">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>
    <mxCell id="7" style="endArrow=block;" edge="1" source="4" target="2" parent="1">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`

const MODULE_WITH_CHILD = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Module" style="rounded=1;fillColor=#F8FAFC;strokeColor=#E2E8F0;" vertex="1" parent="1">
      <mxGeometry x="20" y="20" width="300" height="200" as="geometry"/>
    </mxCell>
    <mxCell id="3" value="Child Node" style="rounded=1;fillColor=#DBEAFE;strokeColor=#2563EB;" vertex="1" parent="2">
      <mxGeometry x="40" y="60" width="120" height="60" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`

const EDGE_WITH_OPEN_ARROW = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="X" style="rounded=1;" vertex="1" parent="1">
      <mxGeometry x="50" y="50" width="80" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="3" value="Y" style="rounded=1;" vertex="1" parent="1">
      <mxGeometry x="250" y="50" width="80" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="4" style="endArrow=open;" edge="1" source="2" target="3" parent="1">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`

const EDGE_WITH_NO_ARROW = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="P" style="rounded=1;" vertex="1" parent="1">
      <mxGeometry x="50" y="50" width="80" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="3" value="Q" style="rounded=1;" vertex="1" parent="1">
      <mxGeometry x="250" y="50" width="80" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="4" style="endArrow=none;" edge="1" source="2" target="3" parent="1">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`

const EDGE_WITH_LABEL = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Src" style="rounded=1;" vertex="1" parent="1">
      <mxGeometry x="50" y="50" width="80" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="3" value="Dst" style="rounded=1;" vertex="1" parent="1">
      <mxGeometry x="250" y="50" width="80" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="4" value="connects" style="endArrow=block;" edge="1" source="2" target="3" parent="1">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`

const EDGE_WITH_PORT_HINTS = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Top" style="rounded=1;" vertex="1" parent="1">
      <mxGeometry x="50" y="50" width="80" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="3" value="Bottom" style="rounded=1;" vertex="1" parent="1">
      <mxGeometry x="50" y="150" width="80" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="4" style="exitX=0.5;exitY=1;entryX=0.5;entryY=0;endArrow=block;" edge="1" source="2" target="3" parent="1">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`

const EDGE_WITH_CHILD_LABEL = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Src" style="rounded=1;" vertex="1" parent="1">
      <mxGeometry x="50" y="50" width="80" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="3" value="Dst" style="rounded=1;" vertex="1" parent="1">
      <mxGeometry x="250" y="50" width="80" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="4" style="endArrow=block;" edge="1" source="2" target="3" parent="1">
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="180" y="70"/>
          <mxPoint x="180" y="140"/>
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell id="5" value="routed" style="edgeLabel;html=1;align=center;verticalAlign=middle;" vertex="1" connectable="0" parent="4">
      <mxGeometry x="0.5" relative="1" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`

const ORTHOGONAL_DIAGONAL_EDGE = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="A" style="rounded=1;" vertex="1" parent="1">
      <mxGeometry x="50" y="50" width="80" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="3" value="B" style="rounded=1;" vertex="1" parent="1">
      <mxGeometry x="250" y="150" width="80" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="4" style="edgeStyle=orthogonalEdgeStyle;endArrow=block;" edge="1" source="2" target="3" parent="1">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`

// ============================================================================
// Tests
// ============================================================================

describe('drawioToSvg', () => {
  it('should convert basic 2-node 1-edge diagram to SVG', () => {
    const svg = drawioToSvg(BASIC_TWO_NODES_ONE_EDGE)
    assert.ok(svg.startsWith('<svg'), 'Output should start with <svg')
    assert.ok(svg.includes('</svg>'), 'Output should contain closing </svg>')
  })

  it('should render service node as rounded rect', () => {
    const svg = drawioToSvg(SERVICE_NODE)
    assert.ok(svg.includes('<rect'), 'Service node should produce a <rect element')
    assert.ok(svg.includes('rx='), 'Rounded rect should have rx attribute')
  })

  it('should render database shape as cylinder with ellipse', () => {
    const svg = drawioToSvg(DATABASE_NODE)
    assert.ok(
      svg.includes('<ellipse') || svg.includes('<path'),
      'Database/cylinder shape should contain <ellipse or <path'
    )
  })

  it('should render edges between nodes', () => {
    const svg = drawioToSvg(BASIC_TWO_NODES_ONE_EDGE)
    assert.ok(
      svg.includes('<line') || svg.includes('<path'),
      'Edge should produce a <line or <path element'
    )
  })

  it('should include arrow marker definition for endArrow=block', () => {
    const svg = drawioToSvg(EDGE_WITH_BLOCK_ARROW)
    assert.ok(svg.includes('<marker'), 'Output should contain <marker for arrow definition')
    assert.ok(svg.includes('arrow-block'), 'Output should contain arrow-block marker id')
  })

  it('should render text label from node value', () => {
    const svg = drawioToSvg(NODE_WITH_LABEL)
    assert.ok(svg.includes('>Hello<'), 'Output should contain the label text Hello')
  })

  it('should apply fill color from style', () => {
    const svg = drawioToSvg(NODE_WITH_COLOR)
    assert.ok(
      svg.includes('fill="#FF0000"') || svg.includes('fill: #FF0000'),
      'Output should contain the fill color #FF0000'
    )
  })

  it('should embed original XML as data-drawio attribute', () => {
    const svg = drawioToSvg(SERVICE_NODE)
    assert.ok(svg.includes('data-drawio='), 'Output should contain data-drawio attribute')
  })

  it('should throw on empty input', () => {
    assert.throws(() => drawioToSvg(''), Error, 'Empty string should throw Error')
    assert.throws(() => drawioToSvg('   '), Error, 'Whitespace-only string should throw Error')
  })

  it('should include marker-start when startArrow is specified', () => {
    const svg = drawioToSvg(EDGE_WITH_START_ARROW)
    assert.ok(
      svg.includes('marker-start'),
      'Output should contain marker-start attribute when startArrow is set'
    )
  })

  // --- Multi-edge and arrow type tests ---

  it('should render multi-edge diagram with 3+ edges', () => {
    const svg = drawioToSvg(MULTI_EDGE_TRIANGLE)
    assert.ok(svg.startsWith('<svg'), 'Output should start with <svg')
    const edgeMatches = svg.match(/<(line|path)\b/g) || []
    assert.ok(edgeMatches.length >= 3, `Should have at least 3 edge elements, found ${edgeMatches.length}`)
  })

  it('should render module/container and child node', () => {
    const svg = drawioToSvg(MODULE_WITH_CHILD)
    assert.ok(svg.includes('Module'), 'Output should contain module label')
    assert.ok(svg.includes('Child Node'), 'Output should contain child node label')
    assert.ok(
      svg.includes('<rect x="60" y="80" width="120" height="60"'),
      'Child node coordinates should be resolved relative to the module'
    )
    assert.ok(
      !svg.includes('<rect x="40" y="60" width="120" height="60"'),
      'Child node should not render at its parent-relative coordinates'
    )
  })

  it('should handle open arrow type', () => {
    const svg = drawioToSvg(EDGE_WITH_OPEN_ARROW)
    assert.ok(svg.includes('<marker'), 'Output should contain marker for arrow')
    assert.ok(svg.includes('arrow-open'), 'Output should contain arrow-open marker id')
  })

  it('should handle none arrow type (no marker-end)', () => {
    const svg = drawioToSvg(EDGE_WITH_NO_ARROW)
    assert.ok(svg.startsWith('<svg'), 'Output should start with <svg')
    assert.ok(!svg.includes('marker-end'), 'endArrow=none should not produce marker-end attribute')
  })

  it('should render edge label text', () => {
    const svg = drawioToSvg(EDGE_WITH_LABEL)
    assert.ok(svg.includes('>connects<'), 'Output should contain the edge label text')
  })

  it('should honor explicit edge exit and entry ports', () => {
    const svg = drawioToSvg(EDGE_WITH_PORT_HINTS)
    assert.ok(
      svg.includes('<line x1="90" y1="90" x2="90" y2="150"'),
      'Edge should use exit/entry coordinates instead of center-to-center coordinates'
    )
  })

  it('should render child edge labels without drawing them as normal nodes', () => {
    const svg = drawioToSvg(EDGE_WITH_CHILD_LABEL)
    assert.ok(svg.includes('>routed<'), 'Output should contain the child edge label text')
    assert.ok(svg.includes('<path d="M 130 70 L 180 70 L 180 140 L 250 70"'), 'Waypoint edge should render as a path')
    assert.ok(
      !svg.includes('<rect x="0.5" y="0" width="0" height="0"'),
      'Edge label pseudo-cell should not render as a normal vertex'
    )
  })

  it('should render orthogonal diagonal edges as routed paths', () => {
    const svg = drawioToSvg(ORTHOGONAL_DIAGONAL_EDGE)
    assert.ok(
      svg.includes('<path d="M 130 70 L 190 70 L 190 170 L 250 170"'),
      'Orthogonal edge should route from shape boundary using right-angle segments'
    )
  })

  // --- Shape type rendering tests ---

  it('should render rhombus shape as <polygon>', () => {
    const xml = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Decision" style="rhombus;fillColor=#FEF9C3;strokeColor=#CA8A04;" vertex="1" parent="1">
      <mxGeometry x="100" y="100" width="120" height="80" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`
    const svg = drawioToSvg(xml)
    assert.ok(svg.includes('<polygon'), 'Rhombus shape should render as <polygon>')
  })

  it('should render ellipse shape as <ellipse>', () => {
    const xml = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Oval" style="ellipse;fillColor=#DBEAFE;strokeColor=#2563EB;" vertex="1" parent="1">
      <mxGeometry x="100" y="100" width="120" height="80" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`
    const svg = drawioToSvg(xml)
    assert.ok(svg.includes('<ellipse'), 'Ellipse shape should render as <ellipse>')
  })

  it('should render roundedRect with rx attribute on <rect>', () => {
    const xml = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Box" style="rounded=1;fillColor=#DBEAFE;strokeColor=#2563EB;" vertex="1" parent="1">
      <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`
    const svg = drawioToSvg(xml)
    assert.ok(svg.includes('<rect'), 'Rounded rect should render as <rect>')
    assert.ok(svg.includes('rx='), 'Rounded rect should have rx attribute')
  })

  it('should render cylinder shape with <ellipse> elements', () => {
    const svg = drawioToSvg(DATABASE_NODE)
    assert.ok(svg.includes('<ellipse'), 'Cylinder shape should contain <ellipse> for top/bottom caps')
  })

  it('should render switch shapes without falling back to plain rectangles', () => {
    const svg = drawioToSvg(SWITCH_NODE)
    assert.ok(svg.includes('<path'), 'Switch shape should render as a path-based stencil')
  })

  it('should render load balancer hexagons as polygons', () => {
    const svg = drawioToSvg(LOAD_BALANCER_NODE)
    assert.ok(svg.includes('<polygon'), 'Hexagon shape should render as <polygon>')
  })

  it('should render firewall stencils as composed SVG shapes', () => {
    const svg = drawioToSvg(FIREWALL_NODE)
    const pathCount = (svg.match(/<path\b/g) || []).length
    assert.ok(pathCount >= 2, 'Firewall shape should render multiple path elements')
  })

  it('should render wireless access points with antenna arcs', () => {
    const svg = drawioToSvg(AP_NODE)
    assert.ok(svg.includes('<ellipse'), 'AP shape should include a base ellipse')
    assert.ok(svg.includes('<path'), 'AP shape should include antenna arcs')
  })

  it('should report unsupported draw.io stencil shapes', () => {
    const features = detectUnsupportedSvgFeatures(AWS_ICON_NODE)
    assert.deepStrictEqual(features, [
      { type: 'stencil', value: 'mxgraph.aws4.transit_gateway', count: 1 }
    ])
  })

  it('should report unsupported image shapes', () => {
    const features = detectUnsupportedSvgFeatures(IMAGE_NODE)
    assert.deepStrictEqual(features, [
      { type: 'image', value: 'data:image/png', count: 1 }
    ])
  })

  it('should render edge as <line> element', () => {
    const svg = drawioToSvg(EDGE_WITH_BLOCK_ARROW)
    assert.ok(svg.includes('<line'), 'Edge should render as <line> element')
  })

  it('should render background color from graph attributes', () => {
    const xml = `
<mxGraphModel background="#E0F2FE">
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Node" style="rounded=1;" vertex="1" parent="1">
      <mxGeometry x="50" y="50" width="100" height="50" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`
    const svg = drawioToSvg(xml)
    assert.ok(
      svg.includes('fill="#E0F2FE"'),
      'Background color should render as <rect> with matching fill'
    )
  })

  it('should honor top-left label alignment and spacing', () => {
    const xml = `
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Container" style="rounded=1;align=left;verticalAlign=top;spacingLeft=12;spacingTop=10;fontStyle=1;fontSize=14;" vertex="1" parent="1">
      <mxGeometry x="40" y="30" width="200" height="120" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`
    const svg = drawioToSvg(xml)
    assert.ok(svg.includes('text-anchor="start"'), 'Left aligned label should use start anchor')
    assert.ok(svg.includes('dominant-baseline="hanging"'), 'Top aligned label should use hanging baseline')
    assert.ok(svg.includes('<text x="52" y="40"'), 'Label should include spacingLeft and spacingTop')
    assert.ok(svg.includes('font-weight="700"'), 'Bold fontStyle bit should render as font-weight')
  })

  it('should throw Error on null input', () => {
    assert.throws(() => drawioToSvg(null), Error, 'null input should throw Error')
  })

  it('should throw Error on non-string input', () => {
    assert.throws(() => drawioToSvg(42), Error, 'Number input should throw Error')
    assert.throws(() => drawioToSvg(undefined), Error, 'undefined input should throw Error')
  })
})
