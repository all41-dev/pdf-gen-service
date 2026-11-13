# pdf-gen-service

A small service that turns LaTeX into PDF with XeLaTeX.

You send a LaTeX document (and the images it uses) over HTTP, and get the PDF back in the response. The service keeps nothing: no PDFs, no documents, no state between requests. Storing the result is the caller's job.

Internally, every request goes through a RabbitMQ queue, so several workers (and several instances of the service) can share the load, and the number of XeLaTeX runs at the same time stays limited.

```
client ──POST /generate──▶ HTTP handler ──job──▶ RabbitMQ queue ──▶ worker ──▶ XeLaTeX
client ◀──── PDF ───────── HTTP handler ◀─reply── reply queue ◀──── worker
```

## Requirements

- Node.js 22 or later
- XeLaTeX (e.g. TeX Live with `texlive-xetex`), plus the fonts your documents use
- RabbitMQ

Check that XeLaTeX is installed:

```bash
xelatex --version
```

## Getting started

```bash
npm install
cp .env.example .env.development   # then fill in the values
npm run dev
```

Check that it's running:

```bash
curl -i http://localhost:3100/health
```

## Configuration

All settings come from environment variables. The service refuses to start if a required one is missing.

| Variable       | Required | Description                                                                                                                                                              |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `API_KEY`      | yes      | Key clients must send in the `x-api-key` header. Generate one with `openssl rand -hex 32`.                                                                               |
| `RABBITMQ_URL` | yes      | e.g. `amqp://user:password@localhost:5672/vhost`. The vhost is the path at the end; for the default vhost `/`, use `%2F`. URL-encode special characters in the password. |
| `PORT`         | no       | HTTP port. Default: `3100`.                                                                                                                                              |

For local development, put the values in an env file. In production, set them in your platform's environment instead. Never commit real keys.

## API

### `POST /generate`

Compiles a LaTeX document and returns the PDF.

**Headers**

| Header         | Value                   |
| -------------- | ----------------------- |
| `x-api-key`    | the service's `API_KEY` |
| `Content-Type` | `application/json`      |

**Body** (at most 2 MB)

```json
{
  "latex": "\\documentclass{article}\\begin{document}Hello\\end{document}",
  "images": [
    { "name": "logo.png", "base64": "iVBORw0KGgoAAAANSUhEUgAA..." },
    { "name": "photo.jpg", "url": "https://example.com/photo.jpg" }
  ]
}
```

| Field    | Required | Description                                                                                                 |
| -------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `latex`  | yes      | The complete LaTeX document.                                                                                |
| `images` | no       | Images the document uses. Each one has a `name` and either `base64` content or a `url` to download it from. |

**Example**

```bash
curl -X POST http://localhost:3100/generate \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"latex":"\\documentclass{article}\\begin{document}Hello\\end{document}"}' \
  -o hello.pdf
```

**Responses**

| Status | Meaning                                                                                           | Body                                                  |
| ------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `200`  | PDF generated                                                                                     | the PDF (`application/pdf`)                           |
| `400`  | Invalid request: `latex` missing, `images` not a list, invalid image name, or body not valid JSON | `{ "error": "..." }`                                  |
| `401`  | Missing or wrong API key                                                                          | `{ "error": "Unauthorized" }`                         |
| `413`  | Body larger than 2 MB                                                                             | `{ "error": "..." }`                                  |
| `422`  | The LaTeX doesn't compile                                                                         | `{ "error": "...", "log": "end of the XeLaTeX log" }` |
| `504`  | No result in time (the service is overloaded or a worker is stuck)                                | `{ "error": "PDF generation timed out" }`             |
| `500`  | Unexpected error in the service                                                                   | `{ "error": "Internal error" }`                       |

For a `422`, the `log` field contains the end of XeLaTeX's log, which is where the error is described.

### `GET /health`

Returns `200` with an empty body when the service is up. Doesn't require an API key.

## Images

Before compiling, the service writes every image from the request into an `images/` folder next to the document. Reference them from there:

```latex
\usepackage{graphicx}
\graphicspath{{images/}}
...
\includegraphics[width=4cm]{logo.png}
```

or directly as `\includegraphics{images/logo.png}`.

Image names must be plain file names: letters, digits, `_`, `-` and `.`, with an image extension (`.png`, `.jpg`, `.jpeg`, `.pdf`). Names with folders (`a/b.png`, `../x.png`) or starting with a dot are rejected with `400`.

Prefer `base64` for images that belong to the caller (logos, signatures). Use `url` only for images the service itself is allowed and able to reach.

## How it works

1. The HTTP handler checks the API key and the body.
2. It publishes a job to the queue `pdf.generate`, with a unique `correlationId` and the name of its own reply queue (`replyTo`), then waits.
3. A worker takes the job, writes the document and images into a new temporary folder, and runs XeLaTeX there.
4. The worker sends the PDF (or the error) to the reply queue, with the same `correlationId`, and deletes the temporary folder.
5. The HTTP handler matches the reply to the waiting request by its `correlationId`, and answers the client.

Each instance has its own reply queue, so a reply always reaches the instance that is waiting for it, even when another instance's worker did the work.

### Scaling

- **More XeLaTeX runs per instance:** raise the number of workers (each takes one job at a time).
- **More instances:** start the service again with the same `RABBITMQ_URL`. All instances take jobs from the same queue.

When more requests arrive than the workers can handle, jobs wait in the queue. Callers should use a timeout that allows for that wait, e.g. 60–120 seconds.

## Security

- **API key.** Every `/generate` request needs the key. It is compared in constant time. Use HTTPS when the service is reachable over the internet, otherwise the key can be read in transit. Better still, keep the service on an internal network only.
- **No shell escape.** XeLaTeX runs with `-no-shell-escape`, so a document can't run programs.
- **File access.** A LaTeX document can still read files the process has access to (e.g. `\input{/etc/passwd}`). Set `openin_any = p` in the TeX configuration to restrict reading to the working folder, and run the service as an unprivileged user.
- **URL images.** The service downloads any URL it receives. Only accept requests from trusted callers, and don't expose the service to the internet without that in mind: otherwise it can be used to reach addresses on your internal network.
- **Isolation between requests.** Each job runs in its own temporary folder, which is deleted afterwards, whether compilation succeeded or not.

## Development

```bash
npm run dev         # run from source, restarts on changes
npm run build       # compile to dist/
npm start           # run the compiled version
npm test            # run the tests
npx tsc --noEmit    # type check only
```

The HTTP tests use a fake `requestPdf` and a test API key, so they need neither RabbitMQ nor XeLaTeX. The tests that compile real documents need XeLaTeX installed.

## Docker

The repository includes a `Dockerfile` with XeLaTeX and common fonts. Build the image, then run it with the required environment variables:

```bash
docker build -t pdf-gen-service .

docker run --rm --init -p <host-port>:<port> \
  -e PORT=<port> \
  -e API_KEY='<your-api-key>' \
  -e RABBITMQ_URL='amqp://<user>:<password>@<rabbitmq-host>:<rabbitmq-port>/<vhost>' \
  pdf-gen-service
```

- `PORT` is the port the service listens on inside the container (default: `3100`). The second number in `-p` must be the same.
- `<host-port>` is where the service is reachable on your machine. It can be any free port.
- `<rabbitmq-port>` is your RabbitMQ's AMQP port (RabbitMQ's default is `5672`).

Check that it's running:

```bash
curl -i http://localhost:<host-port>/health
```

### Connecting to RabbitMQ

Inside a container, `localhost` is the container itself, not your machine. To reach a RabbitMQ that runs:

- **on your machine** (e.g. for local testing): use `host.docker.internal` as the host. On Linux, also add `--add-host=host.docker.internal:host-gateway` to `docker run`.
- **in the same Docker Compose project:** use the RabbitMQ service's name as the host, e.g. `amqp://user:password@rabbitmq:5672/vhost`.
- **elsewhere:** use its normal address.

### Fonts and LaTeX packages

The image contains `texlive-xetex`, `texlive-fonts-recommended` and `fonts-liberation`.
If your documents need other LaTeX packages or fonts, compilation fails with a `422` whose log names the missing file, e.g. `File 'xyz.sty' not found`.
Add the matching Debian package to the `apt-get install` line in the `Dockerfile` and rebuild.

## License

MIT. See [LICENSE](LICENSE).
