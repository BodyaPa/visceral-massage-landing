# Ataraksia Frontend

Frontend for the Ataraksia site: Next.js App Router, React, TypeScript,
Tailwind CSS and `next-intl`.

## Requirements

- Node.js and npm
- Running backend API, by default at `http://localhost:8080`

## Local Development

Install dependencies:

```bash
npm install
```

Set the backend URL in `.env.local` when it differs from the default:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Start the development server:

```bash
npm run dev
```

Open the localized pages:

- `http://localhost:3000/ua`
- `http://localhost:3000/en`

## Checks

```bash
npm run lint
npm run build
```

## Production Start

Build and run the Next.js server:

```bash
npm run build
npm run start
```

`NEXT_PUBLIC_API_URL` must point to the API available to browser clients.
