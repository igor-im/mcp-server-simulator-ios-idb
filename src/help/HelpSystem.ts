// SPDX-FileCopyrightText: © 2025 Industria de Diseño Textil S.A. INDITEX
// SPDX-License-Identifier: Apache-2.0

import { CommandDefinition } from '../parser/commands/BaseCommandDefinition.js';
import { FuzzyMatcher } from '../utils/FuzzyMatch.js';

export interface CommandCategory {
  name: string;
  description: string;
  icon: string;
  commands: string[];
}

export interface HelpResponse {
  category?: string;
  commands?: Array<{
    command: string;
    description: string;
    examples: string[];
    requiredParameters: string[];
    optionalParameters: string[];
  }>;
  suggestions?: string[];
  categories?: CommandCategory[];
  message?: string;
}

export class HelpSystem {
  private commandDefinitions: CommandDefinition[] = [];
  private categories: CommandCategory[] = [
    {
      name: 'simulator',
      description: 'Create, manage, and control iOS simulators',
      icon: '📱',
      commands: ['create session', 'terminate session', 'list simulators', 'list booted simulators', 'boot simulator', 'shutdown simulator', 'focus simulator']
    },
    {
      name: 'app',
      description: 'Install, launch, and manage applications',
      icon: '📱',
      commands: ['install app', 'launch app', 'terminate app', 'uninstall app', 'list apps', 'check app installed']
    },
    {
      name: 'ui',
      description: 'Interact with the simulator UI',
      icon: '🖱️',
      commands: ['tap', 'swipe', 'press button', 'input text', 'press key', 'press key sequence']
    },
    {
      name: 'accessibility',
      description: 'Access UI elements for testing',
      icon: '♿',
      commands: ['describe elements', 'describe point']
    },
    {
      name: 'capture',
      description: 'Take screenshots and record videos',
      icon: '📸',
      commands: ['take screenshot', 'record video', 'stop recording', 'get logs']
    },
    {
      name: 'debug',
      description: 'Debug applications and analyze issues',
      icon: '🐛',
      commands: ['start debug', 'stop debug', 'debug status', 'list crash logs', 'show crash log', 'delete crash logs']
    },
    {
      name: 'misc',
      description: 'Additional utilities and advanced features',
      icon: '🔧',
      commands: ['install dylib', 'open url', 'clear keychain', 'set location', 'add media', 'approve permissions', 'update contacts']
    }
  ];

  setCommandDefinitions(definitions: CommandDefinition[]) {
    this.commandDefinitions = definitions;
  }

  /**
   * Get help for all categories
   */
  getCategories(): HelpResponse {
    return {
      categories: this.categories,
      message: 'Available command categories. Use "help <category>" for detailed commands in that category.'
    };
  }

  /**
   * Get help for a specific category
   */
  getCategoryHelp(categoryName: string): HelpResponse {
    const category = this.categories.find(cat => 
      cat.name.toLowerCase() === categoryName.toLowerCase()
    );

    if (!category) {
      const suggestions = FuzzyMatcher.findMatches(
        categoryName, 
        this.categories.map(cat => cat.name),
        3,
        0.4
      ).map(match => match.item);

      return {
        message: `Category "${categoryName}" not found.`,
        suggestions: suggestions.length > 0 ? suggestions : this.categories.map(cat => cat.name)
      };
    }

    const commands = this.commandDefinitions
      .filter(def => category.commands.includes(def.command))
      .map(def => ({
        command: def.command,
        description: def.description,
        examples: def.examples.slice(0, 2), // Show first 2 examples
        requiredParameters: def.requiredParameters,
        optionalParameters: def.optionalParameters
      }));

    return {
      category: category.name,
      commands,
      message: `${category.icon} ${category.description}`
    };
  }

  /**
   * Get help for a specific command
   */
  getCommandHelp(commandName: string): HelpResponse {
    const definition = this.commandDefinitions.find(def => 
      def.command.toLowerCase() === commandName.toLowerCase()
    );

    if (!definition) {
      const allCommands = this.commandDefinitions.map(def => def.command);
      const suggestions = FuzzyMatcher.findMatches(commandName, allCommands, 5, 0.3)
        .map(match => match.item);

      return {
        message: `Command "${commandName}" not found.`,
        suggestions: suggestions.length > 0 ? suggestions : this.getPopularCommands()
      };
    }

    return {
      commands: [{
        command: definition.command,
        description: definition.description,
        examples: definition.examples,
        requiredParameters: definition.requiredParameters,
        optionalParameters: definition.optionalParameters
      }],
      message: `Detailed help for "${definition.command}"`
    };
  }

  /**
   * Search for commands matching a query
   */
  searchCommands(query: string): HelpResponse {
    if (!query.trim()) {
      return {
        message: 'Please provide a search term.',
        suggestions: this.getPopularCommands()
      };
    }

    const allCommands = this.commandDefinitions.map(def => def.command);
    const commandMatches = FuzzyMatcher.findMatches(query, allCommands, 10, 0.2);

    // Also search in descriptions and examples
    const descriptionMatches = this.commandDefinitions
      .filter(def => 
        def.description.toLowerCase().includes(query.toLowerCase()) ||
        def.examples.some(example => example.toLowerCase().includes(query.toLowerCase()))
      )
      .map(def => def.command);

    // Combine and deduplicate results
    const allMatches = new Set([
      ...commandMatches.map(match => match.item),
      ...descriptionMatches
    ]);

    if (allMatches.size === 0) {
      return {
        message: `No commands found matching "${query}".`,
        suggestions: this.getPopularCommands()
      };
    }

    const commands = Array.from(allMatches)
      .map(commandName => this.commandDefinitions.find(def => def.command === commandName)!)
      .map(def => ({
        command: def.command,
        description: def.description,
        examples: def.examples.slice(0, 1), // Show first example only
        requiredParameters: def.requiredParameters,
        optionalParameters: def.optionalParameters
      }));

    return {
      commands,
      message: `Found ${commands.length} command(s) matching "${query}"`
    };
  }

  /**
   * Get contextual help based on current session state
   */
  getContextualHelp(hasActiveSession: boolean): HelpResponse {
    if (!hasActiveSession) {
      return {
        commands: this.commandDefinitions
          .filter(def => ['create session', 'list simulators', 'boot simulator'].includes(def.command))
          .map(def => ({
            command: def.command,
            description: def.description,
            examples: def.examples.slice(0, 1),
            requiredParameters: def.requiredParameters,
            optionalParameters: def.optionalParameters
          })),
        message: 'No active simulator session. Here are commands to get started:'
      };
    }

    return {
      commands: this.commandDefinitions
        .filter(def => ['install app', 'launch app', 'tap', 'take screenshot', 'terminate session'].includes(def.command))
        .map(def => ({
          command: def.command,
          description: def.description,
          examples: def.examples.slice(0, 1),
          requiredParameters: def.requiredParameters,
          optionalParameters: def.optionalParameters
        })),
      message: 'Active simulator session detected. Here are some common next steps:'
    };
  }

  /**
   * Parse help request and return appropriate response
   */
  processHelpRequest(request: string, hasActiveSession: boolean = false): HelpResponse {
    const normalizedRequest = request.trim().toLowerCase();

    // Empty or general help request
    if (!normalizedRequest || normalizedRequest === 'help') {
      return this.getContextualHelp(hasActiveSession);
    }

    // Category help
    if (normalizedRequest.startsWith('help ')) {
      const target = normalizedRequest.substring(5).trim();
      
      // Check if it's a category
      const category = this.categories.find(cat => cat.name.toLowerCase() === target);
      if (category) {
        return this.getCategoryHelp(target);
      }
      
      // Check if it's a specific command
      const command = this.commandDefinitions.find(def => def.command.toLowerCase() === target);
      if (command) {
        return this.getCommandHelp(target);
      }
      
      // Search for commands
      return this.searchCommands(target);
    }

    // Categories list
    if (normalizedRequest === 'categories' || normalizedRequest === 'list categories') {
      return this.getCategories();
    }

    // Search request
    if (normalizedRequest.startsWith('search ')) {
      const query = normalizedRequest.substring(7).trim();
      return this.searchCommands(query);
    }

    // General search
    return this.searchCommands(normalizedRequest);
  }

  /**
   * Get popular/commonly used commands
   */
  private getPopularCommands(): string[] {
    return [
      'create session',
      'list simulators',
      'install app',
      'launch app',
      'tap',
      'take screenshot'
    ];
  }

  /**
   * Format help response as human-readable text
   */
  formatHelpResponse(response: HelpResponse): string {
    let output = '';

    if (response.message) {
      output += `${response.message}\n\n`;
    }

    if (response.categories) {
      output += '📚 **Command Categories:**\n';
      for (const category of response.categories) {
        output += `${category.icon} **${category.name}** - ${category.description}\n`;
      }
      output += '\nUse "help <category>" for commands in that category.\n';
    }

    if (response.commands) {
      if (response.commands.length === 1) {
        const cmd = response.commands[0];
        output += `## ${cmd.command}\n`;
        output += `${cmd.description}\n\n`;
        
        if (cmd.requiredParameters.length > 0) {
          output += `**Required parameters:** ${cmd.requiredParameters.join(', ')}\n`;
        }
        
        if (cmd.optionalParameters.length > 0) {
          output += `**Optional parameters:** ${cmd.optionalParameters.join(', ')}\n`;
        }
        
        if (cmd.examples.length > 0) {
          output += `\n**Examples:**\n`;
          for (const example of cmd.examples) {
            output += `- "${example}"\n`;
          }
        }
      } else {
        output += '**Available Commands:**\n';
        for (const cmd of response.commands) {
          output += `• **${cmd.command}** - ${cmd.description}\n`;
          if (cmd.examples.length > 0) {
            output += `  Example: "${cmd.examples[0]}"\n`;
          }
        }
      }
    }

    if (response.suggestions && response.suggestions.length > 0) {
      output += '\n**Did you mean:**\n';
      for (const suggestion of response.suggestions) {
        output += `- ${suggestion}\n`;
      }
    }

    return output.trim();
  }
}