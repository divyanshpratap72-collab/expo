import type { McpServerProxy } from '@expo/mcp-tunnel' with { 'resolution-mode': 'import' };
import resolveFrom from 'resolve-from';

import { Log } from '../../log';
import { env } from '../../utils/env';

const debug = require('debug')('expo:start:server:mcp') as typeof console.log;

/**
 * Start the MCP server integration.
 */
export async function maybeStartMCPServerAsync(
  projectRoot: string
): Promise<McpServerProxy | null> {
  const mcpServer = env.EXPO_UNSTABLE_MCP_SERVER;
  if (!mcpServer) {
    return null;
  }
  const mcpPackagePath = resolveFrom.silent(projectRoot, 'expo-mcp');
  if (!mcpPackagePath) {
    return null;
  }

  const normalizedServer = /^([a-zA-Z][a-zA-Z\d+\-.]*):\/\//.test(mcpServer)
    ? mcpServer
    : `wss://${mcpServer}`;
  const mcpServerUrlObject = new URL(normalizedServer);
  const scheme = mcpServerUrlObject.protocol ?? 'wss:';
  const mcpServerUrl = `${scheme}//${mcpServerUrlObject.host}`;
  debug(`Starting MCP tunnel - server URL: ${mcpServerUrl}`);

  try {
    const { addMcpCapabilities } = await import(mcpPackagePath);
    const { TunnelMcpServerProxy } = await import('@expo/mcp-tunnel');

    const logger = {
      ...Log,
      debug(...message: any[]): void {
        debug(...message);
      },
      info(...message: any[]): void {
        Log.log(...message);
      },
    };
    const server: McpServerProxy = new TunnelMcpServerProxy(mcpServerUrl, { logger });
    addMcpCapabilities(server);

    return server;
  } catch (error: unknown) {
    debug(`Error starting MCP tunnel: ${error}`);
  }
  return null;
}
