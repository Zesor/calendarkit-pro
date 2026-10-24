// The timeline: 17 scenes on a 120 BPM grid (15 frames a beat), 33 seconds, the HUD over all of them.
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion'
import { C, Hud } from './kit'
import * as S from './scenes'

const SCENES: Array<{ label: string; dur: number; dark?: boolean | ((f: number) => boolean); Scene: () => React.ReactNode }> = [
  { label: 'THANK YOU', dur: 45, Scene: S.Thanks },
  { label: 'YOU ASKED', dur: 45, dark: true, Scene: S.Asked },
  { label: 'CALENDARKIT 2.0', dur: 60, Scene: S.Welcome },
  { label: 'ZERO SETUP', dur: 60, Scene: S.Setup },
  { label: 'THEMES', dur: 45, dark: S.themeIsDark, Scene: S.Themes },
  { label: 'CREATE IN PLACE', dur: 75, Scene: S.Create },
  { label: 'UNDO', dur: 30, Scene: S.Undo },
  { label: 'DRAG AND DROP', dur: 30, Scene: S.Drag },
  { label: 'FIVE VIEWS', dur: 60, Scene: S.Views },
  { label: 'THREE LAYOUTS', dur: 60, Scene: S.Layouts },
  { label: 'TIME GRID', dur: 45, Scene: S.Grid },
  { label: 'PLACES', dur: 30, Scene: S.Places },
  { label: 'ACCESSIBLE', dur: 60, dark: true, Scene: S.A11y },
  { label: 'PHONES', dur: 45, Scene: S.Phone },
  { label: 'HEADLESS CORE', dur: 75, dark: true, Scene: S.Core },
  { label: 'CALENDARKIT.IO', dur: 135, Scene: S.End },
  { label: 'COMING NEXT', dur: 90, dark: S.soonIsDark, Scene: S.Soon },
]
const STARTS = SCENES.map((_, i) => SCENES.slice(0, i).reduce((n, s) => n + s.dur, 0))
export const DURATION = SCENES.reduce((n, s) => n + s.dur, 0)

export function Video() {
  const frame = useCurrentFrame()
  const i = SCENES.findIndex((s, k) => frame < STARTS[k] + s.dur)
  const { label, dark } = SCENES[i]
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      {SCENES.map(({ label, dur, Scene }, k) => (
        <Sequence key={label} name={label} from={STARTS[k]} durationInFrames={dur}>
          <Scene />
        </Sequence>
      ))}
      <Hud frame={frame} scene={i + 1} total={SCENES.length} label={label} dark={typeof dark === 'function' ? dark(frame - STARTS[i]) : !!dark} />
    </AbsoluteFill>
  )
}
