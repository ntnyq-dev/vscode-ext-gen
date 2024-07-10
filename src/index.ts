import { pascalCase } from 'scule'

const forwardKeys = [
  'publisher',
  'name',
  'version',
  'displayName',
  'description',
]

export function generate(packageJson: any) {
  const lines: string[] = [
    '// This file is generated by `vscode-ext-gen`. Do not modify manually.',
    '// @see https://github.com/antfu/vscode-ext-gen',
    '',
  ]

  lines.push('// Meta info')

  for (const key of forwardKeys) {
    lines.push(`export const ${key} = ${packageJson[key] ? JSON.stringify(packageJson[key]) : 'undefined'}`)
  }

  lines.push(
    // eslint-disable-next-line no-template-curly-in-string
    'export const extensionName = `${publisher}.${name}`',
  )

  const namespace = `${packageJson.name}.`
  const extensionName = `${packageJson.publisher}.${packageJson.name}`

  // ========== Commands ==========

  lines.push(
    '',
    ...generateCommentBlock('Type union of all commands'),
  )
  if (!packageJson.contributes?.commands?.length) {
    lines.push('export type CommandId = never')
  }
  else {
    lines.push(
      'export type CommandId = ',
      ...(packageJson.contributes?.commands || []).map((c: any) =>
      `  | ${JSON.stringify(c.command)}`,
      ),
    )
  }

  lines.push(
    '',
    ...generateCommentBlock(`Commands map registed by \`${extensionName}\``),
    'export const commands = {',
    ...(packageJson.contributes?.commands || [])
      .flatMap((c: any) => {
        let name = c.command
        if (name.startsWith(namespace)) {
          name = name.slice(namespace.length)
        }
        return [
          ...generateCommentBlock(`${c.title}\n@value \`${c.command}\``, 2),
          `  ${pascalCase(name)}: ${JSON.stringify(c.command)},`,
        ]
      }),
    '} satisfies Record<string, CommandId>',
  )

  // ========== Configs ==========

  const configurationObject = packageJson.contributes?.configuration?.properties || {}

  lines.push(
    '',
    ...generateCommentBlock('Type union of all configurations'),
  )
  if (!Object.keys(configurationObject).length) {
    lines.push('export type ConfigurationId = never')
  }
  else {
    lines.push(
      'export type ConfigurationId = ',
      ...Object.keys(configurationObject).map(c =>
      `  | "${c}"`,
      ),
    )
  }

  lines.push(
    '',
    ...generateCommentBlock(`Configs map registed by \`${extensionName}\``),
    'export const configurations = {',
    ...Object.entries(configurationObject)
      .flatMap(([key, value]: any) => {
        let name = key
        if (name.startsWith(namespace)) {
          name = name.slice(namespace.length)
        }
        return [
          ...generateCommentBlock([
            value.description,
            `@key \`${key}\``,
            `@default \`${JSON.stringify(value.default)}\``,
            `@type \`${value.type}\``,
          ].join('\n'), 2),
          `  ${pascalCase(name)}: "${key}",`,
        ]
      }),
    '} satisfies Record<string, ConfigurationId>',
  )

  lines.push(
    '',
    'export const configurationsDefaults = {',
    ...Object.entries(configurationObject)
      .flatMap(([key, value]: any) => {
        return [
          `  ${JSON.stringify(key)}: ${JSON.stringify(value.default)},`,
        ]
      }),
    '} satisfies { [key in ConfigurationId]: ConfigurationTypeMap[key] | null | undefined }',
  )

  lines.push(
    '',
    'export interface ConfigurationTypeMap {',
    ...Object.entries(configurationObject)
      .flatMap(([key, value]: any) => {
        return [
          `  ${JSON.stringify(key)}: ${typeFromSchema(value)},`,
        ]
      }),
    '}',
  )

  lines.push('') // EOL
  return lines.join('\n')
}

function generateCommentBlock(text?: string, padding = 0): string[] {
  const indent = ' '.repeat(padding)
  if (!text) {
    return []
  }
  else if (!text.includes('\n')) {
    return [
      `${indent}/** ${text} */`,
    ]
  }
  else {
    return [
      `${indent}/**`,
      text.split('\n').map(l => `${indent} * ${l}`).join('\n'),
      `${indent} */`,
    ]
  }
}

function typeFromSchema(schema: any): string {
  if (!schema)
    return 'unknown'
  switch (schema.type) {
    case 'boolean':
      return 'boolean'
    case 'string':
      if (schema.enum) {
        return `(${schema.enum.map((v: string) => JSON.stringify(v)).join(' | ')})`
      }
      return 'string'
    case 'number':
      return 'number'
    case 'array':
      if (schema.items) {
        return `${typeFromSchema(schema.items)}[]`
      }
      return 'unknown[]'
    case 'object':
      return 'Record<string, unknown>'
    default:
      return 'unknown'
  }
}
