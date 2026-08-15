import { app, BrowserWindow, ipcMain, screen, session, shell, desktopCapturer } from 'electron';
import path from 'node:path';
import { initMemory, getRecentContext, saveSessionSummary, saveFact, getAllFactsDetailed, deleteFact, updateFact } from './memory';

process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const WIDGET_WIDTH = 500;
  const WIDGET_HEIGHT = 150;

  win = new BrowserWindow({
    width: WIDGET_WIDTH,
    height: WIDGET_HEIGHT,
    x: width - WIDGET_WIDTH - 20,
    y: 20,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
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
  const { DirectBrowserEngine } = require('./browser_service');
  
  if (pendingMemoryTask && !isQuitting) {
    e.preventDefault();
    console.log('Main Process: Waiting for memory worker to finish before quitting...');
    
    // Run cleanup tasks
    Promise.all([
      pendingMemoryTask,
      DirectBrowserEngine.getInstance().stop().catch(console.error)
    ]).then(() => {
      isQuitting = true;
      app.quit();
    });
  } else if (!isQuitting) {
    e.preventDefault();
    DirectBrowserEngine.getInstance().stop()
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
  if (!win) return;
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
  if (mode === 'compact') {
    win.setContentSize(500, 150);
    win.setPosition(screenWidth - 500 - 20, 20);
  } else {
    win.setContentSize(500, 650);
    win.setPosition(screenWidth - 500 - 20, 20);
  }
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
  const { runMemoryWorkerMain } = require('./memory');
  pendingMemoryTask = runMemoryWorkerMain(transcript, apiKey);
  return true;
});

ipcMain.handle('browser:navigate', async (event, url: string) => {
  const { DirectBrowserEngine } = require('./browser_service');
  return await DirectBrowserEngine.getInstance().navigate(url);
});

ipcMain.handle('browser:clickText', async (event, text: string) => {
  const { DirectBrowserEngine } = require('./browser_service');
  return await DirectBrowserEngine.getInstance().clickByText(text);
});

ipcMain.handle('browser:typeInput', async (event, payload: { selector?: string, text: string, pressEnter: boolean }) => {
  const { DirectBrowserEngine } = require('./browser_service');
  return await DirectBrowserEngine.getInstance().typeInput(payload.selector, payload.text, payload.pressEnter);
});

ipcMain.handle('browser:clickVideo', async () => {
  const { DirectBrowserEngine } = require('./browser_service');
  return await DirectBrowserEngine.getInstance().clickFirstYouTubeVideo();
});

ipcMain.handle('browser:scroll', async (event, direction: 'up' | 'down' | 'top' | 'bottom') => {
  const { DirectBrowserEngine } = require('./browser_service');
  return await DirectBrowserEngine.getInstance().scroll(direction);
});

ipcMain.handle('browser:analyzePage', async () => {
  const { DirectBrowserEngine } = require('./browser_service');
  return await DirectBrowserEngine.getInstance().analyzePage();
});

ipcMain.handle('browser:clickElement', async (event, id: number) => {
  const { DirectBrowserEngine } = require('./browser_service');
  return await DirectBrowserEngine.getInstance().clickElement(id);
});

ipcMain.handle('browser:fillForm', async (event, fields: {id: number, text: string}[]) => {
  const { DirectBrowserEngine } = require('./browser_service');
  return await DirectBrowserEngine.getInstance().fillForm(fields);
});

ipcMain.handle('browser:closeTab', async () => {
  const { DirectBrowserEngine } = require('./browser_service');
  return await DirectBrowserEngine.getInstance().closeTab();
});

ipcMain.handle('browser:pressKey', async (event, key: string) => {
  const { DirectBrowserEngine } = require('./browser_service');
  return await DirectBrowserEngine.getInstance().pressKey(key);
});

ipcMain.handle('search-memory', async (event, query: string) => {
  const { searchFacts } = require('./memory');
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
  if (payload.summary) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = days[new Date().getDay()];
    saveSessionSummary(payload.summary, dayOfWeek);
  }
  if (payload.facts && Array.isArray(payload.facts)) {
    for (const fact of payload.facts) {
      if (fact.category && fact.key && fact.value) {
        saveFact(fact.category, fact.key, fact.value);
      }
    }
  }
  return true;
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
  const { DirectBrowserEngine } = require('./browser_service');
  DirectBrowserEngine.getInstance().start().catch(console.error);

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
