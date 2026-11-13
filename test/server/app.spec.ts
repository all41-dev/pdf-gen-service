import { expect } from 'chai';
import sinon from 'sinon';
import { AddressInfo } from 'node:net';
import { Server } from 'node:http';
import { createApp } from '../../src/server/app';
import { PdfTimeoutError, LatexError } from '../../src/server/errors';
const API_KEY = 'test-key';

describe('POST /generate', () => {
  let server: Server | undefined;

  // starts the app on a free port and returns its address
  async function start(requestPdf: sinon.SinonSpy): Promise<string> {
    const app = createApp({ requestPdf, apiKey: API_KEY });
    server = app.listen(0); // 0 = any free port
    await new Promise((resolve) => server!.once('listening', resolve));
    return `http://localhost:${(server.address() as AddressInfo).port}`;
  }

  afterEach(() => {
    afterEach(async () => {
      if (!server) return;
      server.closeAllConnections();
      await new Promise((resolve) => server!.close(resolve));
      server = undefined;
    });
  });

  function post(
    baseUrl: string,
    body: object,
    headers: Record<string, string> = { 'x-api-key': API_KEY },
  ) {
    return fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  }

  it('returns the PDF from requestPdf', async () => {
    const requestPdf = sinon.fake.resolves(Buffer.from('%PDF-fake'));
    const baseUrl = await start(requestPdf);

    const res = await post(baseUrl, {
      latex: '\\documentclass{article}',
      images: [],
    });

    expect(res.status).to.equal(200);
    expect(res.headers.get('content-type')).to.match(/application\/pdf/);
    expect(Buffer.from(await res.arrayBuffer()).toString()).to.equal(
      '%PDF-fake',
    );
    expect(requestPdf.calledOnce).to.equal(true);
  });

  it('rejects a wrong API key without calling requestPdf', async () => {
    const requestPdf = sinon.fake();
    const baseUrl = await start(requestPdf);

    const res = await post(
      baseUrl,
      { latex: 'x', images: [] },
      { 'x-api-key': 'wrong-key' },
    );

    expect(res.status).to.equal(401);
    expect(requestPdf.called).to.equal(false);
  });

  it('rejects a request without an API key', async () => {
    const requestPdf = sinon.fake();
    const baseUrl = await start(requestPdf);
    const res = await post(baseUrl, { latex: 'x', images: [] }, {});
    expect(res.status).to.equal(401);
    expect(requestPdf.called).to.equal(false);
  });

  it('rejects a missing latex without calling requestPdf', async () => {
    const requestPdf = sinon.fake();

    const baseUrl = await start(requestPdf);
    const res = await post(baseUrl, { images: [] });
    expect(res.status).to.equal(400);
    expect(requestPdf.called).to.equal(false);
  });

  it('returns 500 when generation fails', async () => {
    const requestPdf = sinon.fake.rejects(new Error('boom'));
    const baseUrl = await start(requestPdf);
    const res = await post(baseUrl, { latex: 'x', images: [] });
    expect(res.status).to.equal(500);
  });

  it('returns 422 with the log when the LaTeX does not compile', async () => {
    const requestPdf = sinon.fake.rejects(
      new LatexError(
        'LaTeX compilation failed',
        '! Undefined control sequence.',
      ),
    );
    const baseUrl = await start(requestPdf);

    const res = await post(baseUrl, { latex: '\\broken', images: [] });

    expect(res.status).to.equal(422);
    expect(await res.json()).to.deep.equal({
      error: 'LaTeX compilation failed',
      log: '! Undefined control sequence.',
    });
  });

  it('returns 504 when generation times out', async () => {
    const requestPdf = sinon.fake.rejects(new PdfTimeoutError());
    const baseUrl = await start(requestPdf);

    const res = await post(baseUrl, { latex: 'x', images: [] });

    expect(res.status).to.equal(504);
  });
});
