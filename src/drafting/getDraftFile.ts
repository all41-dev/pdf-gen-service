import path from 'path';
import fs from 'fs-extra';

export function getDraftFile(
  docDir: string,
  baseFileName: string,
): string | null {
  const draftFile = `${baseFileName}-draft.pdf`;
  const draftFilePath = path.join(docDir, draftFile);
  return fs.existsSync(draftFilePath) ? draftFilePath : null;
}
