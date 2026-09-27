import { app, BrowserWindow, ipcMain, screen, session, shell, desktopCapturer } from 'electron';
import path from 'node:path';
import { 
  initMemory, 
  getRecentContext, 
  saveFact, 
  getAllFactsDetailed, 
  deleteFact, 
  updateFact, 
  runMemoryWorkerMain, 
  searchFacts, 
  applySessionDigest 
} from './memory';
import { DirectBrowserEngine } from './browser_service';
import { EmailService } from './email_service';
import { CalendarService } from './calendar_service';
import { DataService } from './data_service';
import { N8nService } from './n8n_service';

const browser = DirectBrowserEngine.getInstance();
const emailService = EmailService.getInstance();
const calendarService = CalendarService.getInstance();
const dataService = DataService.getInstance();
const n8nService = N8nService.getInstance();

process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  const WINDOW_WIDTH = Math.min(1366, Math.max(1200, Math.floor(screenWidth * 0.88)));
  const WINDOW_HEIGHT = Math.min(840, Math.max(720, Math.floor(screenHeight * 0.88)));

  win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: 980,
    minHeight: 620,
    backgroundColor: '#0B0E17',
    frame: false,
    resizable: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.center();
  win.once('ready-to-show', () => {
    win?.show();
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

let pendingMemoryTask: Promise<void> | null = null;
let isQuitting = false;

app.on('before-quit', (e) => {
  calendarService.stopReminderWorker();
  if (pendingMemoryTask && !isQuitting) {
    e.preventDefault();
    console.log('Main Process: Waiting for memory worker to finish before quitting...');
    
    Promise.all([
      pendingMemoryTask,
      browser.stop().catch(console.error)
    ]).then(() => {
      isQuitting = true;
      app.quit();
    });
  } else if (!isQuitting) {
    e.preventDefault();
    browser.stop()
      .catch(console.error)
      .finally(() => {
        isQuitting = true;
        app.quit();
      });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

import { handleDesktopAction } from './action_handler';

ipcMain.on('log', (event, msg) => {
  console.log('[RENDERER LOG]', typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg);
});

ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
});

ipcMain.on('set-window-mode', (event, mode: 'compact' | 'expanded') => {
  // Maintained for backward compatibility
  if (!win) return;
});

// Window control handlers for custom desktop titlebar
ipcMain.on('window:minimize', () => {
  win?.minimize();
});

ipcMain.on('window:maximize', () => {
  if (!win) return;
  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});

ipcMain.on('window:close', () => {
  win?.close();
});

ipcMain.handle('window:isMaximized', () => {
  return win?.isMaximized() ?? false;
});

// Allow renderer to request the primary screen source ID for WebRTC capture
ipcMain.handle('get-screen-source', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  // We just return the first screen for now
  return sources[0]?.id;
});

ipcMain.handle('desktop-action', async (event, actionName, args) => {
  try {
    return await handleDesktopAction(actionName, args);
  } catch (error: any) {
    console.error('Desktop action error:', error);
    throw error;
  }
});

ipcMain.handle('get-system-context', async () => {
  return getRecentContext();
});

ipcMain.handle('process-memory-worker', async (event, { transcript, apiKey }) => {
  pendingMemoryTask = runMemoryWorkerMain(transcript, apiKey);
  return true;
});

ipcMain.handle('browser:navigate', async (event, payload: { url: string, newTab?: boolean, tabId?: number | string } | string, maybeNewTab?: boolean, maybeTabId?: number | string) => {
  if (typeof payload === 'object' && payload !== null) {
    return await browser.navigate(payload.url, !!payload.newTab, payload.tabId);
  }
  return await browser.navigate(payload, !!maybeNewTab, maybeTabId);
});

ipcMain.handle('browser:newTab', async (event, url?: string) => {
  return await browser.newTab(url);
});

ipcMain.handle('browser:listTabs', async () => {
  return await browser.listTabs();
});

ipcMain.handle('browser:switchTab', async (event, target: string | number) => {
  return await browser.switchTab(target);
});

ipcMain.handle('browser:clickText', async (event, payload: { text: string, tabId?: number | string } | string, maybeTabId?: number | string) => {
  if (typeof payload === 'object' && payload !== null) {
    return await browser.clickByText(payload.text, payload.tabId);
  }
  return await browser.clickByText(payload, maybeTabId);
});

ipcMain.handle('browser:typeInput', async (event, payload: { selector?: string, text: string, pressEnter: boolean, tabId?: number | string }) => {
  return await browser.typeInput(payload.selector, payload.text, payload.pressEnter, payload.tabId);
});

ipcMain.handle('browser:clickVideo', async (event, tabId?: number | string) => {
  return await browser.clickFirstYouTubeVideo(tabId);
});

ipcMain.handle('browser:scroll', async (event, payload: { direction: 'up' | 'down' | 'top' | 'bottom', tabId?: number | string } | 'up' | 'down' | 'top' | 'bottom', maybeTabId?: number | string) => {
  if (typeof payload === 'object' && payload !== null) {
    return await browser.scroll(payload.direction, payload.tabId);
  }
  return await browser.scroll(payload, maybeTabId);
});

ipcMain.handle('browser:analyzePage', async (event, tabId?: number | string) => {
  return await browser.analyzePage(tabId);
});

ipcMain.handle('browser:clickElement', async (event, payload: { id: number, tabId?: number | string } | number, maybeTabId?: number | string) => {
  if (typeof payload === 'object' && payload !== null) {
    return await browser.clickElement(payload.id, payload.tabId);
  }
  return await browser.clickElement(payload, maybeTabId);
});

ipcMain.handle('browser:fillForm', async (event, payload: { fields: {id: number, text: string}[], tabId?: number | string } | {id: number, text: string}[], maybeTabId?: number | string) => {
  if (typeof payload === 'object' && payload !== null && !Array.isArray(payload) && (payload as any).fields) {
    return await browser.fillForm((payload as any).fields, (payload as any).tabId);
  }
  return await browser.fillForm(payload as any, maybeTabId);
});

ipcMain.handle('browser:closeTab', async (event, target?: string | number) => {
  return await browser.closeTab(target);
});

ipcMain.handle('browser:pressKey', async (event, payload: { key: string, tabId?: number | string } | string, maybeTabId?: number | string) => {
  if (typeof payload === 'object' && payload !== null) {
    return await browser.pressKey(payload.key, payload.tabId);
  }
  return await browser.pressKey(payload, maybeTabId);
});

ipcMain.handle('search-memory', async (event, query: string) => {
  return searchFacts(query);
});

ipcMain.handle('get-all-facts-detailed', async () => {
  return getAllFactsDetailed();
});

ipcMain.handle('delete-fact', async (event, key: string) => {
  deleteFact(key);
  return true;
});

ipcMain.handle('add-fact-manual', async (event, payload: { category: string, key: string, value: string }) => {
  saveFact(payload.category, payload.key, payload.value);
  return true;
});

ipcMain.handle('update-fact-manual', async (event, payload: { oldKey: string, category: string, key: string, value: string }) => {
  updateFact(payload.oldKey, payload.category, payload.key, payload.value);
  return true;
});

ipcMain.handle('save-session-digest', async (event, payload) => {
  applySessionDigest(payload);
  return true;
});

// ==========================================
// MILESTONE 3: BACKGROUND TASK AUTOMATION
// ==========================================

// 1. Headless Email Service & Google Auth
ipcMain.handle('email:send', async (event, options: { to: string; subject: string; body: string; isHtml?: boolean }) => {
  return await emailService.sendEmail(options);
});

ipcMain.handle('email:verifyConfig', async () => {
  return await emailService.verifyConfig();
});

ipcMain.handle('email:getConfig', async () => {
  return emailService.getEmailConfig();
});

ipcMain.handle('email:connectGoogle', async (event, payload: { email: string; appPassword: string; displayName?: string }) => {
  return await emailService.connectGoogleAccount(payload.email, payload.appPassword, payload.displayName);
});

ipcMain.handle('email:disconnectGoogle', async () => {
  return emailService.disconnectGoogleAccount();
});

ipcMain.handle('email:openGoogleAppPasswords', async () => {
  await shell.openExternal('https://myaccount.google.com/apppasswords');
  return true;
});

// 2. Headless Calendar Service
ipcMain.handle('calendar:createEvent', async (event, payload: any) => {
  return calendarService.createEvent(payload);
});

ipcMain.handle('calendar:listEvents', async (event, options?: any) => {
  return calendarService.listEvents(options);
});

ipcMain.handle('calendar:deleteEvent', async (event, target: string | number) => {
  return calendarService.deleteEvent(target);
});

// 3. Headless Data & Search Service
ipcMain.handle('data:searchWeb', async (event, query: string) => {
  return await dataService.searchWeb(query);
});

ipcMain.handle('data:fetchWeather', async (event, city?: string) => {
  return await dataService.fetchWeather(city);
});

ipcMain.handle('data:fetchUrlContent', async (event, url: string) => {
  return await dataService.fetchUrlContent(url);
});

ipcMain.handle('data:fetchCrypto', async (event, symbol: string) => {
  return await dataService.fetchCrypto(symbol);
});

// 4. n8n Workflow Webhook Bridge
ipcMain.handle('n8n:triggerWorkflow', async (event, payload: { workflowName: string; payload: Record<string, any> }) => {
  return await n8nService.triggerWorkflow(payload);
});

ipcMain.handle('n8n:checkHealth', async () => {
  return await n8nService.checkHealth();
});

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
  initMemory();
  browser.start().catch(console.error);

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });
  
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'media') return true;
    return false;
  });

  createWindow();
});
}
