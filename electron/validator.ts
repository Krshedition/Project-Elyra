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

    default:
      return { valid: false, error: `Unknown action: ${actionName}` };
  }
}
