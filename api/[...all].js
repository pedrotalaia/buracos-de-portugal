import 'dotenv/config';
import { createApp, ensureSchemaInitialized } from '../server/app.js';

const app = createApp();

export default async function handler(req, res) {
  try {
    await ensureSchemaInitialized();
    return app(req, res);
  } catch (error) {
    console.error('Erro na função API Vercel:', error);
    return res.status(500).json({ message: 'Erro interno da API.' });
  }
}
