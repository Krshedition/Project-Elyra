import { validateAction } from './validator';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

import { dialog, BrowserWindow } from 'electron';

const execAsync = promisify(exec);

function expandEnvVars(filepath: string | undefined): string | undefined {
  if (!filepath) return filepath;
  return filepath.replace(/%([^%]+)%/g, (_, n) => process.env[n] || '');
}

async function sendNativeKey(appName: string | undefined, rawKey: string): Promise<boolean> {
  const normKey = (rawKey || '').toLowerCase().trim();

  // Map hotkeys to WScript.Shell SendKeys format
  let sendKeyStr = '';
  if (normKey === 'ctrl+v' || normKey === 'control+v' || normKey === 'paste' || normKey === 'ctrl v') {
    sendKeyStr = '^v';
  } else if (normKey === 'ctrl+c' || normKey === 'control+c' || normKey === 'copy' || normKey === 'ctrl c') {
    sendKeyStr = '^c';
  } else if (normKey === 'ctrl+a' || normKey === 'control+a' || normKey === 'select_all' || normKey === 'ctrl a') {
    sendKeyStr = '^a';
  } else if (normKey === 'ctrl+s' || normKey === 'control+s' || normKey === 'save') {
    sendKeyStr = '^s';
  } else if (normKey === 'ctrl+z' || normKey === 'control+z' || normKey === 'undo') {
    sendKeyStr = '^z';
  } else if (normKey === 'ctrl+x' || normKey === 'control+x') {
    sendKeyStr = '^x';
  } else if (normKey === 'ctrl+w' || normKey === 'control+w') {
    sendKeyStr = '^w';
  } else if (normKey === 'alt+f4' || normKey === 'alt f4') {
    sendKeyStr = '%{F4}';
  } else if (normKey === 'enter' || normKey === 'return') {
    sendKeyStr = '{ENTER}';
  } else if (normKey === 'tab') {
    sendKeyStr = '{TAB}';
  } else if (normKey === 'escape' || normKey === 'esc') {
    sendKeyStr = '{ESC}';
  } else if (normKey === 'backspace' || normKey === 'bs') {
    sendKeyStr = '{BS}';
  } else if (normKey === 'delete' || normKey === 'del') {
    sendKeyStr = '{DEL}';
  } else if (normKey === 'space') {
    sendKeyStr = ' ';
  } else if (normKey.startsWith('ctrl+') || normKey.startsWith('control+')) {
    const letter = normKey.split('+')[1]?.trim() || '';
    sendKeyStr = `^${letter}`;
  } else if (normKey.startsWith('alt+')) {
    const letter = normKey.split('+')[1]?.trim() || '';
    sendKeyStr = `%{${letter.toUpperCase()}}`;
  } else {
    sendKeyStr = rawKey;
  }

  try {
    const targetApp = (appName || '').trim().replace('.exe', '');
    let activateScript = '';
    if (targetApp) {
      // Find process by name and activate using PID for 100% reliable focus on Windows 11
      activateScript = `$p = Get-Process -Name '${targetApp}' -ErrorAction SilentlyContinue | Select-Object -First 1; if ($p) { $w.AppActivate($p.Id) } else { $w.AppActivate('${targetApp}') }; Start-Sleep -Milliseconds 250; `;
    }

    const psCmd = `powershell -NoProfile -NonInteractive -Command "$w = New-Object -ComObject WScript.Shell; ${activateScript}$w.SendKeys('${sendKeyStr}')"`;
    await execAsync(psCmd);
    return true;
  } catch (err: any) {
    console.warn('[ActionHandler] PowerShell SendKeys failed, falling back to C++ addon:', err.message);
    if (automation && typeof automation.pressKey === 'function') {
      return await automation.pressKey(appName || "", rawKey);
    }
    return false;
  }
}


import fs from 'node:fs';

// Native require with fallback paths for production packaging
let automation: any;
const possibleAddonPaths = [
  path.join(__dirname, '..', 'build', 'Release', 'elyra_automation.node'),
  path.join((process as any).resourcesPath || '', 'build', 'Release', 'elyra_automation.node'),
  path.join((process as any).resourcesPath || '', 'app.asar.unpacked', 'build', 'Release', 'elyra_automation.node'),
  path.join(process.cwd(), 'build', 'Release', 'elyra_automation.node')
];

for (const p of possibleAddonPaths) {
  try {
    if (fs.existsSync(p)) {
      automation = require(p);
      console.log(`[ActionHandler] Successfully loaded native addon from: ${p}`);
      break;
    }
  } catch (err) {
    // Continue searching
  }
}

if (!automation) {
  try {
    automation = require('../build/Release/elyra_automation.node');
  } catch (e) {
    console.error("[ActionHandler] Failed to load native addon from all paths", e);
  }
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
        throw new Error("appName and text are strictly required to type text");
      }
      const p = typeQueue.then(async () => {
        const textToType = args.text;
        const app = args.appName.trim().replace('.exe', '');
        
        let injectSuccess = false;
        if (textToType.length < 50 && automation && typeof automation.injectText === 'function') {
          try {
            injectSuccess = await automation.injectText(app, textToType);
          } catch (e) {
            injectSuccess = false;
          }
        }

        // If injectText returned false (e.g. Windows 11 Notepad tab title) or text is long, use clipboard paste
        if (!injectSuccess) {
          try {
            if (automation && typeof automation.writeClipboard === 'function') {
              await automation.writeClipboard(textToType);
            }
            await sendNativeKey(app, 'ctrl+v');
            return true;
          } catch (e: any) {
            console.error('[ActionHandler] Clipboard fallback paste failed:', e);
            throw new Error(`Failed to type text into ${app}: ${e.message}`);
          }
        }
        return true;
      });
      // Ensure the global queue always recovers even if this specific typing action fails
      typeQueue = p.catch(() => {});
      return p;

    case 'press_key':
      if (!args.key) {
        throw new Error("key is required to press key");
      }
      return await sendNativeKey(args.appName || "", args.key);

    case 'system_action':
      if (args.action === 'shutdown' || args.action === 'restart') {
        const focusedWin = BrowserWindow.getFocusedWindow();
        const choice = dialog.showMessageBoxSync(focusedWin || undefined as any, {
          type: 'warning',
          title: 'Project Elyra - Security Confirmation',
          message: `Elyra has requested to ${args.action.toUpperCase()} your PC.`,
          detail: `Action: ${args.action.toUpperCase()}\nInitiated by AI agent.\n\nDo you want to proceed with this system action? Click "Cancel" to abort.`,
          buttons: ['Cancel', `Confirm ${args.action.toUpperCase()}`],
          defaultId: 0,
          cancelId: 0,
          noLink: true
        });

        if (choice !== 1) {
          throw new Error(`Security Refusal: User cancelled ${args.action}. Execution aborted.`);
        }
      }
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
        let nircmdPath = path.join(process.cwd(), 'bin', 'nircmdc.exe');
        if (!fs.existsSync(nircmdPath) && (process as any).resourcesPath) {
          const resPath = path.join((process as any).resourcesPath, 'bin', 'nircmdc.exe');
          if (fs.existsSync(resPath)) nircmdPath = resPath;
        }
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
        const targetDesc = expandedPath || expandedDest || 'target file/folder';
        const focusedWin = BrowserWindow.getFocusedWindow();
        const choice = dialog.showMessageBoxSync(focusedWin || undefined as any, {
          type: 'warning',
          title: 'Project Elyra - File Deletion Guard',
          message: `Elyra has requested to ${args.action.toUpperCase()} a file or directory.`,
          detail: `Target: ${targetDesc}\nAction: ${args.action.toUpperCase()}\n\nDo you want to permanently ${args.action} this item? Click "Cancel" to abort.`,
          buttons: ['Cancel', `Confirm ${args.action.toUpperCase()}`],
          defaultId: 0,
          cancelId: 0,
          noLink: true
        });

        if (choice !== 1) {
          throw new Error(`Security Refusal: User cancelled ${args.action} on "${targetDesc}". Execution aborted.`);
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
