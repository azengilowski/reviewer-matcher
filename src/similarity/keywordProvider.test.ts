import { keywordProvider } from './keywordProvider'

describe('keywordProvider', () => {
  it('scores related texts higher than unrelated ones', async () => {
    const scorer = await keywordProvider.build([
      { id: 'paper', text: 'mathematics cognitive load problem solving' },
      { id: 'mathReviewer', text: 'mathematics problem solving cognitive load' },
      { id: 'litReviewer', text: 'literacy reading equity culturally responsive' },
    ])
    const related = scorer.similarity('paper', 'mathReviewer')
    const unrelated = scorer.similarity('paper', 'litReviewer')
    expect(related).toBeGreaterThan(unrelated)
    expect(related).toBeGreaterThan(0)
  })

  it('returns 0 when a text has no usable tokens', async () => {
    const scorer = await keywordProvider.build([
      { id: 'a', text: 'science education' },
      { id: 'empty', text: '' },
    ])
    expect(scorer.similarity('a', 'empty')).toBe(0)
  })
})
