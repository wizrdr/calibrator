# Calibrator

Planning poker, который помнит голос каждого и сверяет его с фактом из Jira (Time Spent).
Глоссарий: `CONTEXT.md`. План и статус: `tasks/todo.md`. Уроки: `tasks/lessons.md`.

## Стек
React 19 + Vite + TypeScript + Tailwind v4 + zustand + react-router. Supabase (Postgres + Auth + Realtime) как единственный источник данных, онлайн-only. Хостинг: GitHub Pages через Actions.

## Правила
- `src/domain` — чистые функции и типы, без импортов из `data`/`features`. Вся математика калибровки живёт здесь и покрыта vitest.
- `src/data` — единственное место, где вызывается supabase-js. Realtime-событие = poke: обработчик перезагружает состояние комнаты одним select, payload не применяется.
- Скрытые голоса защищены RLS на сервере, не UI.
- Дизайн-система: цвета, отступы, радиусы только через токены `src/styles/tokens.css` и замапленные утилиты Tailwind. Палитровые классы (`bg-gray-*`) и hex в `features`/`ui` запрещены.
- Комментарии в коде: по умолчанию нет; если нужен — одна строка на английском, только WHY.
- Проверка: `npm test`, `npm run build`, `npm run e2e`.

## Команды
```
npm run dev        # http://localhost:5174
npm test
npm run build
npx supabase db push
```
