// SPDX-FileCopyrightText: © 2025 Industria de Diseño Textil S.A. INDITEX
// SPDX-License-Identifier: Apache-2.0

import { BaseCommandDefinition, CommandDefinition } from './BaseCommandDefinition.js';

export class CaptureCommands extends BaseCommandDefinition {
  protected definitions: CommandDefinition[] = [
    {
      command: 'capture screen',
      patterns: [
        /capturar\s+(la\s+)?pantalla(\s+en\s+(?<outputPath>[^\s,]+))?/i,
        /screenshot(\s+en\s+(?<outputPath>[^\s,]+))?/i,
        /tomar\s+(una\s+)?captura(\s+en\s+(?<outputPath>[^\s,]+))?/i,
        /capture\s+(the\s+)?screen(\s+to\s+(?<outputPath>[^\s,]+))?/i,
        /take\s+(a\s+)?screenshot(\s+to\s+(?<outputPath>[^\s,]+))?/i,
        /take\s+screenshot/i
      ],
      description: 'Captures a screenshot of the simulator',
      requiredParameters: [],
      optionalParameters: ['outputPath', 'sessionId'],
      examples: [
        'capturar pantalla',
        'screenshot en /ruta/captura.png',
        'tomar una captura',
        'capture screen',
        'take screenshot to /path/capture.png'
      ],
      parameterExtractors: {
        outputPath: (match) => match.groups?.outputPath?.trim()
      }
    },
    {
      command: 'record video',
      patterns: [
        /grabar\s+video\s+(?<outputPath>[^\s,]+)/i,
        /record\s+video\s+(?<outputPath>[^\s,]+)/i,
        /iniciar\s+grabación\s+de\s+video\s+(?<outputPath>[^\s,]+)/i,
        /start\s+recording\s+video\s+(?<outputPath>[^\s,]+)/i,
        /begin\s+video\s+recording\s+(?<outputPath>[^\s,]+)/i
      ],
      description: 'Starts video recording of the simulator',
      requiredParameters: ['outputPath'],
      optionalParameters: ['sessionId'],
      examples: [
        'grabar video /ruta/video.mp4',
        'record video /tmp/captura.mp4',
        'iniciar grabación de video /ruta/salida.mp4',
        'record video /path/video.mp4',
        'start recording video /path/output.mp4'
      ],
      parameterExtractors: {
        outputPath: (match) => match.groups?.outputPath?.trim()
      }
    },
    {
      command: 'stop recording',
      patterns: [
        /detener\s+grabación(\s+de\s+video)?/i,
        /parar\s+grabación(\s+de\s+video)?/i,
        /stop\s+recording/i,
        /end\s+recording/i,
        /stop\s+video\s+recording/i
      ],
      description: 'Stops video recording of the simulator',
      requiredParameters: [],
      optionalParameters: ['recordingId', 'sessionId'],
      examples: [
        'detener grabación',
        'parar grabación de video',
        'stop recording',
        'end recording',
        'stop video recording'
      ],
      parameterExtractors: {}
    },
    {
      command: 'get logs',
      patterns: [
        /obtener\s+logs(\s+de\s+(?<bundleId>[^\s,]+))?/i,
        /mostrar\s+logs(\s+de\s+(?<bundleId>[^\s,]+))?/i,
        /get\s+logs(\s+for\s+(?<bundleId>[^\s,]+))?/i,
        /show\s+logs(\s+for\s+(?<bundleId>[^\s,]+))?/i,
        /display\s+logs(\s+for\s+(?<bundleId>[^\s,]+))?/i
      ],
      description: 'Gets system logs or logs from a specific application',
      requiredParameters: [],
      optionalParameters: ['bundleId', 'limit', 'sessionId'],
      examples: [
        'obtener logs',
        'mostrar logs de com.example.app',
        'get logs for com.apple.mobilesafari',
        'show logs',
        'display logs for com.example.app'
      ],
      parameterExtractors: {
        bundleId: (match) => match.groups?.bundleId?.trim()
      }
    }
  ];
}
