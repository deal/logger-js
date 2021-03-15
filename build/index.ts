import Listr from 'listr'
import chalk from 'chalk'
import buildClient from './build-client'
import buildSnippet from './build-snippet'
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
      title: 'Build Client',
      task: buildClient,
    },
    {
      title: 'Build Snippet',
      task: buildSnippet,
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
