import * as rollup from 'rollup'
import typescript from 'rollup-plugin-typescript2'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import replace from 'rollup-plugin-replace'
import fs from 'fs'
import path from 'path'
import util from 'util'
import Listr from 'listr'

/**
 * Build a TypeScript declaration file for the LoggerClient.
 */
export default function buildTypes() {
  return new Listr([
    {
      title: 'Prepare',
      task: (ctx) => {
        return rollup
          .rollup({
            input: 'src/client/index.ts',
            plugins: [
              resolve({
                browser: true,
              }),
              replace({
                'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
              }),
              commonjs(),
              typescript({
                clean: true,
                tsconfig: './src/client/tsconfig.types.json',
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
      title: 'Build Types',
      task: (ctx) => {
        const build = ctx.clientBuild as rollup.RollupBuild

        return build.write({
          dir: 'dist/types',
          format: 'cjs',
        })
      },
    },
    {
      title: 'Copy Files',
      task: () => {
        return util
          .promisify(fs.mkdir)(path.join(__dirname, '../dist'), { recursive: true })
          .then(() => {
            return util.promisify(fs.copyFile)(
              path.join(__dirname, '../package.json'),
              path.join(__dirname, '../dist/package.json')
            )
          })
      },
    },
    {
      title: 'Cleanup',
      task: () => {
        // Rollup generates a nearly empty "index.js". We delete it to avoid confusion.
        return util.promisify(fs.unlink)(path.join(__dirname, '../dist/types/index.js'))
      },
    },
  ])
}
