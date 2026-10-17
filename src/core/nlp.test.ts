import { describe, expect, test } from 'vitest'
import { parseEventSentence } from './nlp'

const now = new Date(2026, 9, 14, 11, 52) // Wednesday 14 October 2026

describe('parseEventSentence (fr)', () => {
  test('day, time and the remaining title', () => {
    const r = parseEventSentence('Déj. avec Léa demain 13h', { now })
    expect(r.title).toBe('Déj. avec Léa')
    expect(r.date).toEqual(new Date(2026, 9, 15))
    expect(r.startMinutes).toBe(13 * 60)
    expect(r.tokens).toEqual([{ text: 'demain', kind: 'date' }, { text: '13h', kind: 'time' }])
  })

  test('minutes, "à", duration and weekday (today counts)', () => {
    const r = parseEventSentence('Revue mercredi à 9h30 pendant 1h30', { now })
    expect(r).toMatchObject({ title: 'Revue', date: new Date(2026, 9, 14), startMinutes: 9 * 60 + 30, durationMinutes: 90 })
  })

  test('weekly repetition sets the first day and the weekday', () => {
    const r = parseEventSentence('Sport tous les lundis 18h', { now })
    expect(r).toMatchObject({ title: 'Sport', date: new Date(2026, 9, 19), startMinutes: 18 * 60, recurrence: { freq: 'WEEKLY', byweekday: [0] } })
  })

  test('daily repetition, midi, après-demain, minutes duration', () => {
    expect(parseEventSentence('Méditation tous les jours', { now }).recurrence).toEqual({ freq: 'DAILY' })
    expect(parseEventSentence('Déjeuner après-demain midi pendant 45 min', { now })).toMatchObject({
      title: 'Déjeuner', date: new Date(2026, 9, 16), startMinutes: 12 * 60, durationMinutes: 45,
    })
  })

  test('nothing recognised: the title is the sentence, no fields', () => {
    expect(parseEventSentence('Appel fournisseur', { now })).toEqual({ title: 'Appel fournisseur', tokens: [] })
  })

  test('impossible times are left in the title', () => {
    const r = parseEventSentence('Salle 42h', { now })
    expect(r.startMinutes).toBeUndefined()
    expect(r.title).toBe('Salle 42h')
  })
})

describe('parseEventSentence (en)', () => {
  test('tomorrow 1pm for 2h', () => {
    const r = parseEventSentence('Lunch with Lea tomorrow 1pm for 2h', { now, language: 'en' })
    expect(r).toMatchObject({ title: 'Lunch with Lea', date: new Date(2026, 9, 15), startMinutes: 13 * 60, durationMinutes: 120 })
  })

  test('every monday at 6:30pm, noon, 24-hour times', () => {
    expect(parseEventSentence('Gym every monday at 6:30pm', { now, language: 'en' })).toMatchObject({
      title: 'Gym', date: new Date(2026, 9, 19), startMinutes: 18 * 60 + 30, recurrence: { freq: 'WEEKLY', byweekday: [0] },
    })
    expect(parseEventSentence('Standup today noon', { now, language: 'en' }).startMinutes).toBe(12 * 60)
    expect(parseEventSentence('Call on friday at 14:15', { now, language: 'en' })).toMatchObject({ title: 'Call', date: new Date(2026, 9, 16), startMinutes: 14 * 60 + 15 })
  })

  test('12am is midnight and 12pm is noon', () => {
    expect(parseEventSentence('Deploy 12am', { now, language: 'en' }).startMinutes).toBe(0)
    expect(parseEventSentence('Deploy 12pm', { now, language: 'en' }).startMinutes).toBe(12 * 60)
  })
})
