import path from 'node:path';

// Safe validation and security sandbox layer to prevent arbitrary execution or system damage

function expandEnvVars(filepath: string | undefined): string | undefined {
  if (!filepath) return filepath;
  return filepath.replace(/%([^%]+)%/g, (_, n) => process.env[n] || '');
}

// Critical Windows core processes that must never be terminated
const PROTECTED_PROCESSES = new Set([
  'csrss.exe', 'lsass.exe', 'smss.exe', 'services.exe', 'wininit.exe',
  'explorer.exe', 'svchost.exe', 'winlogon.exe', 'system', 'registry',
  'ntoskrnl.exe', 'runtimebroker.exe', 'dwm.exe'
]);

// Windows root system directories that must be protected from destructive mutations
const FORBIDDEN_DIRS = [
  'c:\\windows',
  'c:\\program files',
  'c:\\program files (x86)',
  'c:\\boot',
  'c:\\recovery',
  'c:\\system volume information'
];

function isProtectedSystemPath(targetPath: string): boolean {
  if (!targetPath || typeof targetPath !== 'string') return false;
  const expanded = expandEnvVars(targetPath) || targetPath;
  const resolved = path.resolve(expanded).toLowerCase();

  for (const forbidden of FORBIDDEN_DIRS) {
    if (resolved === forbidden || resolved.startsWith(forbidden + '\\')) {
      return true;
    }
  }
  return false;
}

export function validateAction(actionName: string, args: any): { valid: boolean, error?: string } {
  switch (actionName) {
    case 'open_app':
      if (!args.appName || typeof args.appName !== 'string') {
        return { valid: false, error: "Missing or invalid appName" };
      }

      // Security: Block direct execution of arbitrary script files
      const forbiddenExtensions = ['.bat', '.cmd', '.ps1', '.vbs', '.js', '.sh', '.msi', '.vbe', '.wsf', '.hta'];
      const lowerApp = args.appName.toLowerCase().trim();
      if (forbiddenExtensions.some(ext => lowerApp.endsWith(ext))) {
        return { valid: false, error: `Direct execution of script files (${args.appName}) is prohibited by security policy.` };
      }

      const cleanAppName = lowerApp.replace('.exe', '');
      
      // Security: Only allow alphanumeric and spaces/dashes/underscores to prevent injection
      if (!/^[a-zA-Z0-9\-_ ]+$/.test(cleanAppName)) {
        return { valid: false, error: `App name '${args.appName}' contains invalid characters.` };
      }
      
      args.appName = cleanAppName;
      return { valid: true };

    case 'close_app':
      return { valid: true };

    case 'type_text':
      if (typeof args.text !== 'string') {
        return { valid: false, error: "Missing or invalid text to type" };
      }
      return { valid: true };

    case 'press_key':
      if (typeof args.key !== 'string') {
        return { valid: false, error: "Missing or invalid key" };
      }
      return { valid: true };

    case 'system_action':
      if (!args.action || !['shutdown', 'restart', 'cancel_shutdown', 'lock'].includes(args.action)) {
        return { valid: false, error: "Invalid or missing system action" };
      }
      return { valid: true };

    case 'get_running_processes':
    case 'get_focused_window':
    case 'get_system_info':
    case 'get_audio_devices':
      return { valid: true };

    case 'kill_process': {
      if (!args.processName || typeof args.processName !== 'string') {
        return { valid: false, error: "Missing or invalid processName" };
      }
      // Protection against injection syntax like `cmd.exe & format c:`
      if (!/^[a-zA-Z0-9\-_ \.]+$/.test(args.processName)) {
        return { valid: false, error: "processName contains invalid characters" };
      }

      const raw = args.processName.toLowerCase().trim();
      const procNorm = raw.endsWith('.exe') ? raw : `${raw}.exe`;

      if (PROTECTED_PROCESSES.has(procNorm) || PROTECTED_PROCESSES.has(raw)) {
        return { valid: false, error: `Security Refusal: Process '${args.processName}' is a protected Windows core system process.` };
      }
      return { valid: true };
    }

    case 'set_volume':
    case 'set_brightness':
      if (typeof args.level !== 'number' || args.level < 0 || args.level > 100) {
        return { valid: false, error: "Level must be a number between 0 and 100" };
      }
      return { valid: true };

    case 'toggle_wifi':
    case 'toggle_bluetooth':
      if (typeof args.enable !== 'boolean') {
        return { valid: false, error: "Enable must be a boolean" };
      }
      return { valid: true };

    case 'set_display_resolution':
      if (typeof args.width !== 'number' || typeof args.height !== 'number') {
        return { valid: false, error: "Width and height must be numbers" };
      }
      return { valid: true };

    case 'set_default_audio_device':
      if (typeof args.deviceName !== 'string' || !args.deviceName.trim()) {
        return { valid: false, error: "deviceName must be a non-empty string" };
      }
      return { valid: true };

    case 'file_system_action': {
      if (!args.action || !['create_dir', 'delete', 'move', 'copy', 'read', 'write', 'overwrite'].includes(args.action)) {
        return { valid: false, error: "Invalid or missing file system action" };
      }
      if (args.action === 'move' || args.action === 'copy') {
        if (!args.src || !args.dest) return { valid: false, error: "Missing src or dest path" };
      } else {
        if (!args.path) return { valid: false, error: "Missing path" };
      }
      if (args.action === 'write' || args.action === 'overwrite') {
        if (typeof args.content !== 'string') return { valid: false, error: "Missing content to write" };
      }

      // Security Sandbox: Prevent destructive operations on OS system paths
      const pathsToCheck: string[] = [];
      if (args.path) pathsToCheck.push(args.path);
      if (args.src) pathsToCheck.push(args.src);
      if (args.dest) pathsToCheck.push(args.dest);

      const isDestructive = ['create_dir', 'delete', 'move', 'write', 'overwrite'].includes(args.action);
      for (const p of pathsToCheck) {
        if (isDestructive && isProtectedSystemPath(p)) {
          return { valid: false, error: `Security Refusal: Path '${p}' is in a protected system directory and cannot be modified.` };
        }
      }

      return { valid: true };
    }

    case 'read_clipboard':
      return { valid: true };
      
    case 'write_clipboard':
      if (typeof args.text !== 'string') {
        return { valid: false, error: "Missing or invalid text for clipboard" };
      }
      return { valid: true };

    default:
      return { valid: false, error: `Unknown action: ${actionName}` };
  }
}

