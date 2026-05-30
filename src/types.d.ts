/// <reference types="vite/client" />

interface NeutralinoEvents {
  on(event: string, handler: (data: any) => void): void;
  broadcast(event: string, data: unknown): Promise<unknown>;
}

interface NeutralinoExtensions {
  dispatch(extensionId: string, event: string, data?: unknown): Promise<unknown>;
  broadcast(event: string, data?: unknown): Promise<unknown>;
}

interface NeutralinoAPI {
  init(opts?: Record<string, unknown>): void;
  events: NeutralinoEvents;
  extensions: NeutralinoExtensions;
}

declare global {
  var Neutralino: NeutralinoAPI | undefined;
}

export {};
