

## Ciclo de vida dos buracos e compressão de imagens

### 1. Novo estado "archived" para buracos antigos

Atualmente os buracos têm 3 estados: `reported`, `repairing`, `repaired`. A ideia e adicionar um 4o estado **`archived`** para buracos reparados ha mais de 30 dias. Isto permite:

- Manter o historico completo (nada e apagado)
- Esconder buracos antigos do mapa por defeito
- Permitir reabrir um buraco arquivado se voltar a aparecer

**Migracoes necessarias:**

- Alterar o enum `pothole_status` para incluir `archived`
- Adicionar coluna `repaired_at` (timestamp) na tabela `potholes` para saber quando foi marcado como reparado
- Criar uma funcao de base de dados (cron ou invocada) que marca como `archived` buracos reparados ha mais de 30 dias

**Arquivamento automatico:**

Sera criada uma edge function `archive-old-potholes` que:
- Procura buracos com `status = 'repaired'` e `repaired_at < now() - 30 dias`
- Atualiza o status para `archived`
- Pode ser chamada periodicamente (via cron externo ou manualmente)

### 2. Reabrir um buraco

Se um buraco volta a aparecer no mesmo sitio, o utilizador pode:
- Clicar no marcador do buraco (se visivel) e usar um botao "Reabrir"
- Ou reportar um novo buraco na mesma localizacao

O botao "Reabrir" muda o estado de volta para `reported`, limpa o `repaired_at`, e incrementa um contador de reaberturas.

**Alteracoes:**
- Adicionar coluna `reopen_count` (integer, default 0) na tabela `potholes`
- Adicionar botao "Reabrir" no popup do mapa para buracos `repaired` ou `archived`
- Ao reabrir: `status = 'reported'`, `repaired_at = null`, `reopen_count += 1`

### 3. Filtro de buracos arquivados

- Por defeito, buracos `archived` ficam escondidos no mapa
- Adicionar um toggle nos filtros: "Mostrar arquivados"
- Na pagina de estatisticas, os arquivados contam para os totais historicos

### 4. Compressao de imagens no frontend

Antes de enviar a foto para o storage, comprimir no browser usando Canvas API:
- Redimensionar para max 1200px de largura
- Comprimir para JPEG com qualidade 0.7
- Isto reduz fotos de telemovel de ~5MB para ~200-400KB

**Implementacao:**
- Criar funcao utilitaria `compressImage(file: File): Promise<File>` em `src/lib/imageUtils.ts`
- Usar `HTMLCanvasElement` para redimensionar e re-codificar
- Chamar antes do upload no `ReportDialog.tsx`
- Converter sempre para `.jpg` independentemente do formato original

### 5. Eliminacao de buracos

Apenas o criador do buraco pode eliminar o seu reporte (ja suportado pelas politicas RLS). Sera adicionado:
- Botao "Eliminar" no popup do mapa (visivel apenas para o criador)
- Confirmacao antes de eliminar
- Eliminacao em cascata dos votos e comentarios associados

---

### Detalhes tecnicos

**Migracao SQL:**
```
ALTER TYPE pothole_status ADD VALUE 'archived';
ALTER TABLE potholes ADD COLUMN repaired_at timestamptz;
ALTER TABLE potholes ADD COLUMN reopen_count integer NOT NULL DEFAULT 0;
```

**Edge function `archive-old-potholes`:**
- Usa service role key para bypass RLS
- Query: `UPDATE potholes SET status = 'archived' WHERE status = 'repaired' AND repaired_at < now() - interval '30 days'`

**Compressao de imagem (`src/lib/imageUtils.ts`):**
```text
File input -> Image element -> Canvas (max 1200px) -> toBlob('image/jpeg', 0.7) -> File output
```

**Ficheiros a criar/editar:**
- `src/lib/imageUtils.ts` (novo) -- funcao de compressao
- `src/types/pothole.ts` -- adicionar `archived` ao tipo Status e labels
- `src/components/Map/ReportDialog.tsx` -- usar compressao antes do upload
- `src/components/Map/PotholeMap.tsx` -- botoes Reabrir/Eliminar no popup
- `src/components/Map/MapFilters.tsx` -- toggle "Mostrar arquivados"
- `src/hooks/usePotholes.ts` -- filtrar arquivados por defeito
- `src/pages/Index.tsx` -- estado para toggle de arquivados
- `src/pages/Stats.tsx` -- incluir arquivados nos totais
- Edge function `supabase/functions/archive-old-potholes/index.ts`
- Migracao SQL para enum + colunas novas
