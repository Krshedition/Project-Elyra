import { validateAction } from './validator';
import { createRequire } from 'node:module';

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

    default:
      throw new Error(`Execution logic for ${actionName} not implemented`);
  }
}
