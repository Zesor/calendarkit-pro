import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['cjs', 'esm'],
  dts: {
    compilerOptions: {
      incremental: false,
    },
  },
  splitting: false,
  sourcemap: false,
  clean: true,
  external: ['react', 'react-dom'],
  // Rollup tree-shaking strips the "use client" banner (published 1.1.0/1.2.0 lacked it);
  // esbuild's own dead-code elimination still applies.
  treeshake: false,
  minify: false,
  target: 'es2020',
  outDir: 'dist',
  banner: {
    js: '"use client";',
  },
})
