import { generateFilePathWithVersion } from './generateFilePathWithVersion';
import fs from 'fs-extra';

export function savePdfWithVersion(
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
