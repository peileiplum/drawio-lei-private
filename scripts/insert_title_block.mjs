import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const targetFile = args[0];

if (!targetFile) {
  console.error(
    'Usage: node insert_title_block.mjs "<diagram.drawio>" [output.drawio] [--config title_block.config.json] [--position bottom-right|top-left]',
  );
  process.exit(1);
}

const optionValue = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1] ?? fallback;
};

const configPath = optionValue("--config", "title_block.config.json");
const configDir = path.dirname(path.resolve(configPath));
const config = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, "utf8"))
  : {};

const position = optionValue("--position", config.defaultPosition ?? "bottom-right");
const outputFile =
  args.find((arg, index) => {
    if (index === 0) return false;
    if (["--position", "--config"].includes(arg)) return false;
    if (index > 0 && ["--position", "--config"].includes(args[index - 1])) return false;
    return !arg.startsWith("--");
  }) ?? targetFile;

const department = config.fields?.department ?? "";
const drawnBy = config.fields?.drawnBy ?? "";
const timezone = config.timezone ?? "UTC";
const modifiedDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: timezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const confidentiality = config.finePrint ?? "";
const drawingName = path.basename(targetFile, path.extname(targetFile));
const logoPath = path.resolve(configDir, config.logo ?? "logo.svg");
const logoSvg = fs.readFileSync(logoPath, "utf8");
const logoDataUri = `data:image/svg+xml,${encodeURIComponent(logoSvg)}`;

const esc = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const getAttr = (tag, name, fallback = "") => {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`));
  return match ? match[1] : fallback;
};

const setAttr = (tag, name, value) => {
  const escaped = esc(value);
  if (tag.includes(`${name}="`)) {
    return tag.replace(new RegExp(`${name}="[^"]*"`), `${name}="${escaped}"`);
  }
  return tag.replace(/>$/, ` ${name}="${escaped}">`);
};

const compactLabelStyle = [
  "rounded=0",
  "whiteSpace=wrap",
  "html=1",
  "fillColor=none",
  "strokeColor=none",
  "fontColor=#64748B",
  "fontSize=9",
  "fontStyle=1",
  "align=left",
  "verticalAlign=middle",
].join(";");

const compactValueStyle = [
  "rounded=0",
  "whiteSpace=wrap",
  "html=1",
  "fillColor=none",
  "strokeColor=none",
  "fontColor=#334155",
  "fontSize=10",
  "fontStyle=1",
  "align=left",
  "verticalAlign=middle",
].join(";");

const cell = ({ id, value = "", style, x, y, w, h }) => `        <mxCell id="${id}" value="${esc(value)}" style="${esc(style)}" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry" />
        </mxCell>`;

const titleBlockCells = ({ x, y, prefix }) => [
  cell({
    id: `${prefix}-outer`,
    style:
      "rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;fillOpacity=92;strokeColor=#CBD5E1;strokeWidth=1;",
    x,
    y,
    w: 760,
    h: 68,
  }),
  cell({
    id: `${prefix}-accent`,
    style: "rounded=0;whiteSpace=wrap;html=1;fillColor=#E1251B;strokeColor=#E1251B;",
    x,
    y,
    w: 4,
    h: 68,
  }),
  cell({
    id: `${prefix}-logo`,
    style: `shape=image;html=1;verticalLabelPosition=bottom;labelBackgroundColor=#FFFFFF;imageAspect=1;aspect=fixed;image=${logoDataUri};`,
    x: x + 20,
    y: y + 16,
    w: 132,
    h: 23,
  }),
  cell({
    id: `${prefix}-divider`,
    style:
      "rounded=0;whiteSpace=wrap;html=1;fillColor=#E2E8F0;strokeColor=#E2E8F0;",
    x: x + 172,
    y: y + 12,
    w: 1,
    h: 44,
  }),
  cell({
    id: `${prefix}-divider-right`,
    style:
      "rounded=0;whiteSpace=wrap;html=1;fillColor=#E2E8F0;strokeColor=#E2E8F0;",
    x: x + 462,
    y: y + 12,
    w: 1,
    h: 44,
  }),
  cell({
    id: `${prefix}-drawing-label`,
    value: "Drawing",
    style: compactLabelStyle,
    x: x + 196,
    y: y + 9,
    w: 56,
    h: 18,
  }),
  cell({
    id: `${prefix}-drawing-value`,
    value: drawingName,
    style:
      "rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor=none;fontColor=#0F172A;fontStyle=1;fontSize=14;align=left;verticalAlign=middle;",
    x: x + 274,
    y: y + 8,
    w: 210,
    h: 20,
  }),
  cell({
    id: `${prefix}-department-label`,
    value: "Department",
    style: compactLabelStyle,
    x: x + 196,
    y: y + 35,
    w: 70,
    h: 18,
  }),
  cell({
    id: `${prefix}-department-value`,
    value: department,
    style: compactValueStyle,
    x: x + 274,
    y: y + 35,
    w: 170,
    h: 18,
  }),
  cell({
    id: `${prefix}-date-label`,
    value: "Date",
    style: compactLabelStyle,
    x: x + 486,
    y: y + 9,
    w: 32,
    h: 18,
  }),
  cell({
    id: `${prefix}-date-value`,
    value: modifiedDate,
    style: compactValueStyle,
    x: x + 552,
    y: y + 9,
    w: 96,
    h: 18,
  }),
  cell({
    id: `${prefix}-drawn-by-label`,
    value: "Drawn By",
    style: compactLabelStyle,
    x: x + 486,
    y: y + 35,
    w: 58,
    h: 18,
  }),
  cell({
    id: `${prefix}-drawn-by-value`,
    value: drawnBy,
    style: compactValueStyle,
    x: x + 552,
    y: y + 35,
    w: 96,
    h: 18,
  }),
  cell({
    id: `${prefix}-confidentiality`,
    value: confidentiality,
    style:
      "rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor=none;fontColor=#94A3B8;fontSize=6;align=left;verticalAlign=middle;",
    x: x + 20,
    y: y + 49,
    w: 220,
    h: 12,
  }),
].join("\n");

const bounds = (diagramXml) => {
  const cells = diagramXml.matchAll(/<mxGeometry\b[^>]*\bas="geometry"[^>]*\/>/g);
  let minX = Infinity;
  let minY = Infinity;
  let maxY = 0;
  for (const match of cells) {
    const tag = match[0];
    const x = Number(getAttr(tag, "x", "0"));
    const y = Number(getAttr(tag, "y", "0"));
    const w = Number(getAttr(tag, "width", "0"));
    const h = Number(getAttr(tag, "height", "0"));
    if (Number.isFinite(x) && Number.isFinite(w) && w > 0) minX = Math.min(minX, x);
    if (Number.isFinite(y) && Number.isFinite(h) && h > 0) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + h);
    }
  }
  return {
    minX: Number.isFinite(minX) ? minX : 0,
    minY: Number.isFinite(minY) ? minY : 0,
    maxY,
  };
};

const removeExistingTitleBlocks = (diagramXml) => {
  let clean = diagramXml.replace(
    /\s*<mxCell id="lei-title-block-[^"]*"[\s\S]*?<\/mxCell>/g,
    "",
  );

  for (const id of config.legacyCellIds ?? []) {
    clean = clean.replace(
      new RegExp(`\\s*<mxCell id="${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]*?<\\/mxCell>`, "g"),
      "",
    );
  }

  return clean;
};

const insertInDiagram = (diagramXml, index) => {
  let clean = removeExistingTitleBlocks(diagramXml);
  const modelMatch = clean.match(/<mxGraphModel\b[^>]*>/);
  if (!modelMatch) return clean;

  let modelTag = modelMatch[0];
  const pageWidth = Number(getAttr(modelTag, "pageWidth", "1280"));
  let pageHeight = Number(getAttr(modelTag, "pageHeight", "944"));
  const { minX, minY, maxY } = bounds(clean);
  const width = 760;
  const height = 68;
  const margin = 24;
  let x;
  let y;

  if (position === "top-left") {
    x = minX;
    y = minY - height - margin;
  } else {
    x = Math.max(margin, pageWidth - width - margin);
    y = Math.max(maxY + margin, pageHeight - height - margin);
  }

  const requiredHeight = Math.max(pageHeight, y + height + margin);

  if (requiredHeight > pageHeight) {
    pageHeight = Math.ceil(requiredHeight / 8) * 8;
    const nextModelTag = setAttr(modelTag, "pageHeight", String(pageHeight));
    clean = clean.replace(modelTag, nextModelTag);
    modelTag = nextModelTag;
  }

  const cells = titleBlockCells({ x, y, prefix: `lei-title-block-${index}` });
  return clean.replace(/(\s*<\/root>)/, `\n${cells}$1`);
};

const source = fs.readFileSync(targetFile, "utf8");
let diagramIndex = 0;
const next = source.replace(
  /<diagram\b[\s\S]*?<\/diagram>/g,
  (diagramXml) => insertInDiagram(diagramXml, ++diagramIndex),
);
fs.writeFileSync(outputFile, next);
console.log(`Inserted title block into ${diagramIndex} page(s): ${outputFile}`);
