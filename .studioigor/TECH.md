# Technology — Gateledger («Лавка у Врат»)

<!-- Phase 3 (references/stack.md). ENGINE — one of: godot, godot-mono, unity,
unreal, web, defold, bevy (read by studio.py and envcheck.py). DIMENSION — 2D or 3D
(2.5D with 3D models is 3D); envcheck.py recommends Blender for 3D. -->
ENGINE: web
ENGINE VERSION: Three.js 0.187.0 + React 19 + TypeScript
DIMENSION: 3D
LANGUAGE: TypeScript
PLATFORMS: web (browser/portals), web-mobile (responsive UI), windows/macos/linux (desktop wrapper later)

## Decision
- context: Gateledger — стилизованный 3D экшн-рогалик с видом сверху под углом + плотный интерфейс рюкзака 5×4, ценников, торга и гроссбуха; среда разработки — веб-апплет на порту 3000.
- options: Three.js 0.187 + TypeScript + React (лёгкий бандл, прямой контроль шейдеров картона/туши, нативный React UI) | Three.js + Rapier3D (лишний вес WASM и сложности резких перекатов) | Babylon.js 9.36 (тяжелее бандл и выше порог стилизации картона).
- choice and why: web (`Three.js 0.187.0 + TypeScript + React + postprocessing 6.39.6`) — даёт максимальную свободу для стиля «Сказочный картон и кобальт» и отзывчивого UI лавки, мгновенную сборку и проверку в Chromium.
- consequences: процедурные/модульные 3D-ассеты в коде (или лёгкие GLB позже, если понадобится), кинематическая коллизия и чистая граница `simulation / view / ui`.

## Budgets
- fps ≥ 60 на ноутбуке/десктопе (адаптивный DPR ≤ 2, софтверный fallback при `isSoftwareGl` для headless-тестов); ≤ 120 draw calls в кадре; загрузка ≤ 3 с; начальный бандл ≤ 2–3 МБ gzip.

## Project structure
- `src/core/` — фиксированный цикл (`loop.ts`), детерминированный RNG (`rng.ts`), шина событий (`events.ts`), ввод по `event.code` (`input.ts`), версионированные сохранения (`save.ts`), метрики (`metrics.ts`).
- `src/systems/` — чистая симуляция без рендера (`combat/`, `backpack/`, `haggling/`, `dungeon/`, `economy/`, `dialogue/`).
- `src/view/` — Three.js рендер диорамы, материалы картона и туши, фишки-подставки, телеграфы, частицы и звук.
- `src/ui/` — React-интерфейсы гроссбуха, рюкзака 5×4, торга у прилавка, меню и диалогов поверх канваса.
- `src/data/` & `src/content/` — числовой тюнинг в JSON/TS-данных и контент подземелий, реликвий, диалогов.
- `src/gyms/` — изолированные тестовые сцены (джимы) для каждой механики с живыми слайдерами тюнинга.
- `tests/` — юнит-тесты чистой логики на `node:test` (`npx tsx --test`).
