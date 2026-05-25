# Product Readiness

`drawio-lei` is currently ready for public source review, GitHub-based installation, and practical use as a Codex skill or local CLI helper.

It should be treated as an early public release rather than a fully polished product with package registry distribution, semantic release automation, or cross-platform installer coverage.

## Current Status

Ready:

- Public GitHub repository structure.
- ISC license.
- README with setup, dependencies, Codex skill installation, CLI examples, and test instructions.
- Local CLI for YAML, Mermaid, CSV, and `.drawio` inputs.
- Validation and sidecar workflow for `.drawio`, `.spec.yaml`, and `.arch.json`.
- Test script in `scripts/package.json`.
- `.gitignore` for dependencies, logs, local settings, and generated outputs.

Not yet included:

- npm package publishing.
- GitHub Actions CI.
- Versioned releases.
- Signed or bundled installer.
- Full end-user documentation site.

## Desktop Export

For highest fidelity export, especially with cloud provider icons, vendor stencils, embedded images, or complex draw.io shapes, use draw.io Desktop:

```bash
node scripts/cli.js input.yaml output.svg --validate --write-sidecars --use-desktop
node scripts/cli.js existing.drawio output.svg --input-format drawio --validate --use-desktop
```

The `.drawio` input export path sends the original `.drawio` file directly to draw.io Desktop. It does not regenerate the diagram through YAML first, which helps preserve manual layout and stencil fidelity.

draw.io Desktop is required for:

- PNG export
- PDF export
- JPG export
- Icon-faithful SVG export

If draw.io Desktop is not on `PATH`, set `DRAWIO_CMD`:

```bash
export DRAWIO_CMD="/Applications/draw.io.app/Contents/MacOS/draw.io"
```

## Standalone SVG Fallback

The standalone SVG renderer exists as a local fallback when draw.io Desktop is not installed, unavailable, or fails.

Use it for:

- Lightweight previews
- Basic diagrams
- CI-like environments where draw.io Desktop is not available
- Fast inspection of simple `.drawio` output

Known limitations:

- Some `mxgraph.*` stencil shapes may be approximated.
- Embedded image shapes may not render with exact draw.io Desktop fidelity.
- Cloud/vendor icon libraries may not match draw.io Desktop output exactly.
- Complex manual layouts should be visually checked in draw.io Desktop before publishing.

When fidelity matters, prefer `--use-desktop`.

## Known Limitations

- The YAML DSL is useful for repeatable topology generation, but detailed pixel-perfect layout may still require direct `.drawio` editing.
- Large diagrams can become visually crowded even if validation passes.
- Validation checks structure and common quality issues, but it does not replace visual review.
- Live browser/MCP editing is optional and not required for the default offline workflow.
- Excel support is intentionally lightweight and reads `.xlsx` files through standard-library Python parsing.
- The project is not currently published as an npm package; run scripts directly from the repo.

## Recommended Validation Before Sharing Output

Run:

```bash
cd scripts
npm test
```

Generate from an example:

```bash
cd ..
node scripts/cli.js references/examples/campus-lan-topology.yaml output.drawio --validate --write-sidecars
```

For final SVG:

```bash
node scripts/cli.js references/examples/campus-lan-topology.yaml output.svg --validate --write-sidecars --use-desktop
```

Then inspect the generated diagram visually in draw.io Desktop.

## Release Readiness Summary

Public source release: ready.

Operational/internal use: ready.

Polished package distribution: not yet.

Recommended next steps:

- Add GitHub Actions for `cd scripts && npm install && npm test`.
- Add tagged releases after meaningful changes.
- Add more real-world generic network topology examples.
- Add screenshots or exported sample SVGs once visual output is stable.
