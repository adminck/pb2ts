import type { Pb2tsConfig, GenerationType } from './types'
import type { RPC } from '../parser/types'

export const defaultConfig: Pb2tsConfig = {
    proto: {
        root: './',
        include: [],
        exclude: ['node_modules', 'dist'],
    },
    output: {
        dir: './api',
        imports: [],
        generationType: 'service', // 默认使用服务类方式
        serviceTemplate: {
            classWrapper: defaultServiceClassWrapper,
            methodWrapper: defaultServiceMethodWrapper,
            extensionWrapper: defaultExtensionWrapper,
        },
        functionTemplate: {
            functionWrapper: defaultFunctionWrapper,
        },
    },
}

function defaultServiceClassWrapper(serviceName: string, methodsCode: string): string {
    return `/**
 * Service class for ${serviceName}
 */
export class ${serviceName}Service {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

${methodsCode}
}`;
}

function defaultServiceMethodWrapper(rpc: RPC): string {
    const methodName = rpc.name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    const comments = rpc.leadingComments ? `  /**\n   * ${rpc.leadingComments}\n   */\n` : '';
    
    return `${comments}  async ${methodName}(request: Types.${rpc.request}): Promise<Types.${rpc.resp}> {
    const response = await fetch(\`\${this.baseUrl}${rpc.path}\`, {
      method: '${rpc.method.toUpperCase()}',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(\`${rpc.name} failed: \${response.statusText}\`);
    }

    return response.json();
  }`;
}

function defaultFunctionWrapper(rpc: RPC): string {
    const functionName = rpc.name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    const comments = rpc.leadingComments ? `/**\n * ${rpc.leadingComments}\n */\n` : '';
    
    return `${comments}export async function ${functionName}(request: Types.${rpc.request}, baseUrl: string = ''): Promise<Types.${rpc.resp}> {
  const response = await fetch(\`\${baseUrl}${rpc.path}\`, {
    method: '${rpc.method.toUpperCase()}',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(\`${rpc.name} failed: \${response.statusText}\`);
  }

  return response.json();
}`;
}

function defaultExtensionWrapper(serviceName: string): string {
    return `/**
 * User custom extensions for ${serviceName}
 * 
 * This file is for your custom code and will NOT be overwritten.
 * Import generated types from: ./${serviceName}.types
 */

import { ${serviceName}Service, Types } from './${serviceName}.index';

// Example: Extend the generated service
export class ${serviceName}ServiceExtended extends ${serviceName}Service {
  // Add your custom methods here
  
  // Example:
  // async customMethod(data: Types.SomeMessage): Promise<void> {
  //   // Your custom logic
  // }
}

// Example: Helper functions
// export function validate${serviceName}(data: Types.SomeMessage): boolean {
//   // Your validation logic
//   return true;
// }
`;
}