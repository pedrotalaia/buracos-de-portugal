# Portugal Road Watch

Aplicação web para reportar, visualizar e acompanhar buracos em estradas de Portugal.

## Stack

- Vite
- React + TypeScript
- Tailwind CSS + shadcn/ui
- Neon Postgres
- Neon Auth
- API Node/Express (camada backend)
- React Leaflet

## Requisitos

- Node.js 18+
- npm 9+

## Setup local

```sh
git clone <URL_DO_REPOSITORIO>
cd portugal-road-watch
npm install
npm run dev
```

App local: http://localhost:8080

## Scripts

```sh
npm run dev
npm run dev:web
npm run dev:api
npm run build
npm run preview
npm run test
npm run lint
```

## Configuração de ambiente

Cria `.env` a partir de `.env.example` e preenche as variáveis:

```sh
cp .env.example .env
```

Configuração Neon:

```sh
DATABASE_URL=<neon_postgres_url>
NEON_DATABASE_URL=<neon_postgres_url>
VITE_AUTH_PROVIDER=neon
VITE_NEON_AUTH_URL=<neon_auth_url>
RESEND_API_KEY=<resend_api_key>
RESEND_FROM_EMAIL=Portugal Road Watch <onboarding@teu-dominio.pt>
VITE_API_BASE_URL=<url_publica_da_tua_api_express>
VITE_UPLOADS_BASE_URL=<url_publica_da_tua_api_express>
```

Notas:

- Sem `VITE_NEON_AUTH_URL`, o login/registo Neon Auth não funciona.
- Com `RESEND_API_KEY` + `RESEND_FROM_EMAIL`, o backend envia um email transacional após registo (`POST /api/auth/signup-email`).
- Em produção, se frontend e backend estiverem em domínios diferentes, define `VITE_API_BASE_URL` (ex.: `https://api.buracosdeportugal.pt`) para evitar 404 em `/api/*`.
- Se as imagens estiverem a ser servidas pelo backend (`/uploads/*`), define `VITE_UPLOADS_BASE_URL` (normalmente igual ao `VITE_API_BASE_URL`).

Opcional (geocoding):

```sh
VITE_GEOCODING_PROVIDER=nominatim
```

## Funcionalidades principais

- Mapa com marcadores e opção de clusters
- Filtros por severidade/estado e pesquisa de localização
- Reporte de buracos com foto
- Estatísticas de buracos e votos
- Preenchimento automático de morada por coordenadas quando não é indicada manualmente

## Backend Neon API

A API local corre em `http://localhost:8787` e expõe:

- `GET /api/potholes`
- `POST /api/potholes` (com upload opcional de foto)
- `PATCH /api/potholes/:id/reopen`
- `DELETE /api/potholes/:id`
- `GET /api/comments?potholeId=...`
- `POST /api/comments`
- `GET /api/votes/status`
- `POST /api/votes/toggle`
- `GET /api/profiles/:id`
- `PUT /api/profiles/:id`

## Deploy

Build de produção:

```sh
npm run build
```

Publicar os ficheiros de dist no teu provider de hosting (Vercel, Netlify, Cloudflare Pages, etc.).

### Vercel sem subdomínio API

Se não tens `api.<dominio>`, podes servir a API no mesmo domínio da app usando Vercel Functions:

- As rotas backend estão expostas via [api/[...all].js](api/[...all].js) e respondem em `/api/*`.
- Não é necessário `VITE_API_BASE_URL` para este cenário (usa o mesmo domínio).
- Define as variáveis de ambiente no projeto Vercel (Production/Preview):
	- `DATABASE_URL`
	- `NEON_DATABASE_URL`
	- `VITE_AUTH_PROVIDER`
	- `VITE_NEON_AUTH_URL`
	- `RESEND_API_KEY`
	- `RESEND_FROM_EMAIL`

Nota: uploads em disco em runtime serverless são temporários; para produção recomenda-se storage persistente (S3, Supabase Storage, etc.).
