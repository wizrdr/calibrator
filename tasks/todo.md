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
## Сессия 3 — комната
## Сессия 4 — импорт
## Сессия 5 — отчёт
## Сессия 6 — e2e + деплой

## Review

### Сессия 1 (05.09.2026)
- 30 vitest, `npm run build` и `oxlint` чистые. Домен: scale, stats, calibration, synthetic, jiraCsv.
- **Находка по математике.** Допуск из плана «0.5 → [0.45, 0.55]» невыполним: на колоде Fibonacci человек с восприятием 0.5× наблюдаемо голосует ≈0.6× (3 → 2, 8 → 5, 13 → 8). Bias измеряет голоса, не восприятие; в UI формулировать «голосует в 1.7× ниже факта».
- **Замена интервала.** Полоса через MAD на квантованных голосах схлопывается и накрывала цель в 13 из 20 прогонов. Заменена на непараметрический интервал порядковых статистик медианы (`medianBand`): 18+ из 20 при фиксированном k.
- Погрешность масштаба k общая для всей команды и в личную полосу не входит: bias по определению относительный к команде. k оценивается в пределах ±15% на 72 задачах.
