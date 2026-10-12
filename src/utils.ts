import { mkdtempSync } from 'fs';
import { rm } from 'fs/promises';
import os from 'os';
import path from 'path';

export function generateFileName() {
  return `latex_${Date.now()}`;
}

export function generateFilePath(tmpDir: string, fileName: string) {
  return `${tmpDir}/${fileName}`;
}

export function generateTmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'pdf-'));
}

/** Deletes the directory and everything in it. Safe to call if it's already gone. */
export async function cleanDirectory(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}
