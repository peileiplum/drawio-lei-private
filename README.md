# drawio-lei

Private network engineering and DevOps diagram tool for Codex.

`drawio-lei` turns topology notes or YAML specs into local draw.io diagrams, keeps editable sidecars next to the diagram, and exports the result as SVG or other presentation-ready formats through draw.io Desktop.

## What It Does

- Creates engineering diagrams from YAML topology specs.
- Converts Mermaid, CSV, and selected Excel worksheet data into diagram specs.
- Generates `.drawio` files that remain editable in draw.io Desktop.
- Writes sidecars for review and repeatability: `.spec.yaml` and `.arch.json`.
- Exports to SVG, PNG, PDF, or JPG with draw.io Desktop.
- Supports existing `.drawio` files as source of truth and can back-write sidecars from them.
- Includes validation for XML structure, labels, layout consistency, color values, and diagram complexity.

The primary users are network engineers, infrastructure architects, and DevOps engineers who need repeatable architecture, topology, migration, and operations diagrams.

## Repository Layout

```text
.
├── SKILL.md                 # Codex skill instructions
├── agents/                  # Agent configuration
├── assets/                  # Themes, schemas, and sample draw.io files
├── references/              # Workflow docs, examples, and style guidance
├── scripts/                 # CLI, converters, validation, export helpers
└── styles/                  # Style schema and built-in style assets
```

## Dependencies

Required:

- Node.js 18 or newer
- npm
- `js-yaml` installed by `npm install` inside `scripts/`

Recommended:

- draw.io Desktop for icon-faithful SVG export and for PNG, PDF, and JPG export
- Python 3 for helper scripts such as `read_excel_sheet.py` and `repair_png.py`

Optional:

- A live draw.io MCP backend for browser/live editing workflows. The default workflow is offline-first and does not require a live backend.

## Install

From the repository root:

```bash
cd scripts
npm install
```

## Install As A Codex Skill From GitHub

Your friend must have access to the private GitHub repository before cloning.

Install into the standard Codex skills directory:

```bash
mkdir -p ~/.codex/skills
git clone <private-git-url> ~/.codex/skills/drawio-lei
cd ~/.codex/skills/drawio-lei/scripts
npm install
npm test
```

Then restart Codex or open a new Codex session so the skill can be discovered.

To update later:

```bash
cd ~/.codex/skills/drawio-lei
git pull
cd scripts
npm install
npm test
```

If they want to keep the repo somewhere else, they can clone it to any folder and copy or symlink it into `~/.codex/skills/drawio-lei`.

If draw.io Desktop is not on your `PATH`, set `DRAWIO_CMD` to the absolute executable path:

```bash
export DRAWIO_CMD="/Applications/draw.io.app/Contents/MacOS/draw.io"
```

On macOS, the default path checked by the tool is:

```text
/Applications/draw.io.app/Contents/MacOS/draw.io
```

## Quick Start

Create a `.drawio` file plus sidecars from a YAML topology:

```bash
node scripts/cli.js references/examples/campus-lan-topology.yaml output.drawio --validate --write-sidecars
```

Export an SVG with draw.io Desktop:

```bash
node scripts/cli.js references/examples/campus-lan-topology.yaml output.svg --validate --write-sidecars --use-desktop
```

Export an existing draw.io diagram directly to SVG without a YAML round trip:

```bash
node scripts/cli.js existing.drawio existing.svg --input-format drawio --validate --use-desktop
```

Back-write sidecars from an existing `.drawio` file:

```bash
node scripts/cli.js existing.drawio existing.spec.yaml --input-format drawio --export-spec --write-sidecars
```

## YAML Topology Input

YAML is the main editable source for new diagrams. A typical spec describes metadata, modules, nodes, and edges. Example specs live in `references/examples/`.

```yaml
meta:
  title: Campus LAN
  theme: tech-blue
nodes:
  - id: core
    label: Core Switch
    type: switch
  - id: access
    label: Access Switch
    type: switch
edges:
  - from: core
    to: access
    label: 2x10G LACP
```

## Export Behavior

For exact visual fidelity, especially with AWS, Azure, GCP, Kubernetes, or vendor stencils, use draw.io Desktop export with `--use-desktop`.

The standalone SVG renderer is useful as a fallback when Desktop is unavailable, but it may approximate unsupported draw.io stencil shapes or embedded image shapes.

## Test

From the repository root:

```bash
cd scripts
npm test
```

Current expected test command:

```bash
node --test "**/*.test.js"
```

## Private Repo Notes

This repo is prepared for private GitHub use. Do not commit `node_modules`, generated exports, local logs, or temporary preview files.

Before pushing to GitHub:

```bash
git status
git add .
git commit -m "Package drawio-lei skill"
git remote add origin <private-repo-url>
git push -u origin main
```

Only run the commit and push steps after confirming the target private repository.
