import { fmtScore } from './format'

describe('fmtScore', () => {
  it('formats a normal score to two decimals by default', () => {
    expect(fmtScore(0.5)).toBe('0.50')
    expect(fmtScore(0.837)).toBe('0.84')
  })

  it('clamps scores above 1 (method boost can push raw values past 1)', () => {
    expect(fmtScore(1.043)).toBe('1.00')
  })

  it('clamps negatives to 0', () => {
    expect(fmtScore(-0.2)).toBe('0.00')
  })

  it('honours a custom digit count', () => {
    expect(fmtScore(0.8371, 3)).toBe('0.837')
  })
})
