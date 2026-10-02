import fs from 'fs-extra';
import path from 'path';

export function getLatestVersionFile(
  docDir: string,
  baseFileName: string,
): string | null {
  try {
    // Ensure the directory exists
    if (!fs.existsSync(docDir)) {
      fs.mkdirSync(docDir, { recursive: true });
    }

    const files = fs
      .readdirSync(docDir)
      .filter((file) => file.startsWith(baseFileName) && file.endsWith('.pdf'));

    const latestFile = files
      .map((file) => ({
        name: file,
        version: parseInt(file.match(/-v(\d+)\.pdf$/)?.[1] || '0', 10),
      }))
      .sort((a, b) => b.version - a.version)[0]?.name;

    return latestFile ? path.join(docDir, latestFile) : null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error handling directory ${docDir}:`, error);
    return null;
  }
}
