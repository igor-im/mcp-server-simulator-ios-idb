// SPDX-FileCopyrightText: © 2025 Industria de Diseño Textil S.A. INDITEX
// SPDX-License-Identifier: Apache-2.0

import { ParseResult } from '../interfaces/IParser.js';

export interface CommandDefinition {
  command: string;
  patterns: RegExp[];
  description: string;
  requiredParameters: string[];
  optionalParameters: string[];
  examples: string[];
  parameterExtractors: Record<string, (match: RegExpMatchArray) => any>;
}

export abstract class BaseCommandDefinition {
  protected abstract definitions: CommandDefinition[];

  getDefinitions(): CommandDefinition[] {
    return this.definitions;
  }

  parseCommand(text: string): ParseResult | null {
    const normalizedText = text.trim().toLowerCase();
    const originalText = text.trim();
    
    for (const definition of this.definitions) {
      for (const pattern of definition.patterns) {
        const match = normalizedText.match(pattern);
        if (match) {
          // Also get match from original text for parameter extraction
          const originalMatch = originalText.match(pattern);
          const parameters: Record<string, any> = {};
          for (const [paramName, extractor] of Object.entries(definition.parameterExtractors)) {
            // Use original match to preserve case for parameters
            const value = extractor(originalMatch || match);
            if (value !== undefined) {
              parameters[paramName] = value;
            }
          }
          
          return {
            command: definition.command,
            parameters,
            confidence: 0.9,
            originalText: text
          };
        }
      }
    }
    
    return null;
  }
}
