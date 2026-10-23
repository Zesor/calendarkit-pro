// Wall-clock times relative to today: "today at 9:30" stays 9:30 on a clock-change day, where
// `today.getTime() + 9.5 * 3600e3` would be 8:30 or 10:30 (npm run test:dst runs the suite there).
export function todayAt(hours: number, days = 0): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, Math.floor(hours), Math.round((hours % 1) * 60))
}
