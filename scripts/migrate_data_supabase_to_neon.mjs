import 'dotenv/config';
import { Pool } from 'pg';

const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
const supabasePassword = process.env.SUPABASE_PASSWORD;

const baseSourceUrl = process.env.SUPABASE_DB_URL || (
  projectId && supabasePassword
    ? `postgresql://postgres.${projectId}:${encodeURIComponent(supabasePassword)}@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require&uselibpqcompat=true`
    : null
);

const sourceUrl = baseSourceUrl
  ? (baseSourceUrl.includes('uselibpqcompat=')
      ? baseSourceUrl
      : `${baseSourceUrl}${baseSourceUrl.includes('?') ? '&' : '?'}uselibpqcompat=true`)
  : null;

const targetUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!sourceUrl) {
  throw new Error('SUPABASE_DB_URL não definida e faltam VITE_SUPABASE_PROJECT_ID/SUPABASE_PASSWORD.');
}

if (!targetUrl) {
  throw new Error('NEON_DATABASE_URL ou DATABASE_URL não definida.');
}

const source = new Pool({
  connectionString: sourceUrl,
  ssl: { rejectUnauthorized: false },
});

const target = new Pool({
  connectionString: targetUrl,
  ssl: { rejectUnauthorized: false },
});

const dataTables = ['profiles', 'potholes', 'votes', 'comments'];

function toInsertStatement(table, columns, row, valueOffset = 1) {
  const quotedCols = columns.map((c) => `"${c}"`).join(', ');
  const placeholders = columns.map((_, idx) => `$${idx + valueOffset}`).join(', ');
  const values = columns.map((c) => row[c]);
  return {
    sql: `insert into public.${table} (${quotedCols}) values (${placeholders})`,
    values,
  };
}

function toBatchInsertStatement(table, columns, rows) {
  const quotedCols = columns.map((c) => `"${c}"`).join(', ');
  const values = [];

  const groups = rows.map((row, rowIndex) => {
    const placeholders = columns.map((c, colIndex) => {
      values.push(row[c]);
      return `$${rowIndex * columns.length + colIndex + 1}`;
    });
    return `(${placeholders.join(', ')})`;
  });

  return {
    sql: `insert into public.${table} (${quotedCols}) values ${groups.join(', ')}`,
    values,
  };
}

async function getCount(pool, table) {
  const { rows } = await pool.query(`select count(*)::int as count from public.${table}`);
  return rows[0].count;
}

async function insertRows(table, rows) {
  if (rows.length === 0) {
    console.log(`- ${table}: 0 linhas`);
    return;
  }

  const columns = Object.keys(rows[0]);
  const batchSize = 500;
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const { sql, values } = toBatchInsertStatement(table, columns, batch);
    await target.query(sql, values);
  }

  console.log(`- ${table}: ${rows.length} linhas`);
}

async function migrateTable(table) {
  console.log(`  a ler ${table}...`);
  const { rows } = await source.query(`select * from public.${table}`);
  await insertRows(table, rows);
  return rows;
}

async function run() {
  try {
    console.log('[1/4] Conectividade');
    await source.query("select 'supabase_ok' as status");
    await target.query("select 'neon_ok' as status");

    console.log('[2/4] Limpar destino (Neon)');
    await target.query('truncate table public.comments restart identity cascade');
    await target.query('truncate table public.votes restart identity cascade');
    await target.query('truncate table public.potholes restart identity cascade');
    await target.query('truncate table public.profiles restart identity cascade');

    console.log('[3/4] Copiar dados Supabase -> Neon');
    for (const table of dataTables) {
      await migrateTable(table);
    }

    console.log('[4/4] Validar contagens');
    for (const table of dataTables) {
      const sourceCount = await getCount(source, table);
      const targetCount = await getCount(target, table);
      console.log(`  ${table}: supabase=${sourceCount} | neon=${targetCount}`);
      if (sourceCount !== targetCount) {
        throw new Error(`Contagem divergente em ${table}: ${sourceCount} != ${targetCount}`);
      }
    }

    console.log('Migração concluída com sucesso.');
  } catch (error) {
    throw error;
  } finally {
    await source.end();
    await target.end();
  }
}

run().catch((error) => {
  console.error('Falha na migração:', error.message);
  process.exit(1);
});
