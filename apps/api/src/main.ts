import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  try { process.loadEnvFile(); } catch {}
  if (process.env.NODE_ENV === 'production') {
    const missing = ['DATABASE_URL', 'SESSION_SECRET', 'CORS_ORIGIN', 'WEB_URL', 'PRINT_AGENT_TOKEN'].filter((name) => !process.env[name]);
    if (missing.length) throw new Error(`Missing production environment variables: ${missing.join(', ')}`);
  }

  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true });
  const port = Number(process.env.PORT ?? 3100);
  await app.listen(port);
  Logger.log(`API listening on port ${port}`, 'Bootstrap');
}
void bootstrap();
