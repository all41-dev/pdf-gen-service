import fs from 'fs-extra';
import path from 'path';

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
