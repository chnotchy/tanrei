// What the actions at the head of a page do (components/frame/PageActions.astro), without a browser in them: where each
// item of the menu goes, and the text the copy items write. The names are tanrei.config.json's: the MCP server is the
// `mcp` package of the npm scope, registered under the namespace.
//
//   View as Markdown   the page's own Markdown, `<path>.md` beside it (lib/page-markdown.mjs, `markdownPathOf`);
//   Open in ChatGPT    a new chat that asks the assistant to read that Markdown, by its address on the site, and to
//   Open in Claude     answer questions about it, in the page's language (`ask`, src/lib/i18n.ts);
//   Add to Cursor      Cursor's link that installs an MCP server: its name, and its configuration as base64 JSON;
//   Add to VS Code     VS Code's link that installs one: the server's definition as JSON, percent-encoded;
//   the Claude Code command, which the item copies: the command the page on AI agents gives.
//
// The server is the one that page configures (`npx -y <scope>/mcp`, over stdio), and test/ai-agents.test.mjs holds the
// page to these values in every language: one server, said in one place.
import config from '../../../../tanrei.config.json';

/** The MCP server, as a client's configuration names it. */
export const mcpServer = {
  name: config.namespace,
  command: 'npx',
  args: ['-y', `${config.packages.npmScope}/mcp`],
} as const;

/** The command that adds the server to a project in Claude Code. */
export const claudeCodeCommand = `claude mcp add --scope project ${mcpServer.name} -- ${mcpServer.command} ${mcpServer.args.join(' ')}`;

/** UTF-8, then base64: the configuration is ASCII today, and stays readable if it ever is not. */
const base64 = (text: string) => {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
};

/** Cursor's install link: `cursor://anysphere.cursor-deeplink/mcp/install?name=<name>&config=<base64 of the server's JSON>`. */
export const cursorInstallHref = () =>
  `cursor://anysphere.cursor-deeplink/mcp/install?${new URLSearchParams({ name: mcpServer.name, config: base64(JSON.stringify({ command: mcpServer.command, args: mcpServer.args })) })}`;

/** VS Code's install link: `vscode:mcp/install?<the server's definition as JSON, percent-encoded>`. */
export const vscodeInstallHref = () =>
  `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: mcpServer.name, type: 'stdio', command: mcpServer.command, args: mcpServer.args }))}`;

export interface PageActionHrefs {
  /** The page's Markdown, by its path on the site. */
  markdown: string;
  chatgpt: string;
  claude: string;
  cursor: string;
  vscode: string;
}

/**
 * Where each link of the menu goes, for one page.
 *
 * @param markdownPath The page's Markdown, by its path on the site (`/ja/components/button.md`).
 * @param site The site's address, from which an assistant reads that Markdown.
 * @param ask The question in the page's language, `{url}` where the Markdown's address goes.
 */
export function pageActionHrefs(markdownPath: string, site: string | URL, ask: string): PageActionHrefs {
  const question = ask.replace('{url}', new URL(markdownPath, site).href);
  return {
    markdown: markdownPath,
    chatgpt: `https://chatgpt.com/?${new URLSearchParams({ hints: 'search', q: question })}`,
    claude: `https://claude.ai/new?${new URLSearchParams({ q: question })}`,
    cursor: cursorInstallHref(),
    vscode: vscodeInstallHref(),
  };
}
