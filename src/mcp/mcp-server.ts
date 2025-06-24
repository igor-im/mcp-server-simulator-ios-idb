// SPDX-FileCopyrightText: © 2025 Industria de Diseño Textil S.A. INDITEX
// SPDX-License-Identifier: Apache-2.0

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Export implementations
import { IDBManager } from '../idb/IDBManager.js';
import { NLParser } from '../parser/NLParser.js';
import { MCPOrchestrator } from '../orchestrator/MCPOrchestrator.js';
import { HelpSystem } from '../help/HelpSystem.js';

// Log configuration
// Get the directory name using ESM approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Go up two levels from the src/mcp directory to the project root
const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Function to write logs to file without using console
const logToFile = (message: string, level: string = 'info') => {
  try {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} [${level.toUpperCase()}] ${message}\n`;
    fs.appendFileSync(path.join(logsDir, 'mcp-server.log'), logMessage);
  } catch (error) {
    // Not much we can do if logging fails
  }
};

/**
 * Create a complete MCP Server instance
 * @returns Object with all necessary instances
 */
export function createMCPServer() {
  // Create instances
  const idbManager = new IDBManager();
  const parser = new NLParser();
  const orchestrator = new MCPOrchestrator(parser, idbManager);
  const helpSystem = new HelpSystem();
  
  // Initialize help system with full command definitions including examples
  try {
    // Access the command registry to get full command definitions with examples
    const commandRegistry = (parser as any).commandRegistry;
    const allDefinitions = commandRegistry.getCommandHandlers()
      .flatMap((handler: any) => handler.getDefinitions());
    
    helpSystem.setCommandDefinitions(allDefinitions);
  } catch (error) {
    logToFile(`Error initializing help system: ${error}`, 'error');
  }
  
  return {
    idbManager,
    parser,
    orchestrator,
    helpSystem
  };
}

/**
 * MCP Server implementation for iOS simulator
 */
class MCPSimulatorServer {
  private server: Server;
  private orchestrator: ReturnType<typeof createMCPServer>['orchestrator'];
  private helpSystem: ReturnType<typeof createMCPServer>['helpSystem'];

  constructor() {
    // Create component instances
    const { orchestrator, helpSystem } = createMCPServer();
    this.orchestrator = orchestrator;
    this.helpSystem = helpSystem;

    // Create MCP server
    this.server = new Server(
      {
        name: 'iOS Simulator MCP Server',
        version: '1.0.1',
      },
      {
        capabilities: {
          resources: {},
          tools: {
            'process-instruction': {
              description: 'Process natural language instructions for iOS simulator automation',
              inputSchema: {
                type: 'object',
                properties: {
                  instruction: {
                    type: 'string',
                    description: 'Natural language instruction for iOS simulator automation'
                  }
                },
                required: ['instruction']
              }
            },
            'connect': {
              description: 'Connect to an iOS simulator by device name or UUID, automatically boots and creates session',
              inputSchema: {
                type: 'object',
                properties: {
                  identifier: {
                    type: 'string',
                    description: 'Device name (e.g. "iPhone 16") or UUID of the simulator to connect to'
                  }
                },
                required: ['identifier']
              }
            }
          },
        },
      }
    );

    // Register tools
    this.registerTools();

    // Handle errors
    this.server.onerror = (error) => {
      logToFile(`MCP server error: ${error}`, 'error');
    };

    // Handle termination signals
    process.on('SIGINT', async () => {
      await this.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.close();
      process.exit(0);
    });
  }

  /**
   * Register MCP server tools
   */
  private registerTools() {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'process-instruction',
            description: 'Process natural language instructions for iOS simulator automation',
            inputSchema: {
              type: 'object',
              properties: {
                instruction: {
                  type: 'string',
                  description: 'Natural language instruction for iOS simulator automation'
                }
              },
              required: ['instruction']
            }
          },
          {
            name: 'get-help',
            description: 'Get help information about available commands and categories',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Help query - can be empty for general help, category name, command name, or search term'
                }
              },
              required: []
            }
          },
          {
            name: 'connect',
            description: 'Connect to an iOS simulator by device name or UUID, automatically boots and creates session',
            inputSchema: {
              type: 'object',
              properties: {
                identifier: {
                  type: 'string',
                  description: 'Device name (e.g. "iPhone 16") or UUID of the simulator to connect to'
                }
              },
              required: ['identifier']
            }
          }
        ]
      };
    });

    // Main tool for processing natural language instructions
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'process-instruction') {
        const instruction = request.params.arguments?.instruction;
        
        if (!instruction || typeof instruction !== 'string') {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Text instruction is required'
          );
        }

        logToFile(`Processing instruction: ${instruction}`);
        
        try {
          const result = await this.orchestrator.processInstruction(instruction);
          
          // The result can contain enhanced error information even when success=false
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result),
              },
            ],
          };
        } catch (error) {
          logToFile(`Error processing instruction: ${error}`, 'error');
          
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      if (request.params.name === 'get-help') {
        const query = (request.params.arguments?.query as string) || '';
        
        logToFile(`Processing help request: ${query}`);
        
        try {
          // Check if there's an active session for contextual help
          const hasActiveSession = false; // TODO: Check actual session state
          const helpResponse = this.helpSystem.processHelpRequest(query, hasActiveSession);
          const formattedResponse = this.helpSystem.formatHelpResponse(helpResponse);
          
          return {
            content: [
              {
                type: 'text',
                text: formattedResponse,
              },
            ],
          };
        } catch (error) {
          logToFile(`Error processing help request: ${error}`, 'error');
          
          return {
            content: [
              {
                type: 'text',
                text: `Error getting help: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      if (request.params.name === 'connect') {
        const identifier = request.params.arguments?.identifier;
        
        if (!identifier || typeof identifier !== 'string') {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Identifier (device name or UUID) is required'
          );
        }

        logToFile(`Processing connect request: ${identifier}`);
        
        try {
          const result = await this.orchestrator.connectToSimulator(identifier);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result),
              },
            ],
          };
        } catch (error) {
          logToFile(`Error processing connect request: ${error}`, 'error');
          
          return {
            content: [
              {
                type: 'text',
                text: `Error connecting to simulator: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${request.params.name}`
      );
    });
  }

  /**
   * Start the MCP server with stdio transport
   */
  async start() {
    logToFile('Starting MCP server with stdio transport');
    
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logToFile('MCP server started successfully');
    } catch (error) {
      logToFile(`Error starting MCP server: ${error}`, 'error');
      throw error;
    }
  }

  /**
   * Close the MCP server
   */
  async close() {
    logToFile('Closing MCP server');
    
    try {
      await this.server.close();
      logToFile('MCP server closed successfully');
    } catch (error) {
      logToFile(`Error closing MCP server: ${error}`, 'error');
    }
  }
}

// Export a server instance
export default new MCPSimulatorServer();
