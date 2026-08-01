/// <reference types="vite/client" />

interface NeutralinoEvents {
  on(event: string, handler: (data: any) => void): void;
  broadcast(event: string, data: unknown): Promise<unknown>;
}

interface NeutralinoExtensions {
  dispatch(extensionId: string, event: string, data?: unknown): Promise<unknown>;
  broadcast(event: string, data?: unknown): Promise<unknown>;
}

interface NeutralinoFilesystem {
  readFile(path: string, opts?: Record<string, unknown>): Promise<string>;
  writeFile(path: string, data: string): Promise<void>;
}

interface NeutralinoStorage {
  getData(key: string): Promise<string>;
  setData(key: string, value: string): Promise<void>;
}

interface NeutralinoClipboard {
  writeText(text: string): Promise<void>;
}

interface NeutralinoApp {
  exit(): Promise<void>;
}

interface NeutralinoAPI {
  init(opts?: Record<string, unknown>): void;
  events: NeutralinoEvents;
  extensions: NeutralinoExtensions;
  filesystem?: NeutralinoFilesystem;
  storage?: NeutralinoStorage;
  clipboard?: NeutralinoClipboard;
  app?: NeutralinoApp;
}

declare global {
  var Neutralino: NeutralinoAPI | undefined;
}

export {};
