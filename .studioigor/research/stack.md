# Stack — research (2026-11-14)
Game: Gateledger («Лавка у Врат») — stylized top-down 3D action-roguelike + item shop management ("Storybook Cardstock & Ink").

## Findings
- **Environment reality (AI Studio Build):** текущая среда — Node.js/Vite/React браузерный апплет (порт 3000) с Chromium/Playwright для захвата кадров. Нативные движки (Godot 4, Unity, Unreal) не могут запускать здесь окно или рендер в превью без локальной машины.
- **Three.js `0.187.0` + React + TypeScript (`postprocessing` `6.39.6`, `@dimforge/rapier3d-compat` `0.21.0`):**
  - В конце 2026 года актуальный npm-релиз `three@0.187.0`; лёгкий бандл (< 1–2 МБ gzip вместе с React и UI), нативные тени (`PCFSoftShadowMap`), selective bloom через `postprocessing` / `EffectComposer`, кастомные outline/toon-материалы для вырезного картона и фишек-подставок.
  - UI гроссбуха, рюкзака 5×4, живого торга и диалогов строится на React + Tailwind прямо поверх WebGL-канваса — идеально для игры, где 50% геймплея — тактический инвентарь и интерфейс сделки.
- **Babylon.js `9.36.0`:**
  - Мажорный релиз Babylon 9.0 добавил Clustered Lighting, Frame Graph v1.0 и встроенную физику/инспектор, но заметно тяжелее по размеру бандла (~3–5 МБ) и менее органичен с React HUD для плотного UI лавки/рюкзака.
- **Godot 4 (GDScript / Web export):**
  - Экспорт в Web ограничен Compatibility/WebGL2, базовый `.wasm` ~40–75 МБ без сжатия (~5–15 МБ под Brotli), и несовместим со сборкой и живым превью внутри текущего React/Vite-апплета AI Studio.

## What this changes
- Для **Gateledger** в текущей браузерной среде лучший стек — **Web: Three.js `0.187.0` + TypeScript + React (HUD, рюкзак, торг) + `postprocessing` `6.39.6`** (и при желании позже можно обернуть в Tauri/Electron для PC-стора).
- Физика в top-down 3D-комнате и лавке простая (круговые/AABB коллизии, хитбоксы ударов и перекаты), поэтому лёгкий собственный кинематический солвер или Rapier 3D — без лишнего веса и глюков.

## Sources
- npm registry (`npm view three`, `postprocessing`, `@babylonjs/core`, `@dimforge/rapier3d-compat`, 2026-11-14)
- Three.js r187 / GitHub releases & Babylon.js 9.0 release notes (2026-11-14)
- Godot 4 Web Export docs (2026-11-14)
