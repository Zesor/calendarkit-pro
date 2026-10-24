import { Composition } from 'remotion'
import { FPS } from './kit'
import { DURATION, Video } from './Video'

export const Root = () => <Composition id="CalendarKit2" component={Video} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />
