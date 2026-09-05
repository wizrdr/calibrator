import { median, quantile, mad, medianBand } from './stats'

describe('stats', () => {
  it('median of odd and even lists, unsorted input', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(median([7])).toBe(7)
    expect(median([])).toBeNaN()
  })

  it('quantile with linear interpolation (R type 7)', () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(quantile(xs, 0.25)).toBe(2.75)
    expect(quantile(xs, 0.5)).toBe(4.5)
    expect(quantile(xs, 0.75)).toBe(6.25)
    expect(quantile(xs, 0)).toBe(1)
    expect(quantile(xs, 1)).toBe(8)
  })

  it('median absolute deviation', () => {
    expect(mad([1, 1, 2, 2, 4, 6, 9])).toBe(1)
    expect(mad([5, 5, 5])).toBe(0)
  })
})

describe('medianBand', () => {
  it('is the distribution-free order-statistic interval for the median', () => {
    const xs = Array.from({ length: 100 }, (_, i) => i + 1)
    expect(medianBand(xs)).toEqual({ lo: 41, hi: 60 })
  })

  it('collapses to the value itself when all values are equal', () => {
    expect(medianBand([2, 2, 2, 2, 2, 2, 2, 2, 2])).toEqual({ lo: 2, hi: 2 })
  })

  it('falls back to the full range for tiny samples', () => {
    expect(medianBand([3, 1, 2])).toEqual({ lo: 1, hi: 3 })
    expect(medianBand([])).toEqual({ lo: NaN, hi: NaN })
  })
})
