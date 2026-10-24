# Launch video

The CalendarKit 2.0 announcement: 33 seconds, 1920 x 1080, 30 fps, silent and cut on a 120 BPM grid (a beat is 15 frames), made with [Remotion](https://www.remotion.dev) from real captures of the demo. It is a project of its own: nothing here ships in the npm package or adds a dependency to the library.

```bash
npm install
npm run capture   # needs the demo: `npm run dev` at the repository root (port 3000)
npm run render    # writes out/calendarkit-2.0.mp4
npm run studio    # preview and scrub in the browser
```

- `capture.mjs` drives the demo in headless Chrome with the clock fixed on Tuesday 20 October 2026, 10:15 in Paris, and writes `public/captures`: the PNGs and `manifest.json` (the boxes of the elements the cursor and the camera aim at). The place suggestions come live from Photon (OpenStreetMap). `DEMO_URL` points it at another address.
- `src/Video.tsx` is the timeline, `src/scenes.tsx` the 17 scenes, `src/kit.tsx` the colours, type, motion, camera, cursor and HUD.
- The captures and the renders stay out of git (`.gitignore`).
- Remotion's license is free for individuals and companies of up to three people; larger companies need a company license.
