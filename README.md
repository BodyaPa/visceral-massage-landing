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
npm run test
npm run lint
npm run build
```

## Authentication Requests

Authentication uses backend `HttpOnly` cookies; JWT values are never stored in
frontend storage. Before an unsafe API request, the frontend fetches
`GET /api/auth/csrf` and submits the returned token through the
`X-XSRF-TOKEN` header. This behavior is shared by auth forms and RTK Query
mutations.

The localized `/[lang]/auth` screen contains both login and registration
modes. Login accepts phone or email; Ukrainian phone input may use either
`+380...` or local `0XXXXXXXXX` form. Registration collects a display name and
requires at least one of phone/email. Its password checklist reflects the API
rule: 12 or more characters with uppercase, lowercase, number and special
character. Auth mutations retry once with a freshly issued CSRF token if a
stale token/cookie pair is rejected. Legacy `/login` and `/register` routes
redirect to the corresponding mode.

## UI Notifications

`ToastProvider` is mounted in the localized layout above both the header and
page content. Client components can display a centered localized result
notification through `useToast()`:

```tsx
const toast = useToast();
toast.success(t("saveSuccess"));
toast.error(t("saveError"));
```

Authentication currently uses this shared surface for login, registration and
logout results. Messages passed to it must already be localized by the calling
feature.

## Production Start

Build and run the Next.js server:

```bash
npm run build
npm run start
```

`NEXT_PUBLIC_API_URL` must point to the API available to browser clients.
