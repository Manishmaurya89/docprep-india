/**
 * Passes a file from one tool to another, in memory, during in-app
 * navigation — for example a photo with a new background to the photo &
 * signature maker. Nothing is stored: a reload or closing the tab drops it,
 * and it expires after a few minutes if the other tool never picks it up.
 */
const EXPIRES_MS = 10 * 60 * 1000;

interface Pending {
  file: File;
  to: string;
  at: number;
}

/*
 * Kept on the page's global object rather than in a module variable: each
 * route's code is bundled separately, and a module can be instantiated once
 * per bundle, so two tools could otherwise see two different variables.
 */
const SLOT = "__docprepHandoff";
const store = globalThis as typeof globalThis & { [SLOT]?: Pending | null };

export function handOff(file: File, to: string): void {
  store[SLOT] = { file, to, at: Date.now() };
}

function current(to: string): File | null {
  const pending = store[SLOT];
  if (!pending || pending.to !== to) return null;
  if (Date.now() - pending.at > EXPIRES_MS) {
    store[SLOT] = null;
    return null;
  }
  return pending.file;
}

/** The waiting file, without taking it. */
export function peekHandOff(to: string): File | null {
  return current(to);
}

/** Takes the waiting file (it is then gone). */
export function takeHandOff(to: string): File | null {
  const file = current(to);
  if (file) store[SLOT] = null;
  return file;
}
