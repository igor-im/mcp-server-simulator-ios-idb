// SPDX-FileCopyrightText: © 2025 Industria de Diseño Textil S.A. INDITEX
// SPDX-License-Identifier: Apache-2.0

import { BaseCommandDefinition, CommandDefinition } from './BaseCommandDefinition.js';

export class AccessibilityCommands extends BaseCommandDefinition {
  protected definitions: CommandDefinition[] = [
    {
      command: 'describe elements',
      patterns: [
        /describir\s+(todos\s+los\s+)?elementos/i,
        /describe\s+(all\s+)?elements/i,
        /mostrar\s+elementos\s+de\s+accesibilidad/i
      ],
      description: 'Describes all accessibility elements on the screen',
      requiredParameters: [],
      optionalParameters: ['sessionId'],
      examples: [
        'describir todos los elementos',
        'describe all elements',
        'mostrar elementos de accesibilidad'
      ],
      parameterExtractors: {}
    },
    {
      command: 'describe point',
      patterns: [
        /describir\s+punto\s+(?<x>\d+)\s*,\s*(?<y>\d+)/i,
        /describe\s+point\s+(?<x>\d+)\s*,\s*(?<y>\d+)/i,
        /qué\s+hay\s+en\s+(?<x>\d+)\s*,\s*(?<y>\d+)/i
      ],
      description: 'Describes the accessibility element at a specific point',
      requiredParameters: ['x', 'y'],
      optionalParameters: ['sessionId'],
      examples: [
        'describir punto 100, 200',
        'describe point 150, 300',
        'qué hay en 200, 400'
      ],
      parameterExtractors: {
        x: (match) => parseInt(match.groups?.x || '0', 10),
        y: (match) => parseInt(match.groups?.y || '0', 10)
      }
    }
  ];
}
