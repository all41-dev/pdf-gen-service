import { requestPdf, startPdfClient } from '../amqp/send';
import { createApp } from './app';

export async function startServer() {
  await startPdfClient();
  const app = createApp({ requestPdf });
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () =>
    console.log(`Server is running on http://localhost:${port}`),
  );
}
