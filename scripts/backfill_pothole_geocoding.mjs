import 'dotenv/config';
import { Pool } from 'pg';

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('NEON_DATABASE_URL ou DATABASE_URL não definida.');
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const PORTUGAL_TERRITORY_BOUNDS = [
  { minLat: 36.8, maxLat: 42.2, minLng: -9.7, maxLng: -6.0 },
  { minLat: 32.2, maxLat: 33.3, minLng: -17.6, maxLng: -16.0 },
  { minLat: 36.5, maxLat: 39.9, minLng: -31.9, maxLng: -24.0 },
];

function isWithinPortugalTerritory(lat, lng) {
  return PORTUGAL_TERRITORY_BOUNDS.some(
    (bounds) =>
      lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng,
  );
}

function pickFirst(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

async function reverseGeocodeNominatim(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
  const response = await fetch(url, {
    headers: {
      'Accept-Language': 'pt',
      'User-Agent': 'portugal-road-watch-backfill/1.0 (geocoding update script)',
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  if (!data?.display_name || !data?.address) {
    return null;
  }

  const countryCode = String(data.address.country_code || '').trim().toLowerCase();
  if (countryCode !== 'pt') {
    return null;
  }

  const road = pickFirst(
    data.address.road,
    data.address.pedestrian,
    data.address.footway,
    data.address.path,
    data.address.cycleway,
  );

  const houseNumber = pickFirst(data.address.house_number);
  const municipality = pickFirst(
    data.address.city,
    data.address.town,
    data.address.village,
    data.address.municipality,
    data.address.county,
  );

  const parish = pickFirst(
    data.address.suburb,
    data.address.city_district,
    data.address.neighbourhood,
    data.address.quarter,
    data.address.hamlet,
  ) || municipality;

  const district = pickFirst(data.address.state_district, data.address.state, data.address.county);
  const postalCode = pickFirst(data.address.postcode);

  const line1 = [road, houseNumber].filter(Boolean).join(', ');
  const line2 = [postalCode, municipality].filter(Boolean).join(' ');
  const normalized = [line1, parish, line2, district].filter(Boolean).join(', ');

  return {
    address: data.display_name,
    normalized_address: normalized || data.display_name,
    parish,
    municipality,
    district,
    postal_code: postalCode,
  };
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : null;

  const whereClause = `
    (parish is null or trim(parish) = '' or geocode_status is distinct from 'resolved')
    and not (
      geocode_status = 'failed'
      and geocoded_at is not null
      and municipality is null
    )
  `;

  const limitSql = Number.isFinite(limit) && limit > 0 ? `limit ${Math.floor(limit)}` : '';

  const { rows: candidates } = await pool.query(
    `
      select id, lat, lng, parish, geocode_status
      from public.potholes
      where ${whereClause}
      order by created_at asc
      ${limitSql}
    `,
  );

  if (candidates.length === 0) {
    console.log('Não existem reports para atualizar.');
    return;
  }

  console.log(`Encontrados ${candidates.length} reports para validar geocoding.`);
  if (dryRun) {
    console.log('Modo dry-run ativo: não serão feitas alterações na base de dados.');
  }

  let updated = 0;
  let failed = 0;
  let outOfPortugal = 0;
  let unresolved = 0;

  for (let index = 0; index < candidates.length; index += 1) {
    const row = candidates[index];
    const lat = Number(row.lat);
    const lng = Number(row.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      failed += 1;
      console.warn(`[${index + 1}/${candidates.length}] ${row.id} ignorado: coordenadas inválidas.`);
      continue;
    }

    if (!isWithinPortugalTerritory(lat, lng)) {
      outOfPortugal += 1;
      console.warn(`[${index + 1}/${candidates.length}] ${row.id} fora de Portugal.`);
      if (!dryRun) {
        await pool.query(
          `
            update public.potholes
            set geocode_status = 'failed', geocoded_at = now()
            where id = $1
          `,
          [row.id],
        );
      }
      continue;
    }

    try {
      const geocoded = await reverseGeocodeNominatim(lat, lng);

      if (!geocoded?.municipality) {
        unresolved += 1;
        console.warn(`[${index + 1}/${candidates.length}] ${row.id} sem concelho resolvido.`);
        if (!dryRun) {
          await pool.query(
            `
              update public.potholes
              set geocode_status = 'failed', geocoded_at = now()
              where id = $1
            `,
            [row.id],
          );
        }
      } else {
        if (!dryRun) {
          await pool.query(
            `
              update public.potholes
              set
                address = coalesce(nullif(address, ''), $2),
                normalized_address = $3,
                parish = $4,
                municipality = $5,
                district = $6,
                postal_code = $7,
                geocode_status = 'resolved',
                geocoded_at = now()
              where id = $1
            `,
            [
              row.id,
              geocoded.address,
              geocoded.normalized_address,
              geocoded.parish,
              geocoded.municipality,
              geocoded.district,
              geocoded.postal_code,
            ],
          );
        }

        updated += 1;
        console.log(
          `[${index + 1}/${candidates.length}] ${row.id} atualizado (${geocoded.municipality}).`,
        );
      }
    } catch (error) {
      failed += 1;
      console.error(`[${index + 1}/${candidates.length}] ${row.id} erro:`, error.message || error);
    }

    await sleep(1100);
  }

  console.log('--- Resumo ---');
  console.log(`Atualizados: ${updated}`);
  console.log(`Sem concelho resolvido: ${unresolved}`);
  console.log(`Fora de Portugal: ${outOfPortugal}`);
  console.log(`Erros: ${failed}`);
}

run()
  .catch((error) => {
    console.error('Falha no backfill de geocoding:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });