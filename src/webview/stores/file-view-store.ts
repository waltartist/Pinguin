import { create } from "zustand";

export interface FileViewEntry {
  path: string;
  filename: string;
  openedAt: number;
}

interface FileViewState {
  /** Currently open file in the markdown viewer */
  openFile: FileViewEntry | null;
  /** Recent files shown in a quick-access list */
  recentFiles: FileViewEntry[];

  open: (path: string) => void;
  close: () => void;
}

function filenameFromPath(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || path;
}

export const useFileViewStore = create<FileViewState>()((set) => ({
  openFile: null,
  recentFiles: [],

  open: (path) =>
    set((s) => {
      const entry: FileViewEntry = {
        path,
        filename: filenameFromPath(path),
        openedAt: Date.now(),
      };
      const recent = [entry, ...s.recentFiles.filter((f) => f.path !== path)].slice(
        0,
        20
      );
      return { openFile: entry, recentFiles: recent };
    }),

  close: () => set({ openFile: null }),
}));
