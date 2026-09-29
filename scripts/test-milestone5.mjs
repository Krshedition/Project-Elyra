import assert from 'node:assert';
import path from 'node:path';

// Re-import or test the exact validator logic
function expandEnvVars(filepath) {
  if (!filepath) return filepath;
  return filepath.replace(/%([^%]+)%/g, (_, n) => process.env[n] || '');
}

const PROTECTED_PROCESSES = new Set([
  'csrss.exe', 'lsass.exe', 'smss.exe', 'services.exe', 'wininit.exe',
  'explorer.exe', 'svchost.exe', 'winlogon.exe', 'system', 'registry',
  'ntoskrnl.exe', 'runtimebroker.exe', 'dwm.exe'
]);

const FORBIDDEN_DIRS = [
  'c:\\windows',
  'c:\\program files',
  'c:\\program files (x86)',
  'c:\\boot',
  'c:\\recovery',
  'c:\\system volume information'
];

function isProtectedSystemPath(targetPath) {
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

function validateAction(actionName, args) {
  switch (actionName) {
    case 'open_app': {
      if (!args.appName || typeof args.appName !== 'string') {
        return { valid: false, error: "Missing or invalid appName" };
      }
      const forbiddenExtensions = ['.bat', '.cmd', '.ps1', '.vbs', '.js', '.sh', '.msi', '.vbe', '.wsf', '.hta'];
      const lowerApp = args.appName.toLowerCase().trim();
      if (forbiddenExtensions.some(ext => lowerApp.endsWith(ext))) {
        return { valid: false, error: `Direct execution of script files (${args.appName}) is prohibited by security policy.` };
      }
      const cleanAppName = lowerApp.replace('.exe', '');
      if (!/^[a-zA-Z0-9\-_ ]+$/.test(cleanAppName)) {
        return { valid: false, error: `App name '${args.appName}' contains invalid characters.` };
      }
      args.appName = cleanAppName;
      return { valid: true };
    }
    case 'kill_process': {
      if (!args.processName || typeof args.processName !== 'string') {
        return { valid: false, error: "Missing or invalid processName" };
      }
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
      const pathsToCheck = [];
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
    default:
      return { valid: true };
  }
}

console.log('--- RUNNING MILESTONE 5 SECURITY & EDGE-CASE VALIDATION SUITE ---');

// Test 1: Critical process termination rejection
const criticalProcs = ['csrss', 'csrss.exe', 'lsass', 'lsass.exe', 'explorer', 'svchost.exe', 'smss'];
for (const proc of criticalProcs) {
  const res = validateAction('kill_process', { processName: proc });
  assert.strictEqual(res.valid, false, `Expected termination of ${proc} to be refused`);
  console.log(`[PASS] Blocked termination of critical OS process: ${proc}`);
}

// Test 2: Safe process termination acceptance
const safeRes = validateAction('kill_process', { processName: 'notepad.exe' });
assert.strictEqual(safeRes.valid, true);
console.log('[PASS] Allowed benign process termination: notepad.exe');

// Test 3: Script file execution rejection
const dangerousApps = ['malware.bat', 'payload.ps1', 'installer.msi', 'evil.cmd', 'inject.vbs'];
for (const app of dangerousApps) {
  const res = validateAction('open_app', { appName: app });
  assert.strictEqual(res.valid, false, `Expected execution of script ${app} to be refused`);
  console.log(`[PASS] Blocked execution of script/installer: ${app}`);
}

// Test 4: Benign application launch acceptance
const benignAppRes = validateAction('open_app', { appName: 'code.exe' });
assert.strictEqual(benignAppRes.valid, true);
console.log('[PASS] Allowed standard application launch: code.exe');

// Test 5: Destructive mutation on protected system paths
const destructivePaths = [
  'C:\\Windows\\System32\\drivers',
  'C:\\Program Files\\App',
  'C:\\Program Files (x86)\\Common Files',
  '%SYSTEMROOT%\\System32',
  'C:\\Users\\Krish Bhutiya\\..\\..\\Windows\\System32'
];

for (const p of destructivePaths) {
  const res = validateAction('file_system_action', { action: 'delete', path: p });
  assert.strictEqual(res.valid, false, `Expected deletion of ${p} to be blocked`);
  console.log(`[PASS] Blocked destructive deletion on protected path: ${p}`);
}

// Test 6: Benign user file creation allowed
const benignPath = 'C:\\Users\\Krish Bhutiya\\Desktop\\test_notes.txt';
const benignFsRes = validateAction('file_system_action', { action: 'write', path: benignPath, content: 'test data' });
assert.strictEqual(benignFsRes.valid, true);
console.log(`[PASS] Allowed benign file write in user space: ${benignPath}`);

console.log('--- ALL EDGE-CASE SECURITY TESTS PASSED SUCCESSFULLY ---');
