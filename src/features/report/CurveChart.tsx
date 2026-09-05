import type { CurvePoint } from '@/domain/types'
import { useT } from '@/i18n'

// One series (median hours per story point) with IQR whiskers; buckets with n < 3 are muted.
export function CurveChart({ curve, k }: { curve: CurvePoint[]; k: number }) {
  const { t } = useT()
  if (curve.length === 0) return <p className="text-[15px] text-muted">{t('report.curveEmpty')}</p>
  const W = 560
  const H = 220
  const pad = { l: 40, r: 12, t: 12, b: 28 }
  const maxY = Math.max(...curve.map((c) => c.q3), k * Math.max(...curve.map((c) => c.sp))) * 1.1
  const y = (h: number) => pad.t + (H - pad.t - pad.b) * (1 - h / maxY)
  const slot = (W - pad.l - pad.r) / curve.length
  const bar = Math.min(40, slot * 0.5)
  const ticks = 4
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t('report.curveAria')}>
      {Array.from({ length: ticks + 1 }, (_, i) => (maxY / ticks) * i).map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--grid-line)" />
          <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)">
            {Math.round(v)}
          </text>
        </g>
      ))}
      <line x1={pad.l} x2={W - pad.r} y1={y(k * curve[0].sp)} y2={y(k * curve[curve.length - 1].sp)} stroke="var(--text-faint)" strokeDasharray="4 4" />
      {curve.map((c, i) => {
        const cx = pad.l + slot * i + slot / 2
        const thin = c.n < 3
        return (
          <g key={c.sp}>
            <title>{t('report.curveTip', { sp: c.sp, median: c.median.toFixed(1), q1: c.q1.toFixed(1), q3: c.q3.toFixed(1), n: c.n })}</title>
            <line x1={cx} x2={cx} y1={y(c.q1)} y2={y(c.q3)} stroke={thin ? 'var(--border-strong)' : 'var(--accent)'} strokeWidth="2" />
            <rect
              x={cx - bar / 2}
              y={y(c.median)}
              width={bar}
              height={Math.max(2, y(0) - y(c.median))}
              rx="4"
              fill={thin ? 'var(--border-strong)' : 'var(--accent)'}
              opacity={thin ? 0.7 : 0.85}
            />
            <text x={cx} y={H - pad.b + 16} textAnchor="middle" fontSize="12" fill="var(--text)">
              {c.sp}
            </text>
            <text x={cx} y={y(c.median) - 6} textAnchor="middle" fontSize="11" fill="var(--text-muted)">
              {c.median.toFixed(0)}
              {t('report.hoursShort')}
              {thin ? ` · n${c.n}` : ''}
            </text>
          </g>
        )
      })}
      <text x={W - pad.r} y={H - 4} textAnchor="end" fontSize="11" fill="var(--text-faint)">
        {t('report.curveDash', { k: k.toFixed(1) })}
      </text>
    </svg>
  )
}
