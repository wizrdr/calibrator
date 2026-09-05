export function median(xs: readonly number[]): number {
  return quantile(xs, 0.5)
}

export function quantile(xs: readonly number[], p: number): number {
  if (xs.length === 0) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const h = (s.length - 1) * p
  const lo = Math.floor(h)
  const hi = Math.ceil(h)
  return s[lo] + (s[hi] - s[lo]) * (h - lo)
}

export function mad(xs: readonly number[]): number {
  const m = median(xs)
  return median(xs.map((x) => Math.abs(x - m)))
}

// Order-statistic confidence interval for the median: no distribution assumed, so it stays
// honest on heavily quantized data where MAD collapses.
export function medianBand(xs: readonly number[], z = 1.96): { lo: number; hi: number } {
  const n = xs.length
  if (n === 0) return { lo: NaN, hi: NaN }
  const s = [...xs].sort((a, b) => a - b)
  const j = Math.max(0, Math.floor((n - z * Math.sqrt(n)) / 2))
  return { lo: s[j], hi: s[n - 1 - j] }
}
