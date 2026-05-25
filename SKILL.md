---
name: drawio-lei
description: Engineering-first Draw.io diagram creation, editing, replication, and export for architecture diagrams, network topologies, flowcharts, UML, ERD, sequence diagrams, and system visualizations. Use when Codex needs an offline-first `.drawio` workflow with YAML/spec sidecars, validation, Desktop export, iterative review loops, or user style presets mapped onto engineering themes.
---

# Drawio Lei

## Defaults

Use this skill for one default style of work: engineering diagrams. Do not introduce mode-selection language unless the user explicitly asks for academic, paper, sketch, or another named style.

Default behavior:
- Create or edit `.drawio` locally and keep `.spec.yaml` plus `.arch.json` sidecars aligned when practical.
- Treat an existing or manually edited `.drawio` as the source of truth, then back-write sidecars from it.
- Validate before claiming completion.
- Export with draw.io Desktop by default for SVG, PNG, PDF, and JPG. Use the lightweight standalone SVG renderer only when Desktop is not installed, unavailable, or fails.
- For `.drawio` input, Desktop export must use the original `.drawio` directly, not a YAML/spec round-trip.
- If the user asks for a directory, place all deliverables in that directory.

## Design Rules

- Preserve the source diagram's macro-structure when replicating: major containers, reading direction, trunk/corridor, symmetry, and whitespace rhythm come before node-by-node reconstruction.
- Use a consistent grid and spacing scale. Related elements should be close; unrelated groups need visibly larger gaps.
- Align repeated devices, peer containers, titles, and edge lanes whenever practical. For objects with different parents, check absolute canvas coordinates, not just local geometry. If same-type objects are similar size, align by visual centerline or baseline; if their sizes differ, prefer top alignment so the row reads cleanly.
- Place metadata badges and detached labels in the foreground above connector lines. Center each badge under or beside its related object or within its container, and keep same-type badges on a shared horizontal or vertical line when possible.
- Draw.io layering is parent-sensitive. XML order usually controls stacking only within the same parent/container; a connector in an outer layer can still cover a badge inside a child container. When a badge or detached label must appear above cross-container connectors, make it a root/top-level foreground cell, convert its geometry to equivalent absolute canvas coordinates, and place it after the connector cells.
- When alignment looks wrong, first inspect the outer containers and parent hierarchy, then compare absolute canvas positions for the objects. Normalize peers that should behave as one row or column into the same coordinate layer when practical; preserve their visual positions by converting local coordinates to absolute coordinates.
- Keep hierarchy clear with scale, container weight, typography, and restrained color.
- Keep connector corridors clean. Move detailed metadata into endpoint labels, side bands, tables, or callouts; use short edge labels only where they improve reading.
- For AWS diagrams, prefer official AWS Architecture Icons color assets when available. Use monochrome or navy recoloring only when the user explicitly asks for it or the output target requires it.
- If the YAML DSL fights the intended layout, switch to raw XML/direct `.drawio` authoring.
- Before delivery, check for overlap, clipped text, disconnected edges, off-canvas elements, line crossings, crowded rows, and illegible labels.

## Workflow

1. Clarify only if the request is materially under-specified. Useful unknowns are diagram type, output format, source input, and approximate complexity.
2. Prefer YAML/spec as the canonical intermediate for new diagrams. For existing `.drawio`, import or edit the `.drawio` directly and preserve manual placement.
3. Use the local CLI for generation, validation, sidecars, and export:

```bash
node <skill-dir>/scripts/cli.js input.yaml output.drawio --validate --write-sidecars
node <skill-dir>/scripts/cli.js input.yaml output.svg --validate --write-sidecars --use-desktop
node <skill-dir>/scripts/cli.js existing.drawio output.svg --input-format drawio --validate --use-desktop
node <skill-dir>/scripts/cli.js input.yaml output.png --validate --write-sidecars --use-desktop
```

4. When Desktop export is unavailable or crashes, fall back once to standalone SVG or deliver `.drawio` plus sidecars. Do not loop on sandbox failures.
5. Use preview artifacts for self-check, then clean temporary preview/reference files unless the user asked to keep them.
6. Iterate with focused edits:
   - single-node or single-edge changes: patch the YAML/spec or the relevant XML cell
   - layout-wide changes: regenerate layout from the logical graph
   - repeated fine-tuning: open or suggest opening the `.drawio` source in Desktop

For embedded editable PNG output, repair after export:

```bash
python3 <skill-dir>/scripts/repair_png.py output.drawio.png
```

## Input Helpers

Preferred conversions:
- natural language -> YAML spec
- Mermaid or CSV -> `scripts/adapters/index.js`
- Excel workbook -> read only the requested sheet with `scripts/read_excel_sheet.py`
- existing `.drawio` -> `scripts/cli.js --input-format drawio --export-spec --write-sidecars`

Excel command:

```bash
python3 <skill-dir>/scripts/read_excel_sheet.py workbook.xlsx --sheet "AWS" --format json
```

## Title Blocks

Use `scripts/insert_title_block.mjs` when a project provides a local
`title_block.config.json` and needs a reusable title block inserted into each
page of an existing `.drawio` file. Use `scripts/sync_title_block_template.mjs`
to back-write a manually adjusted title block from a diagram into that
project's title block template.

## Network Labels

For network diagrams, split metadata into semantic label units:
- device names on nodes
- interface or port names near their endpoints
- circuit, link, tunnel, service, or connection IDs on the edge
- provider device and port details near the provider endpoint
- local and remote IPs near their respective sides

Avoid one large pasted label. Prefer child `edgeLabel` cells for link-owned text so labels move with the link. Preserve manual label placement when back-syncing sidecars from `.drawio`.

## References

Read only what is needed:
- `references/workflows/create.md`
- `references/workflows/edit.md`
- `references/workflows/replicate.md`
- `references/style-presets.md`
- `references/style-theme-mapping.md`
- `references/troubleshooting.md`
- `references/docs/design-system/README.md`
- `references/docs/design-system/specification.md`
- `references/docs/edge-quality-rules.md`
- `references/docs/stencil-library-guide.md`
- `references/examples/`
