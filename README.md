# Portugal Road Watch

Aplicação web para reportar, visualizar e acompanhar buracos em estradas de Portugal.

## Stack

- Vite
- React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Database, Auth, Storage, Edge Functions)
- React Leaflet

## Requisitos

- Docker e Docker Compose
- Supabase CLI — [instalar aqui](https://supabase.com/docs/guides/cli/getting-started)

Ou, sem Docker:

- Node.js 18+
- npm 9+
- Supabase CLI

## Setup local (Docker — recomendado)

```sh
git clone https://github.com/wods-agency/portugal-road-watch.git
cd portugal-road-watch
cp .env.example .env

# Inicia o Supabase local (base de dados, auth, storage)
supabase start

# Copia o API URL e anon key do output acima para o ficheiro .env

# Inicia a aplicação
docker compose up
```

App local: http://localhost:8080

Para parar:

```sh
docker compose down
supabase stop
```

## Setup local (sem Docker)

```sh
git clone https://github.com/wods-agency/portugal-road-watch.git
cd portugal-road-watch
cp .env.example .env

supabase start
# Copia o API URL e anon key para o .env

npm install
npm run dev
```

App local: http://localhost:8080

## Scripts

```sh
npm run dev
npm run build
npm run preview
npm run test
npm run lint
```

## Configuração de ambiente

Copiar `.env.example` para `.env` e preencher com os valores do `supabase start`:

```sh
cp .env.example .env
```

Ver `.env.example` para a lista completa de variáveis (obrigatórias e opcionais).

## Funcionalidades principais

- Mapa com marcadores e opção de clusters
- Filtros por severidade/estado e pesquisa de localização
- Reporte de buracos com foto
- Estatísticas de buracos e votos
- Preenchimento automático de morada por coordenadas quando não é indicada manualmente

## Supabase

### Migration de geocoding

Foi adicionada uma migration para campos de morada normalizada e estado de geocoding:

- supabase/migrations/20260215210000_add_geocoding_normalized_address_fields.sql

### Edge Functions

- archive-old-potholes
- backfill-pothole-addresses

Invocar manualmente o backfill:

```sh
supabase functions invoke backfill-pothole-addresses --no-verify-jwt --project-ref <project-ref> --query "limit=100"
```

Recomendação: executar 1 vez por dia (fim do dia) via scheduler.

## Deploy

Build de produção:

```sh
npm run build
```

Publicar os ficheiros de dist no teu provider de hosting (Vercel, Netlify, Cloudflare Pages, etc.).
