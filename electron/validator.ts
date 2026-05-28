// Safe validation layer to prevent AI hallucination or malicious commands

export function validateAction(actionName: string, args: any): { valid: boolean, error?: string } {
  switch (actionName) {
    case 'open_app':
      if (!args.appName || typeof args.appName !== 'string') {
        return { valid: false, error: "Missing or invalid appName" };
      }
      const cleanAppName = args.appName.toLowerCase().replace('.exe', '');
      
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

    case 'kill_process':
      if (!args.processName || typeof args.processName !== 'string') {
        return { valid: false, error: "Missing or invalid processName" };
      }
      // Basic protection against weird injections like `cmd.exe & format c:`
      if (!/^[a-zA-Z0-9\-_ \.]+$/.test(args.processName)) {
        return { valid: false, error: "processName contains invalid characters" };
      }
      return { valid: true };

    case 'set_volume':
    case 'set_brightness':
      if (typeof args.level !== 'number' || args.level < 0 || args.level > 100) {
        return { valid: false, reason: "Level must be a number between 0 and 100" };
      }
      return { valid: true };

    case 'toggle_wifi':
    case 'toggle_bluetooth':
      if (typeof args.enable !== 'boolean') {
        return { valid: false, reason: "Enable must be a boolean" };
      }
      return { valid: true };

    case 'set_display_resolution':
      if (typeof args.width !== 'number' || typeof args.height !== 'number') {
        return { valid: false, reason: "Width and height must be numbers" };
      }
      return { valid: true };

    case 'set_default_audio_device':
      if (typeof args.deviceName !== 'string' || !args.deviceName.trim()) {
        return { valid: false, error: "deviceName must be a non-empty string" };
      }
      return { valid: true };

    case 'file_system_action':
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
      return { valid: true };

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
