import path from 'path';
import fs from 'fs-extra';

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
