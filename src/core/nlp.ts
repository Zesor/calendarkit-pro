import { addDays, startOfDay } from 'date-fns'

export type SentenceLanguage = 'fr' | 'en'

export interface ParsedToken {
  /** The text recognised in the sentence, as typed. */
  text: string
  kind: 'date' | 'time' | 'duration' | 'repeat'
}

export interface ParsedSentence {
  /** The sentence without the recognised tokens: what gets saved as the title. */
  title: string
  /** Local midnight of the recognised day. */
  date?: Date
  /** Start time, in minutes since midnight. */
  startMinutes?: number
  durationMinutes?: number
  /** Weekdays use 0 = Monday … 6 = Sunday, like `CalendarEvent.recurrence.byweekday`. */
  recurrence?: { freq: 'DAILY' | 'WEEKLY'; byweekday?: number[] }
  /** Recognised tokens, in reading order. */
  tokens: ParsedToken[]
}

interface Rule {
  kind: ParsedToken['kind']
  re: RegExp
  apply: (m: RegExpExecArray, out: ParsedSentence, now: Date) => boolean
}

const WEEKDAYS = {
  fr: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
  en: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
}
const mondayIndex = (date: Date) => (date.getDay() + 6) % 7
/** The given weekday on or after `now` (today counts). */
const nextWeekday = (now: Date, weekday: number) => addDays(startOfDay(now), (weekday - mondayIndex(now) + 7) % 7)
const minutes = (h: number, m = 0) => (h >= 0 && h < 24 && m >= 0 && m < 60 ? h * 60 + m : undefined)

function setTime(out: ParsedSentence, value: number | undefined): boolean {
  if (value === undefined) return false
  out.startMinutes = value
  return true
}

function durationOf(amount: string, unit: string, extra?: string): number | undefined {
  const n = Number(amount)
  if (/^h|hour/i.test(unit)) return n * 60 + (extra ? Number(extra) : 0)
  return n
}

function rules(language: SentenceLanguage): Rule[] {
  const days = WEEKDAYS[language]
  const dayAlt = days.join('|')
  if (language === 'fr') {
    return [
      { kind: 'repeat', re: /\btous les jours\b/gi, apply: (_, o) => ((o.recurrence = { freq: 'DAILY' }), true) },
      { kind: 'repeat', re: new RegExp(`\\b(?:tous les|chaque) (${dayAlt})s?\\b`, 'gi'), apply: (m, o, now) => {
        const wd = days.indexOf(m[1].toLowerCase()); o.recurrence = { freq: 'WEEKLY', byweekday: [wd] }; o.date ??= nextWeekday(now, wd); return true } },
      { kind: 'repeat', re: /\b(?:chaque semaine|toutes les semaines)\b/gi, apply: (_, o) => ((o.recurrence = { freq: 'WEEKLY' }), true) },
      { kind: 'duration', re: /\bpendant (\d+)\s?(h|heures?|min|minutes?)(?:\s?(\d{2}))?\b/gi, apply: (m, o) => ((o.durationMinutes = durationOf(m[1], m[2], m[3])), true) },
      { kind: 'date', re: /\baprès-demain\b/gi, apply: (_, o, now) => ((o.date = addDays(startOfDay(now), 2)), true) },
      { kind: 'date', re: /\bdemain\b/gi, apply: (_, o, now) => ((o.date = addDays(startOfDay(now), 1)), true) },
      { kind: 'date', re: /\baujourd'hui\b/gi, apply: (_, o, now) => ((o.date = startOfDay(now)), true) },
      { kind: 'date', re: new RegExp(`\\b(${dayAlt})\\b`, 'gi'), apply: (m, o, now) => ((o.date = nextWeekday(now, days.indexOf(m[1].toLowerCase()))), true) },
      { kind: 'time', re: /(?:(?<=^|\s)à\s+)?\bmidi\b/gi, apply: (_, o) => setTime(o, 12 * 60) },
      { kind: 'time', re: /(?:(?<=^|\s)à\s+)?\b(\d{1,2})\s?(?:h|:)\s?(\d{2})?\b/gi, apply: (m, o) => setTime(o, minutes(Number(m[1]), m[2] ? Number(m[2]) : 0)) },
    ]
  }
  return [
    { kind: 'repeat', re: /\b(?:every day|daily)\b/gi, apply: (_, o) => ((o.recurrence = { freq: 'DAILY' }), true) },
    { kind: 'repeat', re: new RegExp(`\\bevery (${dayAlt})\\b`, 'gi'), apply: (m, o, now) => {
      const wd = days.indexOf(m[1].toLowerCase()); o.recurrence = { freq: 'WEEKLY', byweekday: [wd] }; o.date ??= nextWeekday(now, wd); return true } },
    { kind: 'repeat', re: /\b(?:every week|weekly)\b/gi, apply: (_, o) => ((o.recurrence = { freq: 'WEEKLY' }), true) },
    { kind: 'duration', re: /\bfor (\d+)\s?(h|hours?|min|minutes?)(?:\s?(\d{2}))?\b/gi, apply: (m, o) => ((o.durationMinutes = durationOf(m[1], m[2], m[3])), true) },
    { kind: 'date', re: /\btomorrow\b/gi, apply: (_, o, now) => ((o.date = addDays(startOfDay(now), 1)), true) },
    { kind: 'date', re: /\btoday\b/gi, apply: (_, o, now) => ((o.date = startOfDay(now)), true) },
    { kind: 'date', re: new RegExp(`\\b(?:on )?(${dayAlt})\\b`, 'gi'), apply: (m, o, now) => ((o.date = nextWeekday(now, days.indexOf(m[1].toLowerCase()))), true) },
    { kind: 'time', re: /(?:\bat\s)?\bnoon\b/gi, apply: (_, o) => setTime(o, 12 * 60) },
    { kind: 'time', re: /(?:\bat\s)?\b(\d{1,2})(?::(\d{2}))?\s?(am|pm)\b/gi, apply: (m, o) => {
      const h = Number(m[1]) % 12 + (m[3].toLowerCase() === 'pm' ? 12 : 0); return Number(m[1]) <= 12 && setTime(o, minutes(h, m[2] ? Number(m[2]) : 0)) } },
    { kind: 'time', re: /(?:\bat\s)?\b(\d{1,2}):(\d{2})\b/gi, apply: (m, o) => setTime(o, minutes(Number(m[1]), Number(m[2]))) },
  ]
}

/**
 * Reads date, time, duration and repetition words in an event title ("Déj. avec Léa demain 13h",
 * "Lunch tomorrow 1pm for 2h", "Sport tous les lundis 18h") relative to `now`. Unrecognised words
 * stay in the title; the first match of each kind wins.
 */
export function parseEventSentence(text: string, options: { now: Date; language?: SentenceLanguage }): ParsedSentence {
  const out: ParsedSentence = { title: '', tokens: [] }
  const taken: Array<[number, number]> = []
  const found = new Set<ParsedToken['kind']>()
  const matches: Array<{ index: number; text: string; kind: ParsedToken['kind'] }> = []
  for (const rule of rules(options.language ?? 'fr')) {
    if (found.has(rule.kind) && rule.kind !== 'date') continue
    rule.re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = rule.re.exec(text))) {
      const [start, end] = [m.index, m.index + m[0].length]
      if (taken.some(([a, b]) => start < b && a < end)) continue
      if (rule.kind === 'date' && found.has('date')) continue
      if (!rule.apply(m, out, options.now)) continue
      taken.push([start, end])
      found.add(rule.kind)
      if (rule.kind === 'repeat' && out.date) found.add('date')
      matches.push({ index: start, text: m[0].trim(), kind: rule.kind })
      break
    }
  }
  out.tokens = matches.sort((a, b) => a.index - b.index).map(({ text, kind }) => ({ text, kind }))
  let title = text
  for (const [start, end] of [...taken].sort((a, b) => b[0] - a[0])) title = title.slice(0, start) + ' ' + title.slice(end)
  out.title = title.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').replace(/^[\s,;:-]+|[\s,;:-]+$/g, '').trim()
  return out
}
