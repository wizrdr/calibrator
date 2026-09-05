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
- [x] GitHub Pages включён (build_type=workflow), переменные VITE_SUPABASE_* в Actions, деплой зелёный: https://wizrdr.github.io/calibrator/
## Сессия 3 — комната
- [x] `data/room.ts`: realtime poke → полный reload, resubscribe на CHANNEL_ERROR/TIMED_OUT
- [x] FacilitatorView: код и ссылка, список задач, текущая задача, кто проголосовал (✓ до reveal), Вскрыть, Переголосовать (round+1), итог → следующая задача → done
- [x] ParticipantView: колода 1 2 3 5 8 13 ? ☕, своя карта подсвечена, после reveal все карты и итог
- [x] `roomView.ts` (seats, currentIssue, nextIssue) с тестами
- [x] Playwright `e2e/room.spec.ts`, два browser context: карта у фасилитатора появляется только после reveal, у второго участника тоже; итог переключает задачу у всех. 1 passed, 9.7s
- [x] Dev-порт 5174 (5173 занят Dayline)
## Сессия 4 — импорт
- [x] `domain/importFacts.matchImport` (матч по ключу без регистра, последняя строка при дублях, coverage) + `parseJiraDate` с тестами
- [x] `ImportPage`: файл → preview (совпало / с фактом / coverage / лишние / недостающие) → applyFacts
- [x] `MappingCard`: имена участников из всех сессий → member ростера (bulk по display_name)
- [x] Playwright `e2e/import.spec.ts`: CSV с одной лишней и одной недостающей задачей → coverage 33%, применение → /report. 1 passed
## Сессия 5 — отчёт
- [x] `domain/report.ts` (buildReport: coverage, scale, curve, bias vs fact / vs final, carry-over, top misses, drift, без факта) + 4 теста
- [x] `ReportPage`, `CurveChart` (одна серия, IQR-усы, серые n<3), `BiasTable` (точка + полоса на log-оси ×0.25…×4), переключатель раунда, «исключить» задачу без факта
- [ ] Визуально не смотрел ни разу — открыть /team/:id/report на синтетике и глянуть глазами
## Сессия 6 — e2e + деплой
- [x] Миграция `20260905000100_import_history.sql`: RPC `import_history(team, payload)` для владельца, применена, типы перегенерированы
- [x] `GeneratorPage` (/team/:id/generator, ссылка «Синтетика» на странице команды): generateSynthetic → import_history → CSV факта
- [ ] **СТОП 05.09 ~11:00.** `e2e/synthetic.spec.ts` не запускается: импортирует `GeneratorPage` ради `DEMO_PARAMS`, а тот тянет `data/supabase.ts` с `import.meta.env` → в Node падает «Cannot read properties of undefined (reading 'VITE_SUPABASE_URL')». Фикс: вынести `DEMO_PARAMS` в `src/domain/demoParams.ts` и импортировать оттуда и в тесте, и в странице.
- [ ] Прогнать `npx playwright test` (3 спека) локально, потом против живого URL: `BASE_URL=https://wizrdr.github.io/calibrator npx playwright test` (в конфиге baseURL пока захардкожен на 5174 — добавить чтение process.env.BASE_URL)
- [ ] Проверка с телефона как участник на живом URL
- [ ] Отчёт глазами на синтетике (см. сессию 5)

## Review

### Сессия 3 (05.09.2026)
- Фасилитатор = любой не-анонимный пользователь, читающий сессию (RLS пускает только owner). Роль «лид тоже голосует» отложена.
- e2e ходит в живой Supabase и создаёт аккаунт на каждый прогон; в CI не запускается, только локально `npm run e2e`.

### Сессия 2 (05.09.2026)
- Миграция применена через `supabase db query --linked` (Management API, без пароля БД); история записана в `supabase_migrations.schema_migrations` вручную, чтобы `db push` дальше работал.
- Решение: participants видят друг друга в ростере сессии (имена), team не видят.
- Не сделано: комната (голосование, reveal) — сессия 3.

### Сессия 1 (05.09.2026)
- 30 vitest, `npm run build` и `oxlint` чистые. Домен: scale, stats, calibration, synthetic, jiraCsv.
- **Находка по математике.** Допуск из плана «0.5 → [0.45, 0.55]» невыполним: на колоде Fibonacci человек с восприятием 0.5× наблюдаемо голосует ≈0.6× (3 → 2, 8 → 5, 13 → 8). Bias измеряет голоса, не восприятие; в UI формулировать «голосует в 1.7× ниже факта».
- **Замена интервала.** Полоса через MAD на квантованных голосах схлопывается и накрывала цель в 13 из 20 прогонов. Заменена на непараметрический интервал порядковых статистик медианы (`medianBand`): 18+ из 20 при фиксированном k.
- Погрешность масштаба k общая для всей команды и в личную полосу не входит: bias по определению относительный к команде. k оценивается в пределах ±15% на 72 задачах.
