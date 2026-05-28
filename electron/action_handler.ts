import { validateAction } from './validator';
import { createRequire } from 'node:module';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execAsync = promisify(exec);

function expandEnvVars(filepath: string | undefined): string | undefined {
  if (!filepath) return filepath;
  return filepath.replace(/%([^%]+)%/g, (_, n) => process.env[n] || '');
}

const require = createRequire(import.meta.url);
let automation: any;
try {
  automation = require('../build/Release/elyra_automation.node');
} catch (e) {
  console.error("Failed to load native addon", e);
}

export async function handleDesktopAction(actionName: string, args: any) {
  // 1. Validate the action
  const validation = validateAction(actionName, args);
  if (!validation.valid) {
    throw new Error(`Action Validation Failed: ${validation.error}`);
  }

  // 2. Execute the action
  console.log(`[ActionHandler] Executing ${actionName}`, args);

  if (!automation) {
    throw new Error("Native automation module not loaded");
  }

  switch (actionName) {
    case 'open_app':
      return await automation.launchApp(args.appName);

    case 'close_app':
      if (!args.appName) {
        throw new Error("appName is required by the Native C++ Addon to close app");
      }
      return await automation.closeApp(args.appName);

    case 'type_text':
      if (!args.appName) {
        throw new Error("appName is required by the Native C++ Addon to type text");
      }
      return await automation.injectText(args.appName, args.text);

    case 'press_key':
      if (!args.key) {
        throw new Error("key is required by the Native C++ Addon to press key");
      }
      return await automation.pressKey(args.appName || "", args.key);

    case 'system_action':
      return await automation.systemAction(args.action);

    case 'get_running_processes':
      return await automation.getRunningProcesses();

    case 'kill_process':
      return await automation.killProcess(args.processName);

    case 'get_focused_window':
      return await automation.getFocusedWindow();

    case 'get_system_info':
      return await automation.getSystemInfoStats();

    case 'get_audio_devices':
      return await automation.getAudioDevices();

    case 'set_volume':
      return await automation.setVolume(args.level);

    case 'set_brightness':
      return await automation.setBrightness(args.level);

    case 'toggle_wifi':
      return await automation.toggleWiFi(args.enable);

    case 'toggle_bluetooth':
      return await automation.toggleBluetooth(args.enable);

    case 'set_display_resolution':
      return await automation.setDisplayResolution(args.width, args.height);

    case 'set_default_audio_device': {
      try {
        const nircmdPath = path.join(process.cwd(), 'bin', 'nircmdc.exe');
        // nircmd expects the exact name or a substring
        await execAsync(`"${nircmdPath}" setdefaultsounddevice "${args.deviceName}" 0`); // 0 for Console
        await execAsync(`"${nircmdPath}" setdefaultsounddevice "${args.deviceName}" 1`); // 1 for Multimedia
        await execAsync(`"${nircmdPath}" setdefaultsounddevice "${args.deviceName}" 2`); // 2 for Communications
        return true;
      } catch (e: any) {
        throw new Error(`Failed to set audio device via nircmd: ${e.message}`);
      }
    }

    case 'file_system_action':
      const expandedPath = expandEnvVars(args.path);
      const expandedSrc = expandEnvVars(args.src);
      const expandedDest = expandEnvVars(args.dest);

      if (args.action === 'delete' || args.action === 'overwrite') {
        if (!args.confirmed) {
          return { 
            requiresConfirmation: true, 
            message: `I'm about to ${args.action} ${expandedPath || expandedDest}. Say confirm to proceed.` 
          };
        }
      }
      
      switch (args.action) {
        case 'create_dir': 
          return await automation.createDir(expandedPath);
        case 'delete': 
          return await automation.deleteItem(expandedPath);
        case 'move': 
          return await automation.moveItem(expandedSrc, expandedDest);
        case 'copy': 
          return await automation.copyItem(expandedSrc, expandedDest);
        case 'read': 
          return await automation.readFileContent(expandedPath);
        case 'write': 
        case 'overwrite':
          return await automation.writeFileContent(expandedPath, args.content);
        default:
          throw new Error("Unknown file system action");
      }

    case 'read_clipboard':
      return await automation.readClipboard();
    
    case 'write_clipboard':
      return await automation.writeClipboard(args.text);

    default:
      throw new Error(`Execution logic for ${actionName} not implemented`);
  }
}
