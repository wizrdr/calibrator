import type { Bias } from '@/domain/types'

// Factor and its band on a log axis centred at 1: left of the line = underestimates.
function Band({ b }: { b: Bias }) {
  const W = 160
  const lim = Math.log(4)
  const x = (f: number) => W / 2 + (Math.max(-lim, Math.min(lim, Math.log(f))) / lim) * (W / 2 - 4)
  return (
    <svg viewBox={`0 0 ${W} 16`} width={W} height={16} role="img" aria-label={b.label}>
      <line x1={4} x2={W - 4} y1={8} y2={8} stroke="var(--grid-line)" />
      <line x1={W / 2} x2={W / 2} y1={2} y2={14} stroke="var(--border-strong)" />
      {Number.isFinite(b.lo) && Number.isFinite(b.hi) && (
        <line x1={x(b.lo)} x2={x(b.hi)} y1={8} y2={8} stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      )}
      {Number.isFinite(b.factor) && <circle cx={x(b.factor)} cy={8} r={4} fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />}
    </svg>
  )
}

export function BiasTable({ rows, names, testId }: { rows: Bias[]; names: Map<string, string>; testId: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted">Голосов пока нет.</p>
  const sorted = [...rows].sort((a, b) => (Number.isFinite(a.factor) ? a.factor : 99) - (Number.isFinite(b.factor) ? b.factor : 99))
  return (
    <table className="w-full text-sm" data-testid={testId}>
      <thead className="text-left text-xs uppercase tracking-wide text-muted">
        <tr>
          <th className="py-1.5 pr-3">Кто</th>
          <th className="py-1.5 pr-3">Смещение</th>
          <th className="py-1.5 pr-3">×0.25 … ×4</th>
          <th className="py-1.5 pr-3 text-right">n</th>
          <th className="py-1.5 text-right">?/☕</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((b) => (
          <tr key={b.memberId} className="border-t border-border" data-testid="bias-row">
            <td className="py-2 pr-3 font-medium">{names.get(b.memberId) ?? b.memberId}</td>
            <td className="py-2 pr-3" data-testid="bias-label">
              {b.label}
            </td>
            <td className="py-2 pr-3">
              <Band b={b} />
            </td>
            <td className="py-2 pr-3 text-right tabular-nums text-muted">{b.n}</td>
            <td className="py-2 text-right tabular-nums text-muted">{b.abstains || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
