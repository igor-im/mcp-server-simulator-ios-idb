// SPDX-FileCopyrightText: © 2025 Industria de Diseño Textil S.A. INDITEX
// SPDX-License-Identifier: Apache-2.0

import { ParseResult } from '../parser/interfaces/IParser.js';
import { 
  CommandType, 
  IOrchestratorCommand,
  CommandFactory
} from '../orchestrator/interfaces/IOrchestratorCommand.js';

/**
 * Adapter that converts parser results into orchestrator commands
 */
export class ParserToOrchestrator {
  private commandFactory: CommandFactory;
  private commandMappings: Record<string, CommandType>;

  /**
   * Constructor
   * @param commandFactory Command factory to create IOrchestratorCommand instances
   */
  constructor(commandFactory: CommandFactory) {
    this.commandFactory = commandFactory;
    
    // Mapping natural language commands to CommandType
    this.commandMappings = {
      // Simulator management commands (Spanish)
      'crear sesión': CommandType.CREATE_SIMULATOR_SESSION,
      'crear simulador': CommandType.CREATE_SIMULATOR_SESSION,
      'iniciar simulador': CommandType.CREATE_SIMULATOR_SESSION,
      'terminar sesión': CommandType.TERMINATE_SIMULATOR_SESSION,
      'cerrar simulador': CommandType.TERMINATE_SIMULATOR_SESSION,
      'listar simuladores': CommandType.LIST_AVAILABLE_SIMULATORS,
      'mostrar simuladores': CommandType.LIST_AVAILABLE_SIMULATORS,
      'listar simuladores arrancados': CommandType.LIST_BOOTED_SIMULATORS,
      'arrancar simulador': CommandType.BOOT_SIMULATOR,
      'apagar simulador': CommandType.SHUTDOWN_SIMULATOR,
      
      // Simulator management commands (English)
      'create session': CommandType.CREATE_SIMULATOR_SESSION,
      'start simulator': CommandType.CREATE_SIMULATOR_SESSION,
      'launch simulator': CommandType.CREATE_SIMULATOR_SESSION,
      'end session': CommandType.TERMINATE_SIMULATOR_SESSION,
      'terminate session': CommandType.TERMINATE_SIMULATOR_SESSION,
      'close simulator': CommandType.TERMINATE_SIMULATOR_SESSION,
      'list simulators': CommandType.LIST_AVAILABLE_SIMULATORS,
      'show simulators': CommandType.LIST_AVAILABLE_SIMULATORS,
      'list booted simulators': CommandType.LIST_BOOTED_SIMULATORS,
      'show running simulators': CommandType.LIST_BOOTED_SIMULATORS,
      'boot simulator': CommandType.BOOT_SIMULATOR,
      'shutdown simulator': CommandType.SHUTDOWN_SIMULATOR,
      
      // Application management commands (Spanish)
      'instalar app': CommandType.INSTALL_APP,
      'instalar aplicación': CommandType.INSTALL_APP,
      'lanzar app': CommandType.LAUNCH_APP,
      'abrir app': CommandType.LAUNCH_APP,
      'iniciar app': CommandType.LAUNCH_APP,
      'cerrar app': CommandType.TERMINATE_APP,
      'terminar app': CommandType.TERMINATE_APP,
      'desinstalar app': CommandType.UNINSTALL_APP,
      'eliminar app': CommandType.UNINSTALL_APP,
      'borrar app': CommandType.UNINSTALL_APP,
      'listar apps': CommandType.LIST_APPS,
      'mostrar apps': CommandType.LIST_APPS,
      
      // Application management commands (English)
      'install app': CommandType.INSTALL_APP,
      'launch app': CommandType.LAUNCH_APP,
      'terminate app': CommandType.TERMINATE_APP,
      'uninstall app': CommandType.UNINSTALL_APP,
      'remove app': CommandType.UNINSTALL_APP,
      'delete app': CommandType.UNINSTALL_APP,
      'list apps': CommandType.LIST_APPS,
      'show apps': CommandType.LIST_APPS,
      
      // UI interaction commands (Spanish)
      'tocar': CommandType.TAP,
      'pulsar': CommandType.TAP,
      'deslizar': CommandType.SWIPE,
      
      // UI interaction commands (English)
      'tap': CommandType.TAP,
      'swipe': CommandType.SWIPE,
      'press device button': CommandType.PRESS_DEVICE_BUTTON,
      'input text': CommandType.INPUT_TEXT,
      'press key': CommandType.PRESS_KEY,
      'press key sequence': CommandType.PRESS_KEY_SEQUENCE,
      
      // Accessibility commands (Spanish)
      'describir elementos': CommandType.DESCRIBE_ELEMENTS,
      'describir todos los elementos': CommandType.DESCRIBE_ELEMENTS,
      'describir punto': CommandType.DESCRIBE_POINT,
      
      // Accessibility commands (English)
      'describe elements': CommandType.DESCRIBE_ELEMENTS,
      'describe all elements': CommandType.DESCRIBE_ELEMENTS,
      'describe point': CommandType.DESCRIBE_POINT,
      
      // Screenshot and logs commands (Spanish)
      'capturar pantalla': CommandType.CAPTURE_SCREEN,
      'captura': CommandType.CAPTURE_SCREEN,
      'logs del sistema': CommandType.GET_SYSTEM_LOGS,
      'logs de app': CommandType.GET_APP_LOGS,
      'grabar video': CommandType.RECORD_VIDEO,
      'detener grabación': CommandType.STOP_RECORDING,
      
      // Screenshot and logs commands (English)
      'take screenshot': CommandType.CAPTURE_SCREEN,
      'capture screen': CommandType.CAPTURE_SCREEN,
      'screenshot': CommandType.CAPTURE_SCREEN,
      'logs': CommandType.GET_LOGS,
      'get logs': CommandType.GET_LOGS,
      'record video': CommandType.RECORD_VIDEO,
      'stop recording': CommandType.STOP_RECORDING,
      
      // Debug commands (Spanish)
      'iniciar debug': CommandType.START_DEBUG,
      'parar debug': CommandType.STOP_DEBUG,
      'estado debug': CommandType.DEBUG_STATUS,
      'listar crash logs': CommandType.LIST_CRASH_LOGS,
      'mostrar crash log': CommandType.SHOW_CRASH_LOG,
      'eliminar crash logs': CommandType.DELETE_CRASH_LOGS,
      
      // Debug commands (English)
      'start debug': CommandType.START_DEBUG,
      'stop debug': CommandType.STOP_DEBUG,
      'debug status': CommandType.DEBUG_STATUS,
      'list crash logs': CommandType.LIST_CRASH_LOGS,
      'show crash log': CommandType.SHOW_CRASH_LOG,
      'delete crash logs': CommandType.DELETE_CRASH_LOGS,
      
      // Misc commands (Spanish)
      'instalar dylib': CommandType.INSTALL_DYLIB,
      'abrir url': CommandType.OPEN_URL,
      'limpiar keychain': CommandType.CLEAR_KEYCHAIN,
      'establecer ubicación': CommandType.SET_LOCATION,
      'añadir media': CommandType.ADD_MEDIA,
      'aprobar permisos': CommandType.APPROVE_PERMISSIONS,
      'actualizar contactos': CommandType.UPDATE_CONTACTS,
      'enfocar simulador': CommandType.FOCUS_SIMULATOR,
      
      // Misc commands (English)
      'install dylib': CommandType.INSTALL_DYLIB,
      'open url': CommandType.OPEN_URL,
      'clear keychain': CommandType.CLEAR_KEYCHAIN,
      'set location': CommandType.SET_LOCATION,
      'add media': CommandType.ADD_MEDIA,
      'approve permissions': CommandType.APPROVE_PERMISSIONS,
      'update contacts': CommandType.UPDATE_CONTACTS,
      'focus simulator': CommandType.FOCUS_SIMULATOR,
      
      // Verification commands
      'verificar simulador': CommandType.IS_SIMULATOR_BOOTED,
      'comprobar simulador': CommandType.IS_SIMULATOR_BOOTED,
      'verificar app': CommandType.IS_APP_INSTALLED,
      'comprobar app': CommandType.IS_APP_INSTALLED
    };
  }

  /**
   * Converts a parser result into an orchestrator command
   * @param parseResult Parser result
   * @returns Orchestrator command
   */
  public convertToCommand(parseResult: ParseResult): IOrchestratorCommand {
    // Determine command type
    const commandType = this.mapToCommandType(parseResult.command);
    
    // Convert parameters
    const parameters = this.convertParameters(commandType, parseResult.parameters);
    
    // Create and return command
    return this.commandFactory.createCommand(
      commandType,
      parameters,
      `Command generated from: "${parseResult.originalText}"`
    );
  }

  /**
   * Maps a natural language command to a CommandType
   * @param naturalCommand Natural language command
   * @returns Corresponding CommandType
   */
  private mapToCommandType(naturalCommand: string): CommandType {
    const lowerCommand = naturalCommand.toLowerCase();
    
    // Look for exact match
    if (this.commandMappings[lowerCommand]) {
      return this.commandMappings[lowerCommand];
    }
    
    // Look for partial match
    for (const [key, value] of Object.entries(this.commandMappings)) {
      if (lowerCommand.includes(key)) {
        return value;
      }
    }
    
    // If no match found, throw error
    throw new Error(`Could not map command "${naturalCommand}" to a CommandType`);
  }

  /**
   * Converts parser parameters to orchestrator parameters
   * @param commandType Command type
   * @param parserParameters Parser parameters
   * @returns Orchestrator parameters
   */
  private convertParameters(
    commandType: CommandType, 
    parserParameters: Record<string, any>
  ): Record<string, any> {
    // Clone parameters to avoid modifying the original
    const parameters = { ...parserParameters };
    
    // Convert specific parameters based on command type
    switch (commandType) {
      case CommandType.TAP:
        // Ensure x and y are numbers
        if (parameters.x !== undefined) {
          parameters.x = Number(parameters.x);
        }
        if (parameters.y !== undefined) {
          parameters.y = Number(parameters.y);
        }
        break;
        
      case CommandType.SWIPE:
        // Ensure coordinates are numbers
        if (parameters.startX !== undefined) {
          parameters.startX = Number(parameters.startX);
        }
        if (parameters.startY !== undefined) {
          parameters.startY = Number(parameters.startY);
        }
        if (parameters.endX !== undefined) {
          parameters.endX = Number(parameters.endX);
        }
        if (parameters.endY !== undefined) {
          parameters.endY = Number(parameters.endY);
        }
        if (parameters.duration !== undefined) {
          parameters.duration = Number(parameters.duration);
        }
        break;
        
      case CommandType.CREATE_SIMULATOR_SESSION:
        // Convert autoboot to boolean if it's a string
        if (typeof parameters.autoboot === 'string') {
          parameters.autoboot = parameters.autoboot.toLowerCase() === 'true';
        }
        break;
    }
    
    return parameters;
  }
}
