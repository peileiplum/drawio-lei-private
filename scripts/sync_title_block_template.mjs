import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const sourceFile = args[0];

const optionValue = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1] ?? fallback;
};

const configPath = optionValue("--config", "title_block.config.json");
const configDir = path.dirname(path.resolve(configPath));
const config = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, "utf8"))
  : {};

const outputBase = optionValue("--output-base", config.templateBase ?? "Title Block Template");
const drawingValue = outputBase;
const timezone = config.timezone ?? "UTC";
const dateValue = new Intl.DateTimeFormat("en-CA", {
  timeZone: timezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

if (!sourceFile) {
  console.error(
    'Usage: node sync_title_block_template.mjs "<source.drawio>" [--config title_block.config.json] [--output-base "Title Block Template"]',
  );
  process.exit(1);
}

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
  if (tag.includes(`${name}="`)) {
    return tag.replace(new RegExp(`${name}="[^"]*"`), `${name}="${esc(value)}"`);
  }
  return tag.replace(/>$/, ` ${name}="${esc(value)}">`);
};

const source = fs.readFileSync(sourceFile, "utf8");
const cells = [];
const cellRe =
  /<mxCell\b[^>]*id="(lei-title-block-1-[^"]+)"[^>]*>[\s\S]*?<mxGeometry\b[^>]*\bas="geometry"[^>]*\/>[\s\S]*?<\/mxCell>/g;

let match;
while ((match = cellRe.exec(source))) {
  cells.push(match[0]);
}

if (cells.length === 0) {
  console.error(`No lei-title-block cells found in ${sourceFile}`);
  process.exit(1);
}

const geometries = cells.map((cell) => {
  const geom = cell.match(/<mxGeometry\b[^>]*\bas="geometry"[^>]*\/>/)?.[0] ?? "";
  return {
    x: Number(getAttr(geom, "x", "0")),
    y: Number(getAttr(geom, "y", "0")),
  };
});

const minX = Math.min(...geometries.map((g) => g.x));
const minY = Math.min(...geometries.map((g) => g.y));
const offsetX = 20 - minX;
const offsetY = 20 - minY;

const normalized = cells.map((cell) => {
  let next = cell;
  const id = getAttr(next, "id");
  const templateId = id.replace(/^lei-title-block-1-/, "");
  next = setAttr(next, "id", templateId);
  next = setAttr(next, "parent", "1");

  if (templateId === "drawing-value") next = setAttr(next, "value", drawingValue);
  if (templateId === "date-value") next = setAttr(next, "value", dateValue);

  next = next.replace(/<mxGeometry\b[^>]*\bas="geometry"[^>]*\/>/, (geom) => {
    const x = Number(getAttr(geom, "x", "0")) + offsetX;
    const y = Number(getAttr(geom, "y", "0")) + offsetY;
    let out = setAttr(geom, "x", String(x));
    out = setAttr(out, "y", String(y));
    return out;
  });

  return next.replace(/^ {8}/gm, "        ");
});

const xml = `<mxfile host="Electron" modified="${new Date().toISOString()}" agent="Codex drawio-lei" type="device">
  <diagram id="title-block-template" name="${esc(outputBase)}">
    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="800" pageHeight="110" background="#FFFFFF" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
${normalized.join("\n")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;

const logoPath = config.logo ? path.relative(process.cwd(), path.resolve(configDir, config.logo)) : "";
const department = config.fields?.department ?? "";
const drawnBy = config.fields?.drawnBy ?? "";
const finePrint = config.finePrint ?? "";

fs.writeFileSync(`${outputBase}.drawio`, xml);
fs.writeFileSync(
  `${outputBase}.spec.yaml`,
  [
    `name: "${outputBase}"`,
    'type: "drawio-title-block-template"',
    `source: "${outputBase}.drawio"`,
    logoPath ? `logo: "${logoPath}"` : null,
    "fields:",
    `  Department: "${department}"`,
    `  Drawing: "${drawingValue}"`,
    `  Date: "${dateValue}"`,
    `  Drawn By: "${drawnBy}"`,
    `fine_print: "${finePrint}"`,
    "",
  ]
    .filter(Boolean)
    .join("\n"),
);
fs.writeFileSync(
  `${outputBase}.arch.json`,
  JSON.stringify(
    {
      name: outputBase,
      type: "drawio-title-block-template",
      source: `${outputBase}.drawio`,
      logo: logoPath || undefined,
      fields: {
        Department: department,
        Drawing: drawingValue,
        Date: dateValue,
        "Drawn By": drawnBy,
      },
      finePrint,
    },
    null,
    2,
  ) + "\n",
);

console.log(`Wrote ${outputBase}.drawio from ${sourceFile}`);
