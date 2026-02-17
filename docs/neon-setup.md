# Neon Setup

## 1) Variáveis de ambiente

No `.env` define:

- `DATABASE_URL` ou `NEON_DATABASE_URL`
- `VITE_AUTH_PROVIDER=neon`
- `VITE_NEON_AUTH_URL` (URL HTTP(S) do Neon Auth, não a URL `postgresql://`)
- `RESEND_API_KEY` e `RESEND_FROM_EMAIL` (para email transacional pós-registo)

Exemplo:

```env
VITE_NEON_AUTH_URL=https://ep-xxx.neonauth.us-east-2.aws.neon.build/neondb/auth
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=Portugal Road Watch <onboarding@teu-dominio.pt>
```

## 2) Arrancar em desenvolvimento

```bash
npm install
npm run dev
```

Isto arranca:

- frontend Vite em `http://localhost:8080`
- API backend em `http://localhost:8787`

## 3) Upload de fotos

As fotos são guardadas localmente em `server/uploads` e servidas por `/uploads/...`.

## 4) Schema automático

Ao iniciar a API, o schema mínimo é criado automaticamente na base Neon:

- `profiles`
- `potholes`
- `votes`
- `comments`

## 5) Produção

Publica frontend e backend separadamente, garantindo:

- backend com `DATABASE_URL`/`NEON_DATABASE_URL`
- frontend com `VITE_NEON_AUTH_URL`
- proxy/rewrite de `/api` e `/uploads` para o backend

## 6) Email com Resend

Quando configurado, o backend envia email após criação de conta via endpoint:

- `POST /api/auth/signup-email`

Se o Resend não estiver configurado, o endpoint responde `202` com `skipped=true` (não bloqueia o registo).
