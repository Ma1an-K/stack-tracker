import { describe, expect, it } from 'vitest'
import { buildNotification } from './payload'

describe('buildNotification', () => {
  it('uses the stored homegame name and a valid date', () => {
    const n = buildNotification('Friday Game', '2026-11-20')
    expect(n.title).toBe('Friday Game - New Session')
    expect(n.body).toBe('A new session has been logged for 2026-11-20. Check your results!')
    expect(n.url).toBe('/sessions')
  })

  it('drops a date that is not YYYY-MM-DD', () => {
    expect(buildNotification('G', 'click evil.example now').body).toBe(
      'A new session has been logged. Check your results!')
    expect(buildNotification('G', undefined).body).toBe('A new session has been logged. Check your results!')
    expect(buildNotification('G', 20261120).body).toBe('A new session has been logged. Check your results!')
  })

  it('falls back when the name is missing and caps long names', () => {
    expect(buildNotification(null, null).title).toBe('Homegame - New Session')
    expect(buildNotification('x'.repeat(200), null).title).toBe(`${'x'.repeat(60)} - New Session`)
  })
})
