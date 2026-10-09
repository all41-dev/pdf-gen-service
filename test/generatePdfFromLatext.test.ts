import { expect } from 'chai';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { generatePdfFromLatex } from '../src/pdfGeneration/generatePdfFromLatex';
import { describe, it } from 'mocha';

const templates = path.join(__dirname, 'latexTemplates');

const cases = [
  { name: 'simple invoice', file: 'test1.tex', uuid: '232', images: [] },
  // add more cases here
];

describe('generatePdfFromLatex with valid input', function () {
  for (const { name, file, uuid, images } of cases) {
    it(`generates a PDF for ${name}`, async () => {
      const latex = await readFile(path.join(templates, file), 'utf-8');
      const pdf = await generatePdfFromLatex(latex, uuid, images);

      expect(pdf.subarray(0, 5).toString()).to.equal('%PDF-');
    });
  }

  cases;
});
