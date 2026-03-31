# Package Configuration Manager

Temporary frontend for managing vcita packages. Authenticates against the operator-portal API.

> **Note:** The login page is temporary and will be replaced with SSO or another auth mechanism later.

## Prerequisites

- Node.js 18+
- Access to an operator-portal API instance (default: `http://localhost:7100`)

## Setup

```bash
cd app
npm install
```

## Development

```bash
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_OPERATOR_API_URL` | `http://localhost:7100` | Base URL of the operator-portal API |

Override by creating `.env.local`:

```
VITE_OPERATOR_API_URL=https://your-api-host.example.com
```

## Auth Flow

1. User enters operator email + password on `/login`.
2. App calls `POST {API}/operator_api/v1/authentications/login`.
3. If MFA is required, a verification code form is shown.
4. On success, the JWT is stored in `localStorage` and sent as `Authorization: <token>` on all API requests.
5. On 401, the token is cleared and the user is redirected to `/login`.

## Build

```bash
npm run build
```

Output goes to `dist/`.
