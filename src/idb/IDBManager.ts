// SPDX-FileCopyrightText: © 2025 Industria de Diseño Textil S.A. INDITEX
// SPDX-License-Identifier: Apache-2.0

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { 
  IIDBManager, 
  SimulatorInfo, 
  AppInfo, 
  SessionConfig,
  ButtonType,
  AccessibilityInfo,
  CrashLogInfo
} from './interfaces/IIDBManager.js';

const execAsync = promisify(exec);

/**
 * IDB manager implementation for interacting with iOS simulators
 */
export class IDBManager implements IIDBManager {
  private sessions: Map<string, string> = new Map(); // sessionId -> udid
  private sessionCounter: number = 0;

  private async executeCommand(command: string): Promise<string> {
    try {
      const idbPath = '/Users/igor/Documents/tools/mcp-server-simulator-ios-idb/venv/bin/idb';
      const fullCommand = command.replace(/^idb/, idbPath);
      console.log(`Executing command: ${fullCommand}`);
      const { stdout } = await execAsync(fullCommand);
      return stdout.trim();
    } catch (error: any) {
      const idbPath = '/Users/igor/Documents/tools/mcp-server-simulator-ios-idb/venv/bin/idb';
      console.error(`Error executing idb command: ${command}`);
      console.error(`Full command was: ${command.replace(/^idb/, idbPath)}`);
      console.error(error.message);
      throw new Error(`Error executing idb command: ${error.message}`);
    }
  }

  private async verifyIDBAvailability(): Promise<void> {
    try {
      await this.executeCommand('idb --help');
    } catch (error) {
      throw new Error('idb is not installed or not available in PATH. Make sure idb-companion and fb-idb are properly installed.');
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${this.sessionCounter++}`;
  }

  async createSimulatorSession(config?: SessionConfig): Promise<string> {
    await this.verifyIDBAvailability();
    let udid: string;

    if (config?.deviceName) {
      const simulators = await this.listAvailableSimulators();
      const simulator = simulators.find(sim => 
        sim.name === config.deviceName && 
        (!config.platformVersion || sim.os.includes(config.platformVersion))
      );

      if (!simulator) {
        throw new Error(`No simulator found with name ${config.deviceName}`);
      }
      udid = simulator.udid;
    } else {
      const simulators = await this.listAvailableSimulators();
      if (simulators.length === 0) {
        throw new Error('No available simulators found');
      }
      udid = simulators[0].udid;
    }

    if (config?.autoboot !== false) {
      await this.bootSimulatorByUDID(udid);
    }

    const sessionId = this.generateSessionId();
    this.sessions.set(sessionId, udid);
    return sessionId;
  }

  async terminateSimulatorSession(sessionId: string): Promise<void> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    this.sessions.delete(sessionId);
  }

  async listAvailableSimulators(): Promise<SimulatorInfo[]> {
    await this.verifyIDBAvailability();
    const output = await this.executeCommand('xcrun simctl list devices --json');
    const data = JSON.parse(output);
    const simulators: SimulatorInfo[] = [];
    
    Object.entries(data.devices).forEach(([runtimeName, devices]: [string, any]) => {
      devices.forEach((device: any) => {
        simulators.push({
          udid: device.udid,
          name: device.name,
          state: device.state === 'Booted' ? 'Booted' : 
                 device.state === 'Shutdown' ? 'Shutdown' : 'Unknown',
          os: runtimeName.replace('com.apple.CoreSimulator.SimRuntime.', ''),
          deviceType: device.deviceTypeIdentifier || 'Unknown'
        });
      });
    });
    
    return simulators;
  }

  async listBootedSimulators(): Promise<SimulatorInfo[]> {
    const simulators = await this.listAvailableSimulators();
    return simulators.filter(sim => sim.state === 'Booted');
  }

  async bootSimulatorByUDID(udid: string): Promise<void> {
    await this.verifyIDBAvailability();
    const simulators = await this.listBootedSimulators();
    if (simulators.some(sim => sim.udid === udid)) {
      return;
    }
    
    await this.executeCommand(`xcrun simctl boot ${udid}`);
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      try {
        const booted = await this.listBootedSimulators();
        if (booted.some(sim => sim.udid === udid)) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return;
        }
      } catch (error) {
        // Ignore errors during boot
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    throw new Error(`Timeout waiting for simulator ${udid} to boot`);
  }

  async shutdownSimulator(sessionId: string): Promise<void> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    await this.shutdownSimulatorByUDID(udid);
  }

  async shutdownSimulatorByUDID(udid: string): Promise<void> {
    await this.verifyIDBAvailability();
    await this.executeCommand(`xcrun simctl shutdown ${udid}`);
  }

  async installApp(sessionId: string, appPath: string): Promise<AppInfo> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    if (!fs.existsSync(appPath)) {
      throw new Error(`File does not exist: ${appPath}`);
    }
    
    await this.executeCommand(`idb install --udid ${udid} ${appPath}`);
    
    const appName = path.basename(appPath, path.extname(appPath));
    const bundleId = `com.example.${appName}`;
    
    return {
      bundleId,
      name: appName,
      installedPath: appPath
    };
  }

  async launchApp(sessionId: string, bundleId: string): Promise<void> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    console.log(`Launching app with bundleId: "${bundleId}" on udid: ${udid}`);
    await this.executeCommand(`idb launch --udid ${udid} "${bundleId}"`);
  }

  async terminateApp(sessionId: string, bundleId: string): Promise<void> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    await this.executeCommand(`idb terminate --udid ${udid} ${bundleId}`);
  }

  async tap(sessionId: string, x: number, y: number): Promise<void> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    await this.executeCommand(`idb ui tap ${x} ${y} --udid ${udid}`);
  }

  async swipe(
    sessionId: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    duration: number = 100
  ): Promise<void> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    await this.executeCommand(
      `idb ui swipe ${startX} ${startY} ${endX} ${endY} ${duration} --udid ${udid}`
    );
  }

  async takeScreenshot(sessionId: string, outputPath?: string): Promise<Buffer | string> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    const tempPath = outputPath || path.join(process.cwd(), `screenshot_${Date.now()}.png`);
    await this.executeCommand(`idb screenshot --udid ${udid} ${tempPath}`);
    
    if (outputPath) {
      return outputPath;
    } else {
      const buffer = fs.readFileSync(tempPath);
      fs.unlinkSync(tempPath);
      return buffer;
    }
  }

  async getSystemLogs(sessionId: string, options?: { 
    bundle?: string;
    since?: Date;
    limit?: number;
  }): Promise<string> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    let command = `idb log --udid ${udid}`;
    if (options?.bundle) command += ` --bundle ${options.bundle}`;
    if (options?.limit) command += ` --limit ${options.limit}`;
    return this.executeCommand(`${command} --timeout 5`);
  }

  async getAppLogs(sessionId: string, bundleId: string): Promise<string> {
    return this.getSystemLogs(sessionId, { bundle: bundleId });
  }

  async listSimulatorSessions(): Promise<string[]> {
    return Array.from(this.sessions.keys());
  }

  async isSimulatorBooted(sessionId: string): Promise<boolean> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    const simulators = await this.listBootedSimulators();
    return simulators.some(sim => sim.udid === udid);
  }

  async isAppInstalled(sessionId: string, bundleId: string): Promise<boolean> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    try {
      await this.executeCommand(`idb list-apps --udid ${udid} | grep "${bundleId}"`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async focusSimulator(sessionId: string): Promise<void> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    await this.executeCommand(`idb focus --udid ${udid}`);
  }

  async uninstallApp(sessionId: string, bundleId: string): Promise<void> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    await this.executeCommand(`idb uninstall --udid ${udid} ${bundleId}`);
  }

  async listApps(sessionId: string): Promise<AppInfo[]> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    const output = await this.executeCommand(`idb list-apps --udid ${udid} --json`);
    
    // Parse JSONL format (each line is a separate JSON object)
    const lines = output.split('\n').filter(line => line.trim().length > 0);
    const apps: any[] = [];
    
    for (const line of lines) {
      try {
        const app = JSON.parse(line.trim());
        apps.push(app);
      } catch (error) {
        // Skip invalid lines
        continue;
      }
    }
    return apps.map((app: any) => ({
      bundleId: app.bundle_id,
      name: app.name || app.bundle_id,
      installedPath: app.install_path
    }));
  }

  async pressButton(sessionId: string, button: ButtonType, duration?: number): Promise<void> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    let command = `idb ui button ${button} --udid ${udid}`;
    if (duration) command += ` --duration ${duration}`;
    await this.executeCommand(command);
  }

  async inputText(sessionId: string, text: string): Promise<void> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    const escapedText = text.replace(/"/g, '\\"');
    await this.executeCommand(`idb ui text "${escapedText}" --udid ${udid}`);
  }

  async pressKey(sessionId: string, keyCode: number, duration?: number): Promise<void> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    let command = `idb ui key ${keyCode} --udid ${udid}`;
    if (duration) command += ` --duration ${duration}`;
    await this.executeCommand(command);
  }

  async pressKeySequence(sessionId: string, keyCodes: number[]): Promise<void> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    const keyCodesStr = keyCodes.join(' ');
    await this.executeCommand(`idb ui key-sequence ${keyCodesStr} --udid ${udid}`);
  }

  async getDebugServerStatus(sessionId: string): Promise<{ running: boolean; port?: number; bundleId?: string; }> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    try {
      const output = await this.executeCommand(`idb debugserver status --udid ${udid}`);
      if (output.includes("No debug server running")) {
        return { running: false };
      }
      const portMatch = output.match(/port: (\d+)/);
      const bundleMatch = output.match(/bundle_id: ([^\s]+)/);
      return {
        running: true,
        port: portMatch ? parseInt(portMatch[1], 10) : undefined,
        bundleId: bundleMatch ? bundleMatch[1] : undefined
      };
    } catch (error) {
      return { running: false };
    }
  }

  async listCrashLogs(sessionId: string, options?: {
    bundleId?: string;
    before?: Date;
    since?: Date;
  }): Promise<CrashLogInfo[]> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    let command = `idb crash list --udid ${udid}`;
    if (options?.bundleId) command += ` --bundle-id ${options.bundleId}`;
    if (options?.before) command += ` --before ${options.before.toISOString()}`;
    if (options?.since) command += ` --since ${options.since.toISOString()}`;
    const output = await this.executeCommand(command);
    const lines = output.split('\n').filter(Boolean);
    return lines.map(line => {
      const parts = line.split(' - ');
      return {
        name: parts[0].trim(),
        bundleId: parts[1]?.trim(),
        date: new Date(parts[2]?.trim() || Date.now()),
        path: parts[3]?.trim() || ''
      };
    });
  }

  async getCrashLog(sessionId: string, crashName: string): Promise<string> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return this.executeCommand(`idb crash show --udid ${udid} ${crashName}`);
  }

  async deleteCrashLogs(sessionId: string, options: {
    crashNames?: string[];
    bundleId?: string;
    before?: Date;
    since?: Date;
    all?: boolean;
  }): Promise<void> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    if (options.all) {
      await this.executeCommand(`idb crash delete --udid ${udid} --all`);
      return;
    }
    if (options.crashNames?.length) {
      for (const crashName of options.crashNames) {
        await this.executeCommand(`idb crash delete --udid ${udid} ${crashName}`);
      }
      return;
    }
    let command = `idb crash delete --udid ${udid}`;
    if (options.bundleId) command += ` --bundle-id ${options.bundleId}`;
    if (options.before) command += ` --before ${options.before.toISOString()}`;
    if (options.since) command += ` --since ${options.since.toISOString()}`;
    await this.executeCommand(command);
  }

  async installDylib(sessionId: string, dylibPath: string): Promise<void> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    await this.executeCommand(`idb dylib install --udid ${udid} ${dylibPath}`);
  }

  async openUrl(sessionId: string, url: string): Promise<void> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    await this.executeCommand(`idb open --udid ${udid} ${url}`);
  }

  async clearKeychain(sessionId: string): Promise<void> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    await this.executeCommand(`idb clear_keychain --udid ${udid}`);
  }

  async setLocation(sessionId: string, latitude: number, longitude: number): Promise<void> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    await this.executeCommand(`idb set_location --udid ${udid} ${latitude} ${longitude}`);
  }

  async addMedia(sessionId: string, mediaPaths: string[]): Promise<void> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    const mediaPathsStr = mediaPaths.join(' ');
    await this.executeCommand(`idb add-media --udid ${udid} ${mediaPathsStr}`);
  }

  async approvePermissions(sessionId: string, bundleId: string, permissions: string[]): Promise<void> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    const permissionsStr = permissions.join(' ');
    await this.executeCommand(`idb approve --udid ${udid} ${bundleId} ${permissionsStr}`);
  }

  async updateContacts(sessionId: string, dbPath: string): Promise<void> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    await this.executeCommand(`idb contacts update --udid ${udid} ${dbPath}`);
  }

  async describeAllElements(sessionId: string): Promise<AccessibilityInfo[]> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    const output = await this.executeCommand(`idb ui describe-all --udid ${udid}`);
    const rawElements = JSON.parse(output);
    
    // Convert raw idb format to our AccessibilityInfo format
    return rawElements.map((element: any) => ({
      identifier: element.AXUniqueId,
      label: element.AXLabel,
      frame: {
        x: element.frame?.x || 0,
        y: element.frame?.y || 0,
        width: element.frame?.width || 0,
        height: element.frame?.height || 0
      },
      type: element.type,
      value: element.AXValue
    }));
  }

  async describePointElement(sessionId: string, x: number, y: number): Promise<AccessibilityInfo | null> {
    const udid = this.sessions.get(sessionId);
    if (!udid) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    try {
      const output = await this.executeCommand(`idb ui describe-point --udid ${udid} ${x} ${y}`);
      const element = JSON.parse(output);
      
      if (!element) {
        return null;
      }
      
      // Convert raw idb format to our AccessibilityInfo format
      return {
        identifier: element.AXUniqueId,
        label: element.AXLabel,
        frame: {
          x: element.frame?.x || 0,
          y: element.frame?.y || 0,
          width: element.frame?.width || 0,
          height: element.frame?.height || 0
        },
        type: element.type,
        value: element.AXValue
      };
    } catch (error) {
      // No element found at that point
      return null;
    }
  }
}
