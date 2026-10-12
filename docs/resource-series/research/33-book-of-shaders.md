# Resource 33: The Book of Shaders

Reviewed 2026-10-11. Public chapters and official repository license, cross-checked against primary Khronos math definitions. Native preview became unavailable during this resource; no live visual/interaction claims are made.

## Public examples and lessons

- [Shaping functions](https://thebookofshaders.com/05/) compares linear, power, step and smoothstep functions through editable plots. The practical lesson is to control transitions with explicit domains instead of arbitrary per-effect constants. No plotting shader or chapter text copied.
- [Shapes](https://thebookofshaders.com/07/) demonstrates rectangle threshold coverage, smooth borders and distance-based circles, with an explicit exercise contrasting step and smoothstep. This supports independent coverage math rather than another visual preset.
- [Patterns](https://thebookofshaders.com/09/) explains normalized tiled coordinates and aspect ratio; [Noise](https://thebookofshaders.com/11/) distinguishes raw random values, interpolated value noise, gradients and smoother interpolation. A tiled pattern still scales with screen pixels, and repeated complex shading is not free. No function, demonstration image or third-party gallery shader used.

## One distinct feature

**Screen-pixel-aware edge antialiasing** for the existing optional glass scene. Current `src/scene-shaders.ts` lens, field and fusion coverage uses a fixed signed-distance band `-.65` to `.65` in CSS coordinates; no fwidth use was found. When backing resolution is reduced by maxPixels/DPR, that fixed band can be narrower than the actual output-pixel footprint. This is a real quality gap, not a duplicated new scene or optics engine.

Implement original coverage using the local fragment derivative footprint of the already calculated distance, with a safe positive floor. An explicit edgeSmoothing mode or quality option can retain a comparison path while validating the new default. Evaluate the derivative once before divergent per-fragment branches, reuse it for coverage where appropriate, and keep interior pixels unchanged. Do not add source supersampling, jittered temporal samples, blur textures or MSAA solely to obtain smoother edges. fwidth is fragment-only: do not insert it into caustic vertex generation or claim physical light transport is improved.

Thin edges, corners, small decorative instances, fusion seams, anisotropic backing ratios and low resolution budgets need visual tests at several DPRs. Compare spatial error/shimmer at known animation times using original shapes, along with GPU cost where supported. Derivative-based coverage is a local approximation, not universal pixel-identical antialiasing. It cannot resolve features that are genuinely much smaller than a backing pixel.

## Primary technical basis and boundaries

- [Khronos fwidth](https://registry.khronos.org/OpenGL-Refpages/es3.0/html/fwidth.xhtml) defines the sum of absolute local x/y derivatives, available in fragment shaders under GLSL ES 3.0.
- [Khronos smoothstep](https://registry.khronos.org/OpenGL-Refpages/es3.0/html/smoothstep.xhtml) defines Hermite coverage; equal or reversed edges are undefined. Ensure finite ordered endpoints, including degenerate shapes.
- [Ken Perlin's original Improving Noise paper](https://mrl.cs.nyu.edu/~perlin/paper445.pdf) is a primary reference for interpolation continuity if a future distinct procedural-noise feature is needed. Its old hardware timings are not a current web benchmark and are not this feature's performance claim.

Our proposed change is independently derived from generic mathematical/spec behavior. The Book's convenient functions and images are not imported. Extra derivatives have hardware-dependent costs; measure rather than assert they are always faster. Existing pixel caps/context lifecycle/preferences remain authoritative. CSS default and SSR imports are unaffected; the optional WebGL shader tier alone changes. Native validation and actual benchmark results remain pending.

## Rights/access

The [current official LICENSE](https://github.com/patriciogonzalezvivo/thebookofshaders/blob/master/LICENSE) is 2025 all-rights-reserved by Patricio Gonzalez Vivo. It prohibits hosting/distributing/using the Work in commercial and noncommercial projects, while allowing educational URL attribution and an unmodified screenshot under stated conditions. It is not MIT or a generic reusable-code license. This audit links sources and uses no copied code, text, media or screenshot. Linked LYGIA/artist functions have separate licenses and must not be presumed covered.

At review time the collaborative preview returned no available automation host with an explicit do-not-retry instruction, after a status timeout. Public Exa documentation remained available. No browser challenge bypass, paid access or external mutation was attempted.
