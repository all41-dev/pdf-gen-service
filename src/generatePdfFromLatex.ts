import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

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

export async function generatePdfFromLatex(
  latexTemplate: string,
  filePath: string,
) {
  const tmpDir = generateTmpDir();
  fs.ensureDirSync(tmpDir);

  fs.writeFileSync(`${tmpDir}/${filePath}.tex`, latexTemplate);

  const cmd = `xelatex -output-directory ${tmpDir} -halt-on-error ${filePath}.tex`;
  const { stderr } = await execAsync(cmd);
  if (stderr) {
    throw new Error(`Error compiling LaTeX to PDF: ${stderr}`);
  }
  const pdfBuffer = fs.readFileSync(`${tmpDir}/${filePath}.pdf`);
  return pdfBuffer;
}

export function generateFilePathWithVersion(
  baseDir: string,
  contactName: string,
  uuid: string,
  docType: string,
  baseFileName: string,
) {
  const contactDir = path.join(baseDir, `${contactName}_${uuid}`);
  const docDir = path.join(contactDir, docType);

  fs.ensureDirSync(docDir);

  const existingFiles = fs
    .readdirSync(docDir)
    .filter((file) => file.startsWith(baseFileName) && file.endsWith('.pdf'));

  const latestVersion = existingFiles
    .map((file) => {
      const match = file.match(/-v(\d+)\.pdf$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .reduce((max, curr) => Math.max(max, curr), 0);

  const newVersion = latestVersion + 1;
  const fileName = `${baseFileName}-v${String(newVersion).padStart(2, '0')}.pdf`;
  return path.join(docDir, fileName);
}

export function savePdfWithVersioning(
  baseDir: string,
  contactName: string,
  uuid: string,
  docType: string,
  baseFileName: string,
  pdfBuffer: Buffer,
) {
  const filePath = generateFilePathWithVersion(
    baseDir,
    contactName,
    uuid,
    docType,
    baseFileName,
  );

  fs.writeFileSync(filePath, pdfBuffer);

  return filePath;
}

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

export function getDraftFile(
  docDir: string,
  baseFileName: string,
): string | null {
  const draftFile = `${baseFileName}-draft.pdf`;
  const draftFilePath = path.join(docDir, draftFile);
  return fs.existsSync(draftFilePath) ? draftFilePath : null;
}

export function saveDraftPdf(
  baseDir: string,
  contactName: string,
  uuid: string,
  docType: string,
  baseFileName: string,
  pdfBuffer: Buffer,
): string {
  const draftFilePath = path.join(
    baseDir,
    `${contactName}_${uuid}`,
    docType,
    `${baseFileName}-draft.pdf`,
  );

  fs.ensureDirSync(path.dirname(draftFilePath));
  fs.writeFileSync(draftFilePath, pdfBuffer);

  return draftFilePath;
}
