import pkg from './package.json'
import typescript from 'rollup-plugin-typescript2'

export default {
  input: 'src/index.ts',
  output: [
    {
      dir: 'dist/cjs',
      format: 'cjs',
      sourcemap: true,
    },
    {
      dir: 'dist/es',
      format: 'es',
      sourcemap: true,
    },
  ],
  preserveModules: true,
  external: Object.keys(pkg.dependencies || {}),
  plugins: [typescript({ clean: true })],
}
