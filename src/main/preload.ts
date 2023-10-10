// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('envVars', {});

export type Channels =
  | 'ipc-example'
  | 'start-scraping'
  | 'stop-scraping'
  | 'resume-scraping'
  | 'reset-scraping'
  | 'restart-scraping'
  | 'start-extracting'
  | 'stop-extracting'
  | 'reset-extracting'
  | 'restart-extracting'
  | 'data-update'
  | 'save-file'
  | 'get-state'
  | 'set-state'
  | 'get-chrome-path'
  | 'extractor-status'
  | 'scraper-status'
  | 'check-openai-key'
  | 'set-user'
  | 'get-user'
  | 'get-env'
  | 'get-env-reply'
  | 'browser-not-accessible';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
