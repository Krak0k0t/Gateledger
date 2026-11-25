# Environment — research (2026-11-14)
Engine: web (`Three.js 0.187.0 + React 19 + TypeScript`, Vite 8.3.0) in AI Studio Linux container.

## Findings
- **Runtime & Build:** Node `v22.23.2`, Vite `8.3.0`, TypeScript `7.0.2` (`npm run lint` -> `tsc --noEmit`), `npm run build` -> `vite build`.
- **3D Engine:** `three@0.187.0` and `@types/three@0.187.0` installed cleanly via npm; built-in `three/addons/` provides `RoomEnvironment`, `EffectComposer`, `UnrealBloomPass`, `OutputPass`, `BufferGeometryUtils`.
- **Testing & Capture:**
  - `tsx` (`^4.21.0`) is pre-installed; `npx tsx --test tests/*.test.ts` executes `node:test` suites in milliseconds with zero Vitest overhead.
  - Global `playwright-cli` + headless Chromium (`SwiftShader` WebGL2 software renderer) are pre-installed in the container; requires `isSoftwareGl` guard (`pixelRatio=1`, no shadows/multi-pass post, `afterDraw()` pacing).
- **Unavailable in cloud sandbox:** `brew`, `git-lfs`, `Blender`, and `claude mcp` are macOS / local Claude Code tools absent in this Linux container. 3D assets use procedural composite `THREE.Group` geometry (3–12 parts with bevels, inked outlines, and `CanvasTexture`) + `generate_image` for 2D art.

## What this changes
- `ENV.md` uses `npx tsx --test` + `tsc --noEmit` for `TEST`, `npm run build` for `BUILD`, and `playwright-cli` on `http://localhost:3000` for `CAPTURE` into `.studioigor/captures/`.
- `isSoftwareGl` detection is mandatory in our Three.js renderer so headless verification matches GPU visuals without timing out.

## Sources
- Local environment inspection (`node -v`, `npm view three`, `playwright-cli`, `tsc`, `tsx`, 2026-11-14)
- Three.js `0.187.0` package & `three/addons` type definitions (2026-11-14)
