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

export default defineConfig([
  // calendarkit-pro: React components, client-only.
  { ...shared, entry: { index: 'src/index.tsx' }, banner: { js: '"use client";' } },
  // calendarkit-pro/core: framework-agnostic engine, usable on the server and from any framework.
  { ...shared, entry: { core: 'src/core/index.ts' } },
])
