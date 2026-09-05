export const FIB = [1, 2, 3, 5, 8, 13] as const
export type NumericCard = '1' | '2' | '3' | '5' | '8' | '13'
export type Card = NumericCard | '?' | 'coffee'
export const CARDS: readonly Card[] = ['1', '2', '3', '5', '8', '13', '?', 'coffee']

export function snapToFib(value: number): number {
  if (!(value > 0)) return FIB[0]
  const target = Math.log(value)
  let best: number = FIB[0]
  let bestDist = Infinity
  for (const f of FIB) {
    const d = Math.abs(Math.log(f) - target)
    if (d < bestDist) {
      bestDist = d
      best = f
    }
  }
  return best
}

export function isNumericCard(card: Card): card is NumericCard {
  return card !== '?' && card !== 'coffee'
}

export function cardValue(card: Card): number | null {
  return isNumericCard(card) ? Number(card) : null
}
