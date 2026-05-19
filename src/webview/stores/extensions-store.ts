import { create } from "zustand";
import type React from "react";
import type { usePiStore } from "./pi-store";

export interface ExtensionEntry {
  id: string;
  title: string;
  Component: React.ComponentType<{
    pi: ReturnType<typeof usePiStore.getState>;
  }>;
}

interface ExtensionsState {
  extensions: Map<string, ExtensionEntry>;
  register: (ext: ExtensionEntry) => void;
  unregister: (id: string) => void;
}

export const useExtensionsStore = create<ExtensionsState>((set) => ({
  extensions: new Map(),
  register: (ext) =>
    set((state) => {
      const next = new Map(state.extensions);
      next.set(ext.id, ext);
      return { extensions: next };
    }),
  unregister: (id) =>
    set((state) => {
      if (!state.extensions.has(id)) return state;
      const next = new Map(state.extensions);
      next.delete(id);
      return { extensions: next };
    }),
}));
