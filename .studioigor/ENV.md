# Environment — Gateledger («Лавка у Врат»)

<!-- Phase 4 (references/environment.md). Commands verified by a real run.
VERIFIED is switched only by `studio.py verify`. CAPTURE writes images to
.studioigor/captures/. -->
VERIFIED: yes

## Installed
| tool | version | why |
|---|---|---|
| Node.js | 22.23.2 | Vite runtime & node:test execution |
| Vite | 8.3.0 | Dev server (port 3000) & production bundler |
| TypeScript | 7.0.2 | Strict type checking (`tsc --noEmit`) |
| three + @types/three | 0.187.0 | WebGL 3D diorama & gameplay renderer |
| React | 19.0.1 | Game shell & HUD overlay |
| tsx | 4.21.0 | Zero-config TypeScript execution for `node:test` |
| playwright-cli + Chromium | preinstalled (`/ms-playwright`) | Headless browser verification & screenshot capture |

## Agent integrations
- `computer-use` (`playwright-cli` + headless Chromium): verified via direct CLI runs against `http://localhost:3000` (screenshots, DOM snapshots, console logs).
- `claude mcp` / Blender / `git-lfs` / `brew`: not present in AI Studio Build Linux cloud sandbox; procedural Three.js composite geometry (`THREE.Group`) + `generate_image` replaces Blender.

## Commands
RUN: npm run dev
TEST: npm run lint && npx --yes tsx --test tests/gameLogic.test.ts
BUILD: npm run build
CAPTURE: node -e "const{execSync}=require('child_process');const f='mkdir -p .studioigor/captures/hello && playwright-cli open --browser=chromium http://localhost:3000/?autostart=1 && playwright-cli resize 1440 900 && sleep 1 && playwright-cli screenshot --filename=.studioigor/captures/hello/start.png && playwright-cli keydown KeyD && sleep 0.6 && playwright-cli keyup KeyD && playwright-cli press Space && sleep 0.3 && playwright-cli screenshot --filename=.studioigor/captures/hello/move.png && playwright-cli close';try{execSync(f,{stdio:'inherit',shell:'/bin/bash'})}catch(e){try{execSync('playwright-cli close',{shell:'/bin/bash'})}catch{}throw e}"
EDITOR: none — code in workspace

## Pitfalls
- Headless Chromium renders WebGL via SwiftShader (CPU); renderer MUST detect `isSoftwareGl` and pace the loop with `afterDraw()` (`fenceSync` + 80ms timeout), keep `pixelRatio = 1`, and disable shadow maps / multi-pass post-processing on software WebGL.
- `HMR` is disabled (`DISABLE_HMR=true`); always `restart_dev_server` after editing `src/` before running `CAPTURE`.
