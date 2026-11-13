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
    await expect(generatePdfFromLatex(latexTemplate)).to.be.rejectedWith(
      /Undefined control sequence/,
    );
  });
});

describe('generatePdfFromLatex with valid input', function () {
  this.timeout(20_000);

  const cases: Array<{
    name: string;
    file: string;
    images: Image[];
  }> = [
    { name: 'simple invoice', file: 'test1.tex', images: [] },
    {
      name: 'latex with images',
      file: 'test2.tex',

      images: [
        {
          name: 'logo.png',
          source: {
            url: 'https://placehold.co/600x200/png?text=Test+Logo',
          },
        },
      ],
    },
  ];
  for (const { name, file, images } of cases) {
    it(`generates a PDF for ${name}`, async () => {
      const latex = await readFile(path.join(templates, file), 'utf-8');
      const pdf = await generatePdfFromLatex(latex, images);

      expect(pdf.subarray(0, 5).toString()).to.equal('%PDF-');
    });
  }
});
