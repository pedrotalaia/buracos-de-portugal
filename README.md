# Portugal Road Watch

Aplicação web para reportar, visualizar e acompanhar buracos em estradas de Portugal.

## Stack

- Vite
- React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Database, Auth, Storage, Edge Functions)
- React Leaflet

## Requisitos

- Node.js 18+
- npm 9+
- Supabase CLI (opcional, para funções/migrations locais)

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
npm run build
npm run preview
npm run test
npm run lint
```

## Configuração de ambiente

Criar um ficheiro .env com as variáveis necessárias do Supabase:

```sh
VITE_SUPABASE_URL=<url>
VITE_SUPABASE_ANON_KEY=<anon_key>
```

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
