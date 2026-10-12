import path from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';

import { cleanDirectory, generateTmpDir } from '../utils';
import { writeFile, readFile } from 'fs/promises';

const execFileAsync = promisify(execFile);

export interface PdfData {
  latexTemplate: string;
  uuid: string;
  images?: Image[];
}

type ImageSource = string | { url: string }; // base64 string, or a URL to download

export interface Image {
  name: string;
  source: ImageSource;
}

export async function generatePdfFromLatex(
  latexTemplate: string,
  uuid: string,
  images: Image[] = [],
): Promise<Buffer> {
  // Unique directory per call, so parallel jobs never collide
  const workDir = generateTmpDir();
  try {
    await writeImagesToDirectory(images, workDir); // awaited: images exist before compiling
    await writeFile(path.join(workDir, 'document.tex'), latexTemplate, 'utf8');

    try {
      await execFileAsync(
        'xelatex',
        [
          '-no-shell-escape',
          '-interaction=nonstopmode',
          '-halt-on-error',
          'document.tex',
        ],
        { cwd: workDir, timeout: 60_000 }, // run inside the directory: images resolve here
      );
    } catch (err) {
      const { stdout = '', message } = err as {
        stdout?: string;
        message: string;
      };
      const start = stdout.indexOf('\n!'); // LaTeX errors start with "!"
      const latexError =
        start === -1 ? message : stdout.slice(start + 1, start + 500);
      throw new Error(
        `LaTeX compilation failed (job ${uuid}):\n${latexError.trim()}`,
      );
    }

    return await readFile(path.join(workDir, 'document.pdf'));
  } finally {
    await cleanDirectory(workDir); // clean up, success or failure
  }
}

const SAFE_NAME = /^[a-zA-Z0-9_-]+$/;
const MAX_IMAGE_BYTES = 200 * 1024;
function detectExtension(buf: Buffer): 'png' | 'jpg' | 'pdf' | null {
  if (buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])))
    return 'png';
  if (buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpg';
  if (buf.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf';
  return null;
}

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`downloading ${url} failed: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function writeImagesToDirectory(images: Image[], dirPath: string) {
  for (const image of images) {
    if (!SAFE_NAME.test(image.name)) {
      throw new Error(`invalid image name "${image.name}"`);
    }
    const buf =
      typeof image.source === 'string'
        ? Buffer.from(image.source.replace(/^data:[^;]+;base64,/, ''), 'base64')
        : await downloadImage(image.source.url);

    if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) {
      throw new Error(`image "${image.name}" is empty or too large`);
    }
    const ext = detectExtension(buf);
    if (!ext) throw new Error(`image "${image.name}" is not PNG, JPG or PDF`);

    await writeFile(path.join(dirPath, `${image.name}.${ext}`), buf);
  }
}
