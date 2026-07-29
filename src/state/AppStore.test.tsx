import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { Assignment } from '../domain/types'
import { keywordRunner } from '../matching/runner'
import { AppStoreProvider, useApp } from './AppStore'

function wrapper({ children }: { children: ReactNode }) {
  return <AppStoreProvider runner={keywordRunner}>{children}</AppStoreProvider>
}

const A: Assignment = { paperId: 'P1', reviewerId: 'r1', paperRank: 1, reviewerRank: 1, source: 'manual' }

describe('AppStore editing (undo/redo/audit)', () => {
  it('commits, records audit, and supports undo/redo', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    expect(result.current.assignments).toEqual([])
    expect(result.current.canUndo).toBe(false)

    act(() => result.current.commitAssignments([A], 'assign', 'Assigned r1 to P1'))
    expect(result.current.assignments).toEqual([A])
    expect(result.current.auditLog[0].detail).toMatch(/assigned r1/i)
    expect(result.current.canUndo).toBe(true)

    act(() => result.current.undo())
    expect(result.current.assignments).toEqual([])
    expect(result.current.canRedo).toBe(true)

    act(() => result.current.redo())
    expect(result.current.assignments).toEqual([A])
  })

  it('toggles a paper lock on and off', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    expect(result.current.lockedPapers).toEqual([])
    act(() => result.current.toggleLock('P1'))
    expect(result.current.lockedPapers).toEqual(['P1'])
    act(() => result.current.toggleLock('P1'))
    expect(result.current.lockedPapers).toEqual([])
  })
})
