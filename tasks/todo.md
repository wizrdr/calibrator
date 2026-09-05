# Calibrator — план и статус

План: `~/.claude/plans/sprightly-dancing-ritchie.md`. Бюджет 6 сессий × 5 ч.

## Сессия 1 — домен + скелет
- [x] Скелет Vite + React + TS + Tailwind, токены и workflow из Dayline
- [x] CLAUDE.md, CONTEXT.md
- [x] `domain/scale` — карты, snapToFib, isNumericCard
- [x] `domain/stats` — median, quantile, mad
- [x] `domain/calibration` — teamCurve, hoursPerSp, impliedSp, personBias, labelBias
- [x] `domain/synthetic` — генератор с seed
- [x] `domain/jiraCsv` — парсер, фикстура с обоими заголовками Story Points
- [x] Решающий тест: наблюдаемое смещение восстанавливается из шума, полоса накрывает предел в ≥18 из 20 seed
- [x] Репозиторий wizrdr/calibrator, первый коммит

## Сессия 2 — инфра (Supabase, RLS, auth)
- [x] Проект Supabase `ifdiznxsdvhkzgoopuao` (eu-central-1) слинкован, anonymous sign-ins включены через `supabase config push`
- [x] Миграция `20260905000000_init.sql`: 6 таблиц, helper-функции, RLS, `join_session`, realtime publication
- [x] `src/data/types.gen.ts`, `supabase.ts`, `queries.ts`
- [x] `npm run rls` — 19 живых проверок RLS через supabase-js: аноним не видит чужие голоса до reveal, не голосует не в свой раунд, не подделывает чужой голос
- [x] UI: вход/регистрация лида, команды, ростер, создание сессии (строки или CSV), вход участника по коду
- [x] Проверено в браузере: лид создаёт команду и сессию, участник из чистого контекста входит по коду, оба видят «участников: 1»
## Сессия 3 — комната
## Сессия 4 — импорт
## Сессия 5 — отчёт
## Сессия 6 — e2e + деплой

## Review

### Сессия 2 (05.09.2026)
- Миграция применена через `supabase db query --linked` (Management API, без пароля БД); история записана в `supabase_migrations.schema_migrations` вручную, чтобы `db push` дальше работал.
- Решение: participants видят друг друга в ростере сессии (имена), team не видят.
- Не сделано: комната (голосование, reveal) — сессия 3.

### Сессия 1 (05.09.2026)
- 30 vitest, `npm run build` и `oxlint` чистые. Домен: scale, stats, calibration, synthetic, jiraCsv.
- **Находка по математике.** Допуск из плана «0.5 → [0.45, 0.55]» невыполним: на колоде Fibonacci человек с восприятием 0.5× наблюдаемо голосует ≈0.6× (3 → 2, 8 → 5, 13 → 8). Bias измеряет голоса, не восприятие; в UI формулировать «голосует в 1.7× ниже факта».
- **Замена интервала.** Полоса через MAD на квантованных голосах схлопывается и накрывала цель в 13 из 20 прогонов. Заменена на непараметрический интервал порядковых статистик медианы (`medianBand`): 18+ из 20 при фиксированном k.
- Погрешность масштаба k общая для всей команды и в личную полосу не входит: bias по определению относительный к команде. k оценивается в пределах ±15% на 72 задачах.
