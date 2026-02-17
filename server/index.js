import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { initSchema, pool } from './db.js';
import { isResendConfigured, sendSignupEmail } from './resend.js';

const app = express();
const port = Number(process.env.API_PORT || 8787);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, 'uploads');

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

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${unique}-${sanitized}`);
  },
});

const upload = multer({ storage });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/signup-email', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const appUrl = typeof req.body?.appUrl === 'string' ? req.body.appUrl.trim() : '';

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      res.status(400).json({ message: 'Email inválido.' });
      return;
    }

    if (!isResendConfigured()) {
      res.status(202).json({ queued: false, skipped: true, reason: 'resend-not-configured' });
      return;
    }

    await sendSignupEmail({ toEmail: email, appUrl });
    res.status(202).json({ queued: true });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao enviar email de boas-vindas.', error: String(error) });
  }
});

app.get('/api/potholes', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      select
        p.*,
        coalesce(v.vote_count, 0) as votes,
        coalesce(c.comment_count, 0) as comments_count
      from public.potholes p
      left join (
        select pothole_id, count(*)::int as vote_count
        from public.votes
        group by pothole_id
      ) v on v.pothole_id = p.id
      left join (
        select pothole_id, count(*)::int as comment_count
        from public.comments
        group by pothole_id
      ) c on c.pothole_id = p.id
      order by p.created_at desc
    `);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar buracos.', error: String(error) });
  }
});

app.post('/api/potholes', upload.single('photo'), async (req, res) => {
  try {
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const {
      user_id,
      lat,
      lng,
      address,
      normalized_address,
      parish,
      municipality,
      district,
      postal_code,
      geocode_status,
      description,
      severity,
    } = req.body;

    const parsedLat = Number(lat);
    const parsedLng = Number(lng);

    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      res.status(400).json({ message: 'Latitude/longitude inválidas.' });
      return;
    }

    if (!isWithinPortugalTerritory(parsedLat, parsedLng)) {
      res.status(400).json({ message: 'Só é permitido reportar buracos em Portugal (continente e ilhas).' });
      return;
    }

    const { rows } = await pool.query(
      `
        insert into public.potholes (
          user_id, lat, lng, address, normalized_address, parish, municipality, district,
          postal_code, geocode_status, description, photo_url, severity
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        returning *
      `,
      [
        user_id || null,
        parsedLat,
        parsedLng,
        address || null,
        normalized_address || null,
        parish || null,
        municipality || null,
        district || null,
        postal_code || null,
        geocode_status || 'pending',
        description || null,
        photoUrl,
        severity || 'moderate',
      ],
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar buraco.', error: String(error) });
  }
});

app.patch('/api/potholes/:id/reopen', async (req, res) => {
  try {
    const { id } = req.params;
    const { reopen_count } = req.body;

    const { rows } = await pool.query(
      `
        update public.potholes
        set status = 'reported', repaired_at = null, reopen_count = $2
        where id = $1
        returning *
      `,
      [id, Number(reopen_count)],
    );

    if (!rows[0]) {
      res.status(404).json({ message: 'Buraco não encontrado.' });
      return;
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao reabrir buraco.', error: String(error) });
  }
});

app.delete('/api/potholes/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('begin');
    await client.query('delete from public.votes where pothole_id = $1', [id]);
    await client.query('delete from public.comments where pothole_id = $1', [id]);
    const { rowCount } = await client.query('delete from public.potholes where id = $1', [id]);
    await client.query('commit');

    if (!rowCount) {
      res.status(404).json({ message: 'Buraco não encontrado.' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    await client.query('rollback');
    res.status(500).json({ message: 'Erro ao eliminar buraco.', error: String(error) });
  } finally {
    client.release();
  }
});

app.get('/api/comments', async (req, res) => {
  try {
    const potholeId = String(req.query.potholeId || '');
    if (!potholeId) {
      res.status(400).json({ message: 'potholeId é obrigatório.' });
      return;
    }

    const { rows } = await pool.query(
      `
        select c.id, c.content, c.created_at, c.user_id, coalesce(p.display_name, 'Utilizador') as display_name
        from public.comments c
        left join public.profiles p on p.id = c.user_id
        where c.pothole_id = $1
        order by c.created_at asc
      `,
      [potholeId],
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar comentários.', error: String(error) });
  }
});

app.post('/api/comments', async (req, res) => {
  try {
    const { pothole_id, user_id, content } = req.body;

    const { rows } = await pool.query(
      `
        insert into public.comments (pothole_id, user_id, content)
        values ($1, $2, $3)
        returning *
      `,
      [pothole_id, user_id, content],
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar comentário.', error: String(error) });
  }
});

app.get('/api/votes/status', async (req, res) => {
  try {
    const potholeId = String(req.query.potholeId || '');
    const userId = req.query.userId ? String(req.query.userId) : null;
    const anonId = req.query.anonId ? String(req.query.anonId) : null;

    if (!potholeId) {
      res.status(400).json({ message: 'potholeId é obrigatório.' });
      return;
    }

    if (!userId && !anonId) {
      res.json({ hasVoted: false });
      return;
    }

    const { rows } = await pool.query(
      `
        select id
        from public.votes
        where pothole_id = $1 and ((user_id = $2 and $2 is not null) or (anon_id = $3 and $3 is not null))
        limit 1
      `,
      [potholeId, userId, anonId],
    );

    res.json({ hasVoted: rows.length > 0 });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao verificar voto.', error: String(error) });
  }
});

app.post('/api/votes/toggle', async (req, res) => {
  try {
    const { pothole_id, user_id, anon_id } = req.body;

    const { rows: existing } = await pool.query(
      `
        select id
        from public.votes
        where pothole_id = $1 and ((user_id = $2 and $2 is not null) or (anon_id = $3 and $3 is not null))
        limit 1
      `,
      [pothole_id, user_id ?? null, anon_id ?? null],
    );

    if (existing.length > 0) {
      await pool.query('delete from public.votes where id = $1', [existing[0].id]);
      res.json({ hasVoted: false });
      return;
    }

    await pool.query(
      `
        insert into public.votes (pothole_id, user_id, anon_id)
        values ($1, $2, $3)
      `,
      [pothole_id, user_id ?? null, anon_id ?? null],
    );

    res.json({ hasVoted: true });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao alternar voto.', error: String(error) });
  }
});

app.get('/api/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('select id, display_name from public.profiles where id = $1 limit 1', [id]);
    if (!rows[0]) {
      res.json({ id, display_name: 'Utilizador' });
      return;
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao obter perfil.', error: String(error) });
  }
});

app.put('/api/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const displayName = String(req.body.display_name || '').trim() || null;

    const { rows } = await pool.query(
      `
        insert into public.profiles (id, display_name)
        values ($1, $2)
        on conflict (id) do update set display_name = excluded.display_name
        returning id, display_name
      `,
      [id, displayName],
    );

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao guardar perfil.', error: String(error) });
  }
});

async function bootstrap() {
  await initSchema();
  app.listen(port, () => {
    console.log(`Neon API a correr em http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Erro ao iniciar API Neon:', error);
  process.exit(1);
});
