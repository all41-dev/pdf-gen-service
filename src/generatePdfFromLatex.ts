import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import fs from 'fs-extra';
import { generateTmpDir } from './utils';

const execAsync = promisify(exec);

type ImageSource = string | { url: string }; // base64 string, or a URL to download

export interface Image {
  name: string;
  source: ImageSource;
}

export async function generatePdfFromLatex(
  latexTemplate: string,
  uuid: string,
  images: Image[] = [],
) {
  const tmpDir = `${generateTmpDir()}/${uuid}`;
  fs.ensureDirSync(tmpDir);
  if (images.length > 0) {
    writeImagesToDirectory(images, tmpDir);
  }
  const filepath = path.join(tmpDir, uuid);

  fs.writeFileSync(`${filepath}.tex`, latexTemplate);
  console.log('filepath', filepath);
  const cmd = `xelatex -halt-on-error ${filepath}.tex`;
  const { stderr } = await execAsync(cmd, { cwd: tmpDir });
  if (stderr) {
    throw new Error(`Error compiling LaTeX to PDF: ${stderr}`);
  }
  const pdfBuffer = fs.readFileSync(`${filepath}.pdf`);
  return pdfBuffer;
}

async function writeImagesToDirectory(images: Image[], dirPath: string) {
  for (const image of images) {
    const imagePath = `${path.join(dirPath, image.name)}.png`;
    if (typeof image.source === 'string') {
      fs.writeFileSync(imagePath, image.source, 'base64');
    } else {
      const fetchedImage = await fetch(image.source.url);
      fs.writeFileSync(
        imagePath,
        Buffer.from(await fetchedImage.arrayBuffer()),
      );
    }
  }
}
