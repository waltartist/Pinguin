// Simple file/dir search for the composer's @-mention autocomplete.
//
// Mirrors the relevant behavior of @earendil-works/pi-tui's
// CombinedAutocompleteProvider so the GUI offers the same vocabulary as the
// TUI: type `@`, fuzzy-pick a project file, the literal `@path/to/file`
// reference is submitted as-is — the agent then reads it via its tools.
//
// Strategy: BFS walk from cwd, skip obvious junk dirs, cap node count, then
// score and trim to N best matches.

import * as fs from "node:fs";
import * as path from "node:path";

const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "out",
  ".next",
  ".cache",
  ".turbo",
  "coverage",
  "target",
  ".venv",
  "venv",
  "__pycache__",
  ".idea",
  ".vscode",
  ".DS_Store",
]);

const MAX_WALK_ENTRIES = 20000;
const MAX_RESULTS = 50;

function toDisplay(p) {
  return p.replace(/\\/g, "/");
}

function scoreEntry(filePath, query, isDirectory) {
  if (!query) return isDirectory ? 11 : 1;
  const name = path.basename(filePath).toLowerCase();
  const full = filePath.toLowerCase();
  const q = query.toLowerCase();
  let score = 0;
  if (name === q) score = 100;
  else if (name.startsWith(q)) score = 80;
  else if (name.includes(q)) score = 50;
  else if (full.includes(q)) score = 30;
  else {
    // Subsequence fuzzy match on filename — every query char appears in order.
    let i = 0;
    for (const ch of name) {
      if (ch === q[i]) i++;
      if (i === q.length) break;
    }
    if (i === q.length) score = 10;
  }
  if (isDirectory && score > 0) score += 10;
  return score;
}

// Walk cwd up to MAX_WALK_ENTRIES, return [{relPath, isDirectory}].
function walk(baseDir) {
  const out = [];
  const stack = [""];
  while (stack.length && out.length < MAX_WALK_ENTRIES) {
    const relDir = stack.pop();
    const absDir = path.join(baseDir, relDir);
    let entries;
    try {
      entries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
      let isDir = entry.isDirectory();
      if (!isDir && entry.isSymbolicLink()) {
        try {
          isDir = fs.statSync(path.join(absDir, entry.name)).isDirectory();
        } catch {
          continue;
        }
      }
      out.push({ path: toDisplay(rel), isDirectory: isDir });
      if (isDir) stack.push(rel);
      if (out.length >= MAX_WALK_ENTRIES) break;
    }
  }
  return out;
}

export function searchFiles(query, baseDir = process.cwd()) {
  // If the query contains a slash, narrow the walk to the parent directory
  // the user typed (e.g. "src/web" → walk src/, query "web").
  let walkDir = baseDir;
  let queryPath = query || "";
  let displayBase = "";
  const slashIdx = queryPath.lastIndexOf("/");
  if (slashIdx !== -1) {
    const sub = queryPath.slice(0, slashIdx);
    displayBase = sub + "/";
    queryPath = queryPath.slice(slashIdx + 1);
    const candidate = path.join(baseDir, sub);
    try {
      if (fs.statSync(candidate).isDirectory()) walkDir = candidate;
      else return [];
    } catch {
      return [];
    }
  }

  const entries = walk(walkDir);
  const scored = [];
  for (const e of entries) {
    const score = scoreEntry(e.path, queryPath, e.isDirectory);
    if (score <= 0) continue;
    scored.push({ ...e, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_RESULTS).map((e) => ({
    path: displayBase + e.path,
    name: path.basename(e.path),
    isDirectory: e.isDirectory,
  }));
}
