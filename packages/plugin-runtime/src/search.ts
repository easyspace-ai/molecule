import type { SearchMatch } from '@easyspace/plugin-api';

export interface SearchOptions {
  caseSensitive?: boolean;
  useRegex?: boolean;
  excludeGlobs?: string[];
}

function globToRegExp(glob: string): RegExp {
  let pattern = glob.replace(/\\/g, '/');
  if (pattern.startsWith('**/')) pattern = pattern.slice(3);
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.');
  return new RegExp(`(^|/)${escaped}($|/)`);
}

function isExcluded(path: string, excludeGlobs: string[]): boolean {
  const normalized = path.replace(/\\/g, '/');
  return excludeGlobs.some((glob) => globToRegExp(glob).test(normalized));
}

function searchSync(
  files: Record<string, string>,
  query: string,
  options: SearchOptions = {}
): SearchMatch[] {
  const q = query.trim();
  if (!q) return [];

  const caseSensitive = options.caseSensitive ?? false;
  const useRegex = options.useRegex ?? false;
  const excludeGlobs = options.excludeGlobs ?? [];
  const matches: SearchMatch[] = [];

  let matcher: (line: string) => boolean;
  if (useRegex) {
    try {
      const re = new RegExp(q, caseSensitive ? '' : 'i');
      matcher = (line) => re.test(line);
    } catch {
      return [];
    }
  } else {
    const needle = caseSensitive ? q : q.toLowerCase();
    matcher = (line) => {
      const hay = caseSensitive ? line : line.toLowerCase();
      return hay.includes(needle);
    };
  }

  for (const [path, content] of Object.entries(files)) {
    if (isExcluded(path, excludeGlobs)) continue;
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (matcher(line)) {
        matches.push({ path, line: i + 1, text: line.trim() });
      }
    });
  }
  return matches;
}

const WORKER_SOURCE = `
self.onmessage = (event) => {
  const { id, files, query, options } = event.data;
  try {
    const excludeGlobs = options?.excludeGlobs ?? [];
    const caseSensitive = options?.caseSensitive ?? false;
    const useRegex = options?.useRegex ?? false;
    const q = String(query || '').trim();
    if (!q) {
      self.postMessage({ id, matches: [] });
      return;
    }
    let matcher;
    if (useRegex) {
      try {
        const re = new RegExp(q, caseSensitive ? '' : 'i');
        matcher = (line) => re.test(line);
      } catch {
        self.postMessage({ id, matches: [] });
        return;
      }
    } else {
      const needle = caseSensitive ? q : q.toLowerCase();
      matcher = (line) => {
        const hay = caseSensitive ? line : line.toLowerCase();
        return hay.includes(needle);
      };
    }
    function globToRegExp(glob) {
      let pattern = glob.replace(/\\\\/g, '/');
      if (pattern.startsWith('**/')) pattern = pattern.slice(3);
      const escaped = pattern
        .replace(/[+.^$()|[\\]\\\\]/g, '\\\\$&')
        .replace(/\\*\\*/g, '.*')
        .replace(/\\*/g, '[^/]*')
        .replace(/\\?/g, '.');
      return new RegExp('(^|/)' + escaped + '($|/)');
    }
    function isExcluded(path, globs) {
      const normalized = path.replace(/\\\\/g, '/');
      return globs.some((glob) => globToRegExp(glob).test(normalized));
    }
    const matches = [];
    for (const [path, content] of Object.entries(files)) {
      if (isExcluded(path, excludeGlobs)) continue;
      const lines = content.split('\\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (matcher(line)) {
          matches.push({ path, line: i + 1, text: line.trim() });
        }
      }
    }
    self.postMessage({ id, matches });
  } catch (err) {
    self.postMessage({ id, error: String(err), matches: [] });
  }
};
`;

let worker: Worker | null = null;
let workerUrl: string | null = null;
let nextId = 0;

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (!worker) {
    const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' });
    workerUrl = URL.createObjectURL(blob);
    worker = new Worker(workerUrl);
  }
  return worker;
}

export function searchFilesInWorker(
  files: Record<string, string>,
  query: string,
  options?: SearchOptions
): Promise<SearchMatch[]> {
  const w = getWorker();
  if (!w) {
    return Promise.resolve(searchSync(files, query, options));
  }

  const id = ++nextId;
  return new Promise((resolve) => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.id !== id) return;
      w.removeEventListener('message', onMessage);
      resolve(event.data.matches ?? []);
    };
    w.addEventListener('message', onMessage);
    w.postMessage({ id, files, query, options });
  });
}

export { searchSync as searchFilesSync };
