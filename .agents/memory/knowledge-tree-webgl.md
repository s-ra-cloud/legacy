---
name: Knowledge Tree WebGL verification
description: Sigma 4 styling semantics and the preview capture browser's WebGL limitation.
---

Sigma 4 defaults to graph-relative item sizes, and custom node-style declarations
replace rather than deep-merge the default attribute bindings. Preserve bindings
and use screen-relative sizes when the UI describes radii in pixels.

**Why:** Type checking and SSR builds passed while an actual WebGL render produced
giant gray overlapping circles. Real-browser verification exposed both problems.

**How to apply:** Verify constellation changes with WebGL enabled, not only static
builds. The standard screenshot browser has returned no WebGL 2 context here.
Local Chromium with ANGLE/SwiftShader can verify the renderer. When using CDP,
select a target whose type is `page`; the first target can be an extension
background page. Never interpret that blank page as an application failure.
