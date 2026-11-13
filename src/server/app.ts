import express, { ErrorRequestHandler } from 'express';
import { type PdfData } from '../pdfGeneration/generatePdfFromLatex';
import { timingSafeEqual } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { LatexError, PdfTimeoutError, BadRequestError } from './errors';

type Deps = { requestPdf: (data: PdfData) => Promise<Buffer>; apiKey: string };

function keysMatch(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b); // different length → false, no exception
}

export function requireApiKey(expected: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!keysMatch(req.get('x-api-key') ?? '', expected)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  };
}

export function createApp({ requestPdf, apiKey }: Deps) {
  const app = express();

  app.get('/health', (_req, res) => {
    res.status(200).end();
  });

  app.post(
    '/generate',
    requireApiKey(apiKey),
    express.json({ limit: '2mb' }),
    async (req, res) => {
      const { latex, images = [] } = req.body ?? {};

      if (typeof latex !== 'string' || latex.length === 0) {
        throw new BadRequestError('latex is required');
      }
      if (!Array.isArray(images)) {
        throw new BadRequestError('images must be an array');
      }

      const pdf = await requestPdf({ latex, images }); // a failure here goes straight to the error handler
      res.type('application/pdf').send(pdf);
    },
  );

  app.use(errorHandler);
  return app;
}

//
// Four parameters: that's how Express recognises an error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  // problems with the request body, reported by express.json()
  if (error.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Body is not valid JSON' });
    return;
  }
  if (error.type === 'entity.too.large') {
    res.status(413).json({ error: 'Request body too large' });
    return;
  }

  if (error instanceof BadRequestError) {
    // request itself is wrong. Some fields are wrong or missing
    res.status(400).json({ error: error.message });
    return;
  }
  if (error instanceof LatexError) {
    res.status(422).json({ error: error.message, log: error.log }); // the document itself is wrong
    return;
  }
  if (error instanceof PdfTimeoutError) {
    res.status(504).json({ error: 'PDF generation timed out' });
    return;
  }

  console.error('Unexpected error:', error);
  res.status(500).json({ error: 'Internal error' }); // no stack trace for the caller
};
