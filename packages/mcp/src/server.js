// @tanrei/mcp — a Model Context Protocol server over stdio. An agent working in a product's repository can
// discover the vocabulary, see where a value comes from, and write a VALID layer edit — a value, or an extension
// of the vocabulary. Nothing here writes a file; the pipeline underneath is the authority on what is legal.
import fs from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListResourceTemplatesRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, McpError, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { INSTRUCTIONS, listResources, readResource } from './resources.js';
import { ToolError } from './systems.js';
import { TOOLS } from './tools.js';

const VERSION = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

const ajv = new Ajv2020({ allErrors: true, strict: false, useDefaults: true });
const tools = new Map(TOOLS.map((tool) => [tool.name, { ...tool, validate: ajv.compile(tool.inputSchema) }]));

const text = (value, isError = false) => ({ content: [{ type: 'text', text: JSON.stringify(value) }], ...(isError ? { isError: true } : {}) });

export async function callTool(name, args = {}) {
  const tool = tools.get(name);
  if (!tool) throw new McpError(ErrorCode.InvalidParams, `unknown tool "${name}". Tools: ${[...tools.keys()].join(', ')}`);
  const input = structuredClone(args);
  if (!tool.validate(input)) return text({ error: 'invalid arguments', problems: tool.validate.errors.map((e) => `${e.instancePath || '/'} ${e.message}${e.params?.additionalProperty ? ` ("${e.params.additionalProperty}")` : ''}${e.params?.allowedValues ? `: ${e.params.allowedValues.join(', ')}` : ''}`) }, true);
  try {
    return text(await tool.handler(input));
  } catch (error) {
    if (error instanceof ToolError) return text({ error: error.message, ...error.details }, true);
    return text({ error: `${name} failed: ${error.message}` }, true);
  }
}

export function createServer() {
  const server = new Server({ name: 'tanrei', title: 'Tanrei design system', version: VERSION }, { capabilities: { tools: {}, resources: {} }, instructions: INSTRUCTIONS });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema, annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false } })),
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => callTool(request.params.name, request.params.arguments));
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: listResources() }));
  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: [
      { uriTemplate: 'tanrei://systems/{id}', name: 'System layer', description: 'The layer file of a shipped system, as authored.', mimeType: 'application/json' },
      { uriTemplate: 'tanrei://components/{id}', name: 'Components manifest', description: 'The components a shipped system ships, those it does not have, and the variant values it leaves out.', mimeType: 'application/json' },
    ],
  }));
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    try {
      return { contents: [readResource(request.params.uri)] };
    } catch (error) {
      throw new McpError(ErrorCode.InvalidParams, error.message);
    }
  });
  return server;
}

export async function main() {
  // stdout carries the protocol and nothing else; anything a dependency prints goes to stderr.
  console.log = console.info = console.debug = (...args) => console.error(...args);
  await createServer().connect(new StdioServerTransport());
}
