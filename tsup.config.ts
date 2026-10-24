import { defineConfig, type Options } from 'tsup'

const shared: Options = {
  format: ['cjs', 'esm'],
  dts: {
    compilerOptions: {
      incremental: false,
    },
  },
  splitting: false,
  sourcemap: false,
  // `npm run build:lib` empties dist first: two configs build in parallel and must not clean each other.
  clean: false,
  external: ['react', 'react-dom'],
  // Rollup tree-shaking strips the "use client" banner (published 1.1.0/1.2.0 lacked it);
  // esbuild's own dead-code elimination still applies.
  treeshake: false,
  minify: false,
  target: 'es2020',
  outDir: 'dist',
}

// The React entries import the engine by its public name and keep it external: at runtime they share
// dist/core.* (one store implementation, one set of caches) instead of each bundling a copy.
const client: Options = { ...shared, external: ['react', 'react-dom', 'calendarkit-pro/core'], banner: { js: '"use client";' } }

export default defineConfig([
  // calendarkit-pro: React components, client-only.
  { ...client, entry: { index: 'src/index.tsx' } },
  // calendarkit-pro/react: hooks, provider, prop-getters and dnd-kit bridge, client-only.
  { ...client, entry: { react: 'src/react/index.ts' } },
  // calendarkit-pro/core: framework-agnostic engine, usable on the server and from any framework.
  { ...shared, entry: { core: 'src/core/index.ts' } },
])
