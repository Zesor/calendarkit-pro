import { vi } from 'vitest'

// `CK_TODAY=2026-10-25T12:00 vitest run`: the suite as it runs on that day (only Date is faked, timers
// stay real). `npm run test:dst` runs it on both 2026 clock changes, where "today + 9 h" is not 9:00.
if (process.env.CK_TODAY) vi.useFakeTimers({ toFake: ['Date'], now: new Date(process.env.CK_TODAY) })
