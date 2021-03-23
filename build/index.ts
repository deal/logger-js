import Listr from 'listr'
import chalk from 'chalk'
import buildBrowser from './build-browser'
import buildServer from './build-server'
import buildTypes from './build-types'
import { RollupWarning } from 'rollup'

const context = {
  // Individual build steps can push warning messages to this array so we can log
  //  them to the console at the end.
  warnings: [],
}
/**
 * Some of these build steps are incremental and depend on context or artifacts
 *   exposed by previous steps. They can not be run concurrently, and order
 *   matters. See the comments in each build step file for more context.
 */
const tasks = new Listr(
  [
    {
      title: 'Build Browser',
      task: buildBrowser,
    },
    {
      title: 'Build Server',
      task: buildServer,
    },
    // Leaving this in the event we ever want a standalone snippet
    // {
    //   title: 'Build Snippet',
    //   task: buildSnippet,
    // },
    {
      title: 'Build Types',
      task: buildTypes,
    },
  ],
  {
    // This option prevents sub-tasks from being hidden after they complete.
    // The Listr typings are incomplete.
    //
    // @ts-ignore
    collapse: false,
  }
)

// Execute
tasks.run(context).then((ctx) => {
  if (ctx.warnings.length > 0) {
    ctx.warnings.forEach((warning: string | RollupWarning) => {
      console.warn(typeof warning === 'string' ? warning : warning.message)
    })
  }

  console.log(chalk.green('Done!'))
})
