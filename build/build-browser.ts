import * as rollup from 'rollup'
import typescript from 'rollup-plugin-typescript2'
import babel from '@rollup/plugin-babel'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import fs from 'fs'
import path from 'path'
import util from 'util'
import Listr from 'listr'
import pkg from '../package.json'

/**
 * Build the rollbar error client
 */
export default function buildClient() {
  return new Listr([
    {
      title: 'Prepare',
      task: (ctx) => {
        return rollup
          .rollup({
            input: 'src/client/index.ts',
            external: Object.keys(pkg.dependencies || {}),
            plugins: [
              resolve({
                browser: true,
              }),
              commonjs(),
              // The only reason we use both the TypeScript and Babel plugins is
              //  because the Rollup Babel plugin currently doesn't support emitting
              //  declaration files. If that changes, we can simplify our toolchain
              //  to use Babel exclusively (via @babel/preset-typescript).
              //
              // See: https://github.com/rollup/plugins/issues/394
              typescript({ clean: true, tsconfig: './src/client/tsconfig.json' }),
              babel({
                babelHelpers: 'bundled',
                plugins: ['@babel/plugin-proposal-class-properties'],
                presets: [
                  [
                    '@babel/preset-env',
                    {
                      targets: '>0.25%, not op_mini all',
                      useBuiltIns: 'entry',
                      corejs: 3,
                      modules: false,
                    },
                  ],
                ],
                include: './src/client/**/*',
              }),
              terser({
                numWorkers: 1,
                // @ts-ignore
                output: {
                  comments: false,
                },
              }),
            ],
            onwarn: (warning) => {
              ctx.warnings.push(warning)
            },
          })
          .then((clientBuild) => {
            ctx.clientBuild = clientBuild
          })
      },
    },
    {
      title: 'Bundle (Browser - CJS)',
      task: (ctx) => {
        const build = ctx.clientBuild as rollup.RollupBuild

        return build.write({
          dir: 'dist/client/browser/cjs',
          format: 'cjs',
          preserveModules: true,
          preserveModulesRoot: 'src/client',
          sourcemap: true,
        })
      },
    },
    {
      title: 'Bundle (Browser - ES)',
      task: (ctx) => {
        const build = ctx.clientBuild as rollup.RollupBuild

        return build.write({
          dir: 'dist/client/browser/es',
          format: 'es',
          preserveModules: true,
          preserveModulesRoot: 'src/client',
          sourcemap: true,
        })
      },
    },
    {
      title: 'Copy Files',
      task: () => {
        return util
          .promisify(fs.mkdir)(path.join(__dirname, '../dist'), { recursive: true })
          .then(() => {
            return Promise.all([
              util.promisify(fs.copyFile)(
                path.join(__dirname, '../package.json'),
                path.join(__dirname, '../dist/package.json')
              ),
              util.promisify(fs.copyFile)(
                path.join(__dirname, '../src/client/package.browser.json'),
                path.join(__dirname, '../dist/client/browser/package.json')
              ),
            ])
          })
      },
    },
  ])
}
