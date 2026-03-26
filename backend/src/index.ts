import express from 'express';
import cors from 'cors';
import { config } from './config';
import { runMigrations, createAdminUser } from './db/migrations';
import authRoutes from './routes/auth';
import nodeRoutes from './routes/nodes';
import proxyRoutes from './routes/proxies';
import allProxiesRoutes from './routes/allProxies';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/nodes', proxyRoutes);
app.use('/api/proxies', allProxiesRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

async function bootstrap(): Promise<void> {
  try {
    await runMigrations();

    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;
    if (adminUser && adminPass) {
      await createAdminUser(adminUser, adminPass);
    }

    app.listen(config.port, '0.0.0.0', () => {
      console.log(`Panel backend running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start panel backend:', error);
    process.exit(1);
  }
}

bootstrap();
