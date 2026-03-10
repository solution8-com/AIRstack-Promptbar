# Nhost Serverless Functions

This directory contains serverless functions that will be deployed to Nhost.

## Structure

Each `.ts` or `.js` file in this directory becomes a serverless endpoint:
- `functions/hello.ts` → `/functions/v1/hello`
- `functions/health.ts` → `/functions/v1/health`

## Available Functions

### Health Check
**Endpoint:** `GET /functions/v1/health`

Returns the health status of the application.

```bash
curl https://your-app.nhost.run/functions/v1/health
```

### Hello World
**Endpoint:** `POST /functions/v1/hello`

A simple example function that accepts a name parameter.

```bash
curl -X POST https://your-app.nhost.run/functions/v1/hello \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice"}'
```

## Writing Functions

Functions should export a default async function that accepts `Request` and `Response` objects:

```typescript
import { Request, Response } from '@nhost/functions';

export default async (req: Request, res: Response) => {
  // Your function logic here
  res.status(200).json({ message: 'Success' });
};
```

## Environment Variables

Access environment variables using `process.env`:

```typescript
const apiKey = process.env.OPENAI_API_KEY;
```

## Learn More

- [Nhost Functions Documentation](https://docs.nhost.io/platform/serverless-functions)
- [Nhost Functions Examples](https://github.com/nhost/nhost/tree/main/examples)
