// test/app.test.ts
import { expect } from 'chai';
import request from 'supertest';
import sinon from 'sinon';
import { createApp } from '../../src/server/app';

describe('POST /pdf/:uuid', () => {
  it('returns the PDF from requestPdf', async () => {
    const requestPdf = sinon.fake.resolves(Buffer.from('%PDF-fake'));
    const app = createApp({ requestPdf });

    const res = await request(app)
      .post('/pdf/abc-123')
      .send({ latexTemplate: '\\documentclass{article}', images: [] })
      .expect(200)
      .expect('Content-Type', /application\/pdf/);

    expect(res.body.toString()).to.equal('%PDF-fake');
    expect(requestPdf.calledOnce).to.equal(true);
    expect(requestPdf.firstCall.args[0].uuid).to.equal('abc-123');
  });

  it('rejects a missing latexTemplate without calling requestPdf', async () => {
    const requestPdf = sinon.fake();
    await request(createApp({ requestPdf }))
      .post('/pdf/abc-123')
      .send({ images: [] })
      .expect(400);
    expect(requestPdf.called).to.equal(false);
  });

  it('returns 500 when generation fails', async () => {
    const requestPdf = sinon.fake.rejects(new Error('boom'));
    await request(createApp({ requestPdf }))
      .post('/pdf/abc-123')
      .send({ latexTemplate: 'x', images: [] })
      .expect(500);
  });
});
