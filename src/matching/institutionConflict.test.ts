import { DEFAULT_SETTINGS } from '../domain/settings'
import type { Paper, Reviewer } from '../domain/types'
import { keywordProvider } from '../similarity/keywordProvider'
import { isInstitutionConflict, runMatch } from './runMatch'

const paper = (over: Partial<Paper> = {}): Paper => ({
  id: 'p1',
  title: '',
  abstract: '',
  keywords: '',
  method: '',
  authors: '',
  ...over,
})
const reviewer = (over: Partial<Reviewer> = {}): Reviewer => ({
  id: 'r1',
  name: 'R',
  role: 'professor',
  criteria: '',
  ...over,
})

describe('isInstitutionConflict', () => {
  it('flags a reviewer whose institution appears in the authors text', () => {
    expect(
      isInstitutionConflict(
        reviewer({ institution: 'Stanford University' }),
        paper({ authors: 'Jane Doe, Stanford University' }),
      ),
    ).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(
      isInstitutionConflict(
        reviewer({ institution: 'MIT Media Lab' }),
        paper({ authors: 'someone, mit media lab' }),
      ),
    ).toBe(true)
  })

  it('does not flag unrelated institutions', () => {
    expect(
      isInstitutionConflict(
        reviewer({ institution: 'Stanford University' }),
        paper({ authors: 'Jane Doe, Yale University' }),
      ),
    ).toBe(false)
  })

  it('ignores missing or very short institution strings (avoids false hits)', () => {
    expect(isInstitutionConflict(reviewer({ institution: undefined }), paper({ authors: 'x' }))).toBe(
      false,
    )
    // "MIT" is 3 chars → below the 4-char floor, so it is not matched.
    expect(
      isInstitutionConflict(reviewer({ institution: 'MIT' }), paper({ authors: 'a, MIT' })),
    ).toBe(false)
  })
})

describe('runMatch same-institution exclusion', () => {
  // Distinct reviewer name / author name so the *self-authorship* rule never
  // fires — this test isolates the same-institution rule.
  const revs = [
    reviewer({ id: 'in', name: 'Zelda Quirke', institution: 'Acme University', criteria: 'reading literacy' }),
  ]
  const paps = [
    paper({ id: 'p1', title: 'Reading', keywords: 'reading literacy', authors: 'Bob Jones, Acme University' }),
  ]

  it('excludes the pair only when the setting is on', async () => {
    const off = await runMatch(
      revs,
      paps,
      { ...DEFAULT_SETTINGS, paperCapacity: 1, excludeSameInstitution: false },
      keywordProvider,
    )
    expect(off.assignments).toHaveLength(1)

    const on = await runMatch(
      revs,
      paps,
      { ...DEFAULT_SETTINGS, paperCapacity: 1, excludeSameInstitution: true },
      keywordProvider,
    )
    expect(on.assignments).toHaveLength(0)
    // The conflicted pairing is still ranked, but flagged as a conflict.
    expect(on.paperPreferences.p1.find((e) => e.targetId === 'in')?.conflict).toBe(true)
  })
})
