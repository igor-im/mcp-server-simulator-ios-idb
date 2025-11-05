// SPDX-FileCopyrightText: © 2025 Industria de Diseño Textil S.A. INDITEX
// SPDX-License-Identifier: Apache-2.0

import { 
  CommandType, 
  IOrchestratorCommand, 
  CommandResult 
} from '../orchestrator/interfaces/IOrchestratorCommand.js';
import { IIDBManager } from '../idb/interfaces/IIDBManager.js';

/**
 * Adapter that converts orchestrator commands into IDBManager calls
 */
export class OrchestratorToIDB {
  private idbManager: IIDBManager;

  /**
   * Constructor
   * @param idbManager IDBManager instance to execute commands
   */
  constructor(idbManager: IIDBManager) {
    this.idbManager = idbManager;
  }

  /**
   * Executes an orchestrator command using IDBManager
   * @param command Command to execute
   * @param sessionId Simulator session ID (optional)
   * @returns Execution result
   */
  public async executeCommand(command: IOrchestratorCommand, sessionId?: string): Promise<CommandResult> {
    try {
      const startTime = Date.now();
      let result: any;

      // Execute command based on its type
      switch (command.type) {
        // Simulator management commands
        case CommandType.CREATE_SIMULATOR_SESSION:
          result = await this.idbManager.createSimulatorSession(command.parameters);
          break;

        case CommandType.TERMINATE_SIMULATOR_SESSION:
          await this.idbManager.terminateSimulatorSession(
            command.parameters.sessionId || sessionId || ''
          );
          result = { sessionId: command.parameters.sessionId || sessionId };
          break;

        case CommandType.LIST_AVAILABLE_SIMULATORS:
          result = await this.idbManager.listAvailableSimulators();
          break;

        case CommandType.LIST_BOOTED_SIMULATORS:
          result = await this.idbManager.listBootedSimulators();
          break;

        case CommandType.BOOT_SIMULATOR:
          await this.idbManager.bootSimulatorByUDID(command.parameters.udid);
          result = { udid: command.parameters.udid };
          break;

        case CommandType.SHUTDOWN_SIMULATOR:
          if (command.parameters.udid) {
            await this.idbManager.shutdownSimulatorByUDID(command.parameters.udid);
            result = { udid: command.parameters.udid };
          } else {
            await this.idbManager.shutdownSimulator(
              command.parameters.sessionId || sessionId || ''
            );
            result = { sessionId: command.parameters.sessionId || sessionId };
          }
          break;

        // Application management commands
        case CommandType.INSTALL_APP:
          result = await this.idbManager.installApp(
            command.parameters.sessionId || sessionId || '',
            command.parameters.appPath
          );
          break;

        case CommandType.LAUNCH_APP:
          await this.idbManager.launchApp(
            command.parameters.sessionId || sessionId || '',
            command.parameters.bundleId
          );
          result = { bundleId: command.parameters.bundleId };
          break;

        case CommandType.TERMINATE_APP:
          await this.idbManager.terminateApp(
            command.parameters.sessionId || sessionId || '',
            command.parameters.bundleId
          );
          result = { bundleId: command.parameters.bundleId };
          break;

        case CommandType.UNINSTALL_APP:
          if (this.idbManager.uninstallApp) {
            await this.idbManager.uninstallApp(
              command.parameters.sessionId || sessionId || '',
              command.parameters.bundleId
            );
            result = { bundleId: command.parameters.bundleId };
          } else {
            throw new Error('Uninstall app operation not supported');
          }
          break;

        case CommandType.LIST_APPS:
          if (this.idbManager.listApps) {
            result = await this.idbManager.listApps(
              command.parameters.sessionId || sessionId || ''
            );
          } else {
            throw new Error('List apps operation not supported');
          }
          break;

        // UI interaction commands
        case CommandType.TAP:
          await this.idbManager.tap(
            command.parameters.sessionId || sessionId || '',
            command.parameters.x,
            command.parameters.y
          );
          result = { x: command.parameters.x, y: command.parameters.y };
          break;

        case CommandType.SWIPE:
          await this.idbManager.swipe(
            command.parameters.sessionId || sessionId || '',
            command.parameters.startX,
            command.parameters.startY,
            command.parameters.endX,
            command.parameters.endY,
            command.parameters.duration
          );
          result = {
            startX: command.parameters.startX,
            startY: command.parameters.startY,
            endX: command.parameters.endX,
            endY: command.parameters.endY
          };
          break;

        // Screenshot and logging commands
        case CommandType.TAKE_SCREENSHOT:
          result = await this.idbManager.takeScreenshot(
            command.parameters.sessionId || sessionId || '',
            command.parameters.outputPath
          );
          break;

        case CommandType.GET_SYSTEM_LOGS:
          result = await this.idbManager.getSystemLogs(
            command.parameters.sessionId || sessionId || '',
            command.parameters.options
          );
          break;

        case CommandType.GET_APP_LOGS:
          result = await this.idbManager.getAppLogs(
            command.parameters.sessionId || sessionId || '',
            command.parameters.bundleId
          );
          break;

        // Verification commands
        case CommandType.IS_SIMULATOR_BOOTED:
          result = await this.idbManager.isSimulatorBooted(
            command.parameters.sessionId || sessionId || ''
          );
          break;

        case CommandType.IS_APP_INSTALLED:
          result = await this.idbManager.isAppInstalled(
            command.parameters.sessionId || sessionId || '',
            command.parameters.bundleId
          );
          break;

        // Accessibility commands
        case CommandType.DESCRIBE_ELEMENTS:
          if (this.idbManager.describeAllElements) {
            result = await this.idbManager.describeAllElements(
              command.parameters.sessionId || sessionId || ''
            );
          } else {
            throw new Error('Describe elements operation not supported');
          }
          break;

        case CommandType.DESCRIBE_POINT:
          if (this.idbManager.describePointElement) {
            result = await this.idbManager.describePointElement(
              command.parameters.sessionId || sessionId || '',
              command.parameters.x,
              command.parameters.y
            );
          } else {
            throw new Error('Describe point operation not supported');
          }
          break;

        // Capture commands
        case CommandType.CAPTURE_SCREEN:
          if (this.idbManager.takeScreenshot) {
            result = await this.idbManager.takeScreenshot(
              command.parameters.sessionId || sessionId || '',
              command.parameters.outputPath
            );
          } else {
            throw new Error('Capture screen operation not supported');
          }
          break;

        default:
          throw new Error(`Unsupported command type: ${command.type}`);
      }

      // Create and return the result
      return {
        success: true,
        data: result,
        timestamp: Date.now()
      };
    } catch (error: any) {
      // Handle errors
      console.error(`Error executing command ${command.type}:`, error);
      
      // If there's a custom error handler, use it
      if (command.onError) {
        return command.onError(error, { sessionId });
      }
      
      // Return error result
      return {
        success: false,
        error: error.message || 'Unknown error',
        timestamp: Date.now()
      };
    }
  }
}
