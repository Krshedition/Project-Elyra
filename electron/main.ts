import { app, BrowserWindow, ipcMain, screen, session, shell, desktopCapturer } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
      preload: path.join(__dirname, 'preload.mjs'),
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
