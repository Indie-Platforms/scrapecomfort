/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  IpcMainEvent,
  shell,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import fs from 'fs';
import Store from 'electron-store';
import { getChromePath } from 'chrome-launcher';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { Extractor, Scraper } from './workers';
import type { Option, UrlObject } from './workers';

const { Configuration, OpenAIApi } = require('openai');
const config = require('dotenv').config();

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    const server = 'https://scrapecomfort-update.vercel.app';
    const url = `${server}/update/${process.platform}/${app.getVersion()}`;
    autoUpdater.setFeedURL(url);
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('get-env', (event) => {
  event.sender.send('get-env-reply', config);
});

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    minWidth: 1024,
    minHeight: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

let scraper: Scraper | null = null;
let extractor: Extractor | null = null;

const wrapWorkerEvent = (
  eventName: string,
  callback: (...args: any[]) => Promise<void>
) => {
  return async (event: IpcMainEvent, ...args: any[]) => {
    console.log(`Got [${eventName}]. Start handling...`);
    try {
      await callback(event, ...args);
    } catch (error) {
      console.log(`ERROR WHILE HANDLING EVENT [${eventName}]: ${error}`);
    }
    console.log(`Finished handling [${eventName}]`);
  };
};

ipcMain.on(
  'start-scraping',
  wrapWorkerEvent(
    'start-scraping',
    async (event, urlObjects, isHeadlessBrowser) => {
      console.log('Extractor is ', extractor);
      if (extractor) {
        await extractor.stop(event);
        await extractor.resetNotStarted(event, urlObjects);
      }
      if (scraper) {
        await scraper.reset(event, urlObjects);
      } else {
        scraper = new Scraper(urlObjects);
      }
      scraper.isHeadlessBrowser = isHeadlessBrowser;
      await scraper.start(event);
    }
  )
);

ipcMain.on(
  'stop-scraping',
  wrapWorkerEvent('stop-scraping', async (event) => {
    if (scraper) {
      await scraper.stop(event);
      event.reply('stop-scraping', 'stopped');
    }
  })
);

ipcMain.on(
  'resume-scraping',
  wrapWorkerEvent('resume-scraping', async (event, isHeadlessBrowser) => {
    if (scraper && extractor) {
      await extractor.stop(event);
      await extractor.resetNotStarted(event);
    }
    if (scraper) {
      scraper.isHeadlessBrowser = isHeadlessBrowser;
      await scraper.resume(event);
    }
  })
);

ipcMain.on(
  'reset-scraping',
  wrapWorkerEvent('reset-scraping', async (event, urlObjects) => {
    if (scraper && extractor) {
      await extractor.stop(event);
      await extractor.reset(event, urlObjects);
    }
    if (scraper) {
      await scraper.reset(event, urlObjects);
      if (extractor) {
        await extractor.reset(event, urlObjects);
      }
    } else {
      scraper = new Scraper(urlObjects);
    }
  })
);

ipcMain.on(
  'restart-scraping',
  wrapWorkerEvent('restart-scraping', async (event, isHeadlessBrowser) => {
    if (scraper && extractor) {
      await extractor.stop(event);
      await extractor.reset(event, scraper.urlObjects);
    }
    if (scraper) {
      scraper.isHeadlessBrowser = isHeadlessBrowser;
      await scraper.restart(event);
    } else {
      throw new Error('Scraper is not initialized');
    }
  })
);

// EXTRACTING
ipcMain.on(
  'start-extracting',
  wrapWorkerEvent(
    'start-extracting',
    async (event, { selectedOptions, openAIKey }) => {
      // selectedOptions [ { name: 'Email', value: '12' } ]
      // updateObject { Email: '12' }
      console.log('selectedOptions', selectedOptions);
      if (!scraper) {
        throw new Error('Scraper is not initialized');
      }
      if (extractor) {
        await extractor.reset(
          event,
          scraper.urlObjects,
          selectedOptions,
          openAIKey
        );
      } else {
        extractor = new Extractor(
          scraper.urlObjects,
          selectedOptions,
          openAIKey
        );
      }
      await extractor.start(event, openAIKey);
    }
  )
);

ipcMain.on(
  'stop-extracting',
  wrapWorkerEvent('stop-extracting', async (event) => {
    if (extractor) {
      await extractor.stop(event);
      event.reply('stop-extracting', 'stopped');
    }
  })
);

ipcMain.on(
  'resume-extracting',
  wrapWorkerEvent('resume-extracting', async (event, openAIKey) => {
    if (extractor) {
      await extractor.resume(event, openAIKey);
    }
  })
);

ipcMain.on(
  'reset-extracting',
  wrapWorkerEvent('reset-extracting', async (event, urlObjects) => {
    if (extractor) {
      await extractor.reset(event, urlObjects);
    }
  })
);

ipcMain.on(
  'restart-extracting',
  wrapWorkerEvent(
    'restart-extracting',
    async (event, { selectedOptions, openAIKey }) => {
      console.log('selectedOptions', selectedOptions);
      if (extractor) {
        await extractor.restart(event, selectedOptions, openAIKey);
      }
    }
  )
);

ipcMain.on('save-file', async (_, fileName, fileContent) => {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: fileName,
    filters: [{ name: 'Data files', extensions: ['csv'] }],
  });

  if (filePath) {
    await fs.promises.writeFile(filePath, fileContent);
    return true;
  }

  return false;
});

const store = new Store();

interface State {
  urlObjects: UrlObject[] | undefined;
  selectedOptions: Option[] | undefined;
  openAIKey: string | undefined;
}

ipcMain.on(
  'get-state',
  wrapWorkerEvent('get-state', async (event) => {
    const state = store.get('state') as State | undefined;
    if (state && !extractor) {
      extractor = new Extractor(
        (state.urlObjects || []) as UrlObject[],
        (state.selectedOptions || []) as Option[],
        (state.openAIKey || '') as string
      );
    }
    if (state && !scraper) {
      scraper = new Scraper((state.urlObjects || []) as UrlObject[]);
    }
    event.reply('get-state', [app.getVersion(), store.get('state')]);
  })
);

ipcMain.on(
  'set-state',
  wrapWorkerEvent('set-state', async (event, state) => {
    store.set('state', state);
  })
);

ipcMain.on(
  'get-chrome-path',
  wrapWorkerEvent('get-chrome-path', async (event) => {
    console.log('get-chrome-path', getChromePath());
    event.reply('get-chrome-path', getChromePath());
  })
);

ipcMain.on(
  'set-user',
  wrapWorkerEvent('set-user', async (event, user) => {
    store.set('user', user);
  })
);

ipcMain.on(
  'get-user',
  wrapWorkerEvent('get-user', async (event) => {
    event.reply('get-user', store.get('user'));
  })
);

ipcMain.on(
  'check-openai-key',
  wrapWorkerEvent('check-openai-key', async (event, openAIKey) => {
    try {
      const configuration = new Configuration({
        apiKey: openAIKey,
      });
      const openai = new OpenAIApi(configuration);
      await openai.listModels();
      event.reply('check-openai-key', {
        ok: true,
        checkedOpenAIKey: openAIKey,
      });
    } catch {
      event.reply('check-openai-key', {
        ok: false,
        checkedOpenAIKey: openAIKey,
      });
    }
  })
);

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
