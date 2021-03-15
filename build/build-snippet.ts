import * as rollup from 'rollup'
import typescript from 'rollup-plugin-typescript2'
import replace from '@rollup/plugin-replace'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import builtins from 'builtin-modules'
import Listr from 'listr'
import pkg from '../package.json'

/**
 * Build the Rollbar snippet
 */
export default function buildSnippet() {
  return new Listr([
    {
      title: 'Prepare',
      task: (ctx) => {
        return rollup
          .rollup({
            input: 'src/snippet/index.tsx',
            external: Object.keys(pkg.dependencies)
              .concat(Object.keys(pkg.devDependencies))
              .concat(builtins),
            plugins: [
              resolve(),
              commonjs(),
              replace({
                __BUILD_ENV__: JSON.stringify(process.env.NODE_ENV),
                preventAssignment: false,
              }),
              typescript({ clean: true, tsconfig: './src/snippet/tsconfig.json' }),
            ],
            onwarn: (warning) => {
              ctx.warnings.push(warning)
            },
          })
          .then((snippetBuild) => {
            ctx.snippetBuild = snippetBuild
          })
      },
    },
    {
      title: 'Bundle (CJS)',
      task: (ctx) => {
        const snippetBuild = ctx.snippetBuild as rollup.RollupBuild

        return snippetBuild.write({
          dir: `dist/snippet`,
          exports: 'default',
          format: 'cjs',
          sourcemap: true,
        })
      },
    },
  ])
}
