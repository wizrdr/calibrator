import { snapToFib, isNumericCard, cardValue, FIB } from './scale'

describe('scale', () => {
  it('lists the Fibonacci deck', () => {
    expect(FIB).toEqual([1, 2, 3, 5, 8, 13])
  })

  it('snaps a continuous value to the nearest card in log space', () => {
    expect(snapToFib(1.4)).toBe(1)
    expect(snapToFib(1.5)).toBe(2)
    expect(snapToFib(4)).toBe(5)
    expect(snapToFib(6.2)).toBe(5)
    expect(snapToFib(6.4)).toBe(8)
    expect(snapToFib(40)).toBe(13)
    expect(snapToFib(0.2)).toBe(1)
  })

  it('tells numeric cards from abstains', () => {
    expect(isNumericCard('5')).toBe(true)
    expect(isNumericCard('?')).toBe(false)
    expect(isNumericCard('coffee')).toBe(false)
  })

  it('reads the numeric value of a card', () => {
    expect(cardValue('13')).toBe(13)
    expect(cardValue('?')).toBeNull()
  })
})
