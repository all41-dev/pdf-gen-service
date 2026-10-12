import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { generatePdfFromLatex } from '../src/pdfGeneration/generatePdfFromLatex';
import { describe, it } from 'mocha';
import type { Image } from '../src/pdfGeneration/generatePdfFromLatex';

use(chaiAsPromised);
const templates = path.join(__dirname, 'latexTemplates');

describe('error handling', function () {
  this.timeout(20_000);
  const latexTemplate = String.raw`\documentclass{article}
\begin{document}
\invalidcommand
\end{document}`;
  it('rejects LaTeX with an undefined command', async () => {
    await expect(generatePdfFromLatex(latexTemplate, '0')).to.be.rejectedWith(
      /Undefined control sequence/,
    );
  });
});

describe('generatePdfFromLatex with valid input', function () {
  this.timeout(20_000);

  const cases: Array<{
    name: string;
    file: string;
    uuid: string;
    images: Image[];
  }> = [
    { name: 'simple invoice', file: 'test1.tex', uuid: '232', images: [] },
    {
      name: 'latex with images',
      file: 'test2.tex',
      uuid: '111',
      images: [
        {
          name: 'logo',
          source: {
            url: 'https://placehold.co/600x200/png?text=Test+Logo',
          },
        },
      ],
    },
  ];
  for (const { name, file, uuid, images } of cases) {
    it(`generates a PDF for ${name}`, async () => {
      const latex = await readFile(path.join(templates, file), 'utf-8');
      const pdf = await generatePdfFromLatex(latex, uuid, images);

      expect(pdf.subarray(0, 5).toString()).to.equal('%PDF-');
    });
  }
});
