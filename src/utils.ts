import fs from 'fs-extra';

export function cleanDirectory(filePath: string) {
  const extensions = ['.tex', '.pdf', '.aux', '.log', '.out'];
  extensions.forEach((extension) => {
    const completeFilePath = `${filePath}${extension}`;
    if (fs.existsSync(completeFilePath)) {
      fs.unlinkSync(completeFilePath);
    }
  });
}

export function generateFileName() {
  return `latex_${Date.now()}`;
}

export function generateFilePath(tmpDir: string, fileName: string) {
  return `${tmpDir}/${fileName}`;
}

export function generateTmpDir() {
  const tmpDir = `${process.cwd()}/pdf-generation`;
  return tmpDir;
}
