// SPDX-FileCopyrightText: © 2025 Industria de Diseño Textil S.A. INDITEX
// SPDX-License-Identifier: Apache-2.0

import { ParseResult } from '../interfaces/IParser.js';
import { BaseCommandDefinition } from './BaseCommandDefinition.js';
import { FuzzyMatcher } from '../../utils/FuzzyMatch.js';

export interface EnhancedError {
  message: string;
  suggestions: string[];
  type: 'command_not_found' | 'parameter_missing' | 'validation_failed';
  originalInput: string;
}

export class CommandRegistry {
  private commandHandlers: BaseCommandDefinition[] = [];

  registerHandler(handler: BaseCommandDefinition) {
    this.commandHandlers.push(handler);
  }

  getCommandHandlers() {
    return this.commandHandlers;
  }

  parseInstruction(text: string): ParseResult {
    for (const handler of this.commandHandlers) {
      const result = handler.parseCommand(text);
      if (result) {
        return result;
      }
    }
    
    // Generate helpful error with suggestions
    const enhancedError = this.generateEnhancedError(text);
    const error = new Error(enhancedError.message) as Error & { enhancedError: EnhancedError };
    error.enhancedError = enhancedError;
    throw error;
  }

  async getSupportedCommands(): Promise<Array<{
    command: string;
    description: string;
    requiredParameters: string[];
    optionalParameters: string[];
  }>> {
    return this.commandHandlers
      .flatMap(handler => handler.getDefinitions())
      .map(definition => ({
        command: definition.command,
        description: definition.description,
        requiredParameters: definition.requiredParameters,
        optionalParameters: definition.optionalParameters
      }));
  }

  async suggestCompletions(partialText: string): Promise<string[]> {
    const normalizedPartial = partialText.trim().toLowerCase();
    
    if (!normalizedPartial) {
      return [
        'create session',
        'list simulators',
        'install app',
        'launch app',
        'terminate session'
      ];
    }
    
    // Get all available commands and examples
    const allCandidates: string[] = [];
    
    for (const handler of this.commandHandlers) {
      for (const definition of handler.getDefinitions()) {
        allCandidates.push(definition.command);
        allCandidates.push(...definition.examples);
      }
    }
    
    // Use fuzzy matching for better suggestions
    const matches = FuzzyMatcher.findMatches(partialText, allCandidates, 5, 0.3);
    return matches.map(match => match.item);
  }

  /**
   * Generate enhanced error with helpful suggestions
   */
  private generateEnhancedError(text: string): EnhancedError {
    const allCommands: string[] = [];
    const allExamples: string[] = [];
    
    for (const handler of this.commandHandlers) {
      for (const definition of handler.getDefinitions()) {
        allCommands.push(definition.command);
        allExamples.push(...definition.examples);
      }
    }
    
    // Find similar commands using fuzzy matching
    const commandSuggestions = FuzzyMatcher.findMatches(text, allCommands, 3, 0.3)
      .map(match => match.item);
    
    const exampleSuggestions = FuzzyMatcher.findMatches(text, allExamples, 3, 0.2)
      .map(match => match.item);
    
    // Combine suggestions, prioritizing commands
    const suggestions = [...new Set([...commandSuggestions, ...exampleSuggestions])].slice(0, 5);
    
    let message = `Could not understand the instruction: "${text}"`;
    
    if (suggestions.length > 0) {
      message += `\n\nDid you mean one of these?\n${suggestions.map(s => `• ${s}`).join('\n')}`;
    } else {
      message += `\n\nTry using "help" to see available commands or "help <category>" for specific command groups.`;
    }
    
    return {
      message,
      suggestions,
      type: 'command_not_found',
      originalInput: text
    };
  }
}
