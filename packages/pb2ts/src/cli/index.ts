import cac from 'cac'
import pc from 'picocolors'
import { loadConfig } from '../config/loadConfig'
import { version } from '../../package.json'
import { generate } from '../generator'

const cli = cac('pb2ts')

cli
    .command(
        'gen',
        'Generate TypeScript clients from proto files',
    )
    .option('--proto <dir>', 'Proto root directory')
    .option('--out <dir>', 'Output directory')
    .option('-c, --config <file>', 'Use specific config file')
    .action(async (options) => {
        try {
            console.log(pc.cyan(`\n  pb2ts v${version}\n`))

            const overrides = {
                proto: options.proto ? { root: options.proto } : undefined,
                output: options.out ? { dir: options.out } : undefined,
            }

            const config = loadConfig(process.cwd(), {
                configFile: options.config,
                overrides,
            })

            console.log(pc.green('  Config loaded!'))
            console.log(pc.dim('  Parsing proto files...'))

            await generate(config)

            console.log(pc.green('\n  Done!\n'))
        } catch (error) {
            console.error(
                pc.red(
                    `\n  ${error instanceof Error ? error.message : String(error)}\n`,
                ),
            )
            process.exit(1)
        }
    })

cli.help()
cli.version(version)

cli.parse()
