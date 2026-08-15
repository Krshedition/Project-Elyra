import { validateAction } from './validator';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execAsync = promisify(exec);

function expandEnvVars(filepath: string | undefined): string | undefined {
  if (!filepath) return filepath;
  return filepath.replace(/%([^%]+)%/g, (_, n) => process.env[n] || '');
}

// Native require is used below
let automation: any;
try {
  automation = require('../build/Release/elyra_automation.node');
} catch (e) {
  console.error("Failed to load native addon", e);
}

// Global queue to prevent overlapping keystroke injection
let typeQueue = Promise.resolve<any>(true);

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
      const res = await automation.launchApp(args.appName);
      // Wait 1.5 seconds for the app window to fully render and grab focus
      await new Promise(r => setTimeout(r, 1500));
      return res;

    case 'close_app':
      if (!args.appName) {
        throw new Error("appName is required to close app");
      }
      try {
        // Use PowerShell for robust, case-insensitive substring matching on both Window Title and Process Name
        const psCommand = `Get-Process | Where-Object { $_.MainWindowTitle -like '*${args.appName}*' -or $_.Name -like '*${args.appName}*' } | ForEach-Object { $_.CloseMainWindow() }`;
        await execAsync(`powershell -Command "${psCommand}"`);
        
        // Fallback: forcefully kill it after 2 seconds if it refuses to close gracefully
        setTimeout(() => {
          exec(`powershell -Command "Stop-Process -Name '*${args.appName}*' -Force -ErrorAction SilentlyContinue"`, () => {});
        }, 2000);
        
        return true;
      } catch (e: any) {
        throw new Error(`Failed to close app via PowerShell: ${e.message}`);
      }

    case 'type_text':
      if (!args.appName || !args.text) {
        throw new Error("appName and text are strictly required by the Native C++ Addon to type text");
      }
      const p = typeQueue.then(() => automation.injectText(args.appName, args.text));
      // Ensure the global queue always recovers even if this specific typing action fails
      typeQueue = p.catch(() => {});
      return p;

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
