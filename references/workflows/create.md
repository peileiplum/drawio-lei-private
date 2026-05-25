# Workflow: /drawio create

Create engineering diagrams from text, Mermaid, CSV, or YAML while keeping YAML as the canonical source and `.drawio` as the editable deliverable.

## Trigger

- **Command**: `/drawio create ...`
- **Keywords**: `create`, `generate`, `make`, `draw`, `生成`, `创建`

## Route Selection

1. **Fast Path**
   - Request already states the diagram type.
   - Request also states at least 2 of: theme/preset, layout, output format, complexity.
   - Estimated graph is small (`<= 12` nodes) and not vendor-stencil heavy.
2. **Full Path**
   - Request is ambiguous, dense, highly branched, or icon-heavy.
   - User wants a screenshot rebuilt with structural fidelity.
3. **Stencil Branch**
   - Request explicitly asks for AWS, Azure, GCP, Cisco, Kubernetes, or vendor icons.
   - Load `references/docs/stencil-library-guide.md`.

## Procedure

```text
Step 1: Resolve visual defaults
├── explicit theme or preset?
├── if preset: map it through style-theme-mapping
└── otherwise default to tech-blue

Step 2: Identify input mode
├── natural language
├── YAML spec
├── Mermaid
└── CSV

Step 3: Decide Fast Path vs Full Path
├── Fast Path -> generate YAML directly
└── Full Path -> ask only unresolved questions

Step 4: Build or normalize to YAML spec
├── set meta.theme
├── set meta.layout
├── use semantic node types
└── add explicit style overrides when the preset requires them

Step 5: Validate
├── schema/spec validation
├── layout consistency
├── edge quality
└── complexity warning review

Step 6: Render
├── output .drawio with sidecars
├── export standalone SVG or Desktop preview
└── keep output bundle aligned

Step 7: Review
├── self-check overlaps/clipping/routing
└── show preview for user iteration
```

## Engineering Rules

- Prefer semantic types and typed connectors over hard-coded raw styles.
- Use explicit `style.fillColor`, `style.strokeColor`, `style.fontFamily`, and `style.fontSize` only when a preset or replication intent requires them.
- Keep `.drawio`, `.spec.yaml`, and `.arch.json` together for anything the user may refine later.
- For dense routing, read `references/docs/edge-quality-rules.md` before final render.
- For vendor-heavy diagrams, exact stencil lookup is optional; semantic fallbacks are acceptable when lookup tools are unavailable.

## Render Commands

```bash
node <skill-dir>/scripts/cli.js input.yaml output.drawio --validate --write-sidecars
node <skill-dir>/scripts/cli.js input.yaml output.svg --validate --write-sidecars
node <skill-dir>/scripts/cli.js input.yaml output.png --validate --write-sidecars --use-desktop
```
