import 'dotenv/config';
import { createApp, ensureSchemaInitialized } from './app.js';

const app = createApp();
const port = Number(process.env.API_PORT || 8787);

async function bootstrap() {
  await ensureSchemaInitialized();
  app.listen(port, () => {
    console.log(`Neon API a correr em http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Erro ao iniciar API Neon:', error);
  process.exit(1);
});
