import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'rollup-plugin-dts';

export default [
  {
    input: 'src/index.ts',
    output: {
      file: './dist/esm/index.js',
      format: 'es',
    },
    plugins: [typescript(), resolve()],
  },
  {
    input: 'src/index.ts',
    output: {
      file: './dist/types/index.d.ts',
      format: 'es',
    },
    plugins: [dts()],
    external: ['node:events'],
  },
  {
    input: 'src/index.ts',
    output: {
      file: './dist/cjs/index.js',
      format: 'cjs',
    },
    plugins: [typescript(), resolve(), commonjs()],
  },

  {
    input: 'src/index.ts',
    output: {
      file: 'dist/iife/index.js',
      format: 'iife',
      sourcemap: true,
      intro: `(function () {`,
      outro: ` for (const key in exports) { window[key] = exports[key]; } })();`,
    },
    plugins: [typescript(), resolve()],
    context: 'window',
  },
];
