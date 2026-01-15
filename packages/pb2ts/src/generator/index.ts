import { runParser } from '../parser/runParser'
import type { Pb2tsConfig } from '../config/types'
import { ProtoToTsGenerator } from './service'

export async function generate(config: Pb2tsConfig) {
    const services = await runParser(config)

    console.log('Generating...')

    console.log(services)

    const generator = new ProtoToTsGenerator(config);

    generator.generate(services);
}