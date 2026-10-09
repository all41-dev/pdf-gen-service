import { type Express } from 'express';
import express from 'express';
import { generatePdfFromLatex } from './generatePdfFromLatex';
import type { Image } from './generatePdfFromLatex';
import { startPdfClient } from './amqp/send';
export async function startServer() {
  const app: Express = express();
  app.use(express.json({ limit: '2mb' }));
  app.get('/health', (req, res) => {
    res.status(200).end();
  });
  await startPdfClient();
  app.post('/pdf/:uuid', async (req, res) => {
    const { latexTemplate = '', images = [] } = req.body ?? {};
    const uuid = req.params.uuid;
    if (typeof latexTemplate !== 'string' || latexTemplate.trim() === '') {
      res
        .status(400)
        .json({ error: '"latexTemplate" must be a non-empty string' });
      return;
    }
    if (!/^[a-zA-Z0-9-]+$/.test(uuid)) {
      res.status(400).json({ error: 'invalid uuid' });
      return;
    }
    if (!Array.isArray(images)) {
      res.status(400).json({ error: '"images" must be an array' });
      return;
    }
    try {
      const pdf = await generatePdfFromLatex(
        latexTemplate,
        uuid,
        images as Image[],
      );
      res.type('application/pdf').send(pdf);
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ error: 'Error generating PDF' });
    }
  });

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}
