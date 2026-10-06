import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  try { process.loadEnvFile(); } catch {}
  if (process.env.NODE_ENV === 'production') {
    const required = ['DATABASE_URL', 'SESSION_SECRET', 'CORS_ORIGIN', 'WEB_URL', 'PRINT_AGENT_TOKEN', 'ZALO_PROVIDER'];
    if (process.env.ZALO_PROVIDER === 'zca') required.push('ZALO_CREDENTIALS_KEY');
    const missing = required.filter((name) => !process.env[name]);
    if (missing.length) throw new Error(`Missing production environment variables: ${missing.join(', ')}`);
  }

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true });
  const swagger = new DocumentBuilder()
    .setTitle('ZUZU Laundry API')
    .setDescription('Internal API contract')
    .setVersion('1.0')
    .addCookieAuth('zuzu_session')
    .build();
  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: 'api/openapi.json' });
  const port = Number(process.env.PORT ?? 3100);
  await app.listen(port, '0.0.0.0');
  app.get(Logger).log(`API listening on port ${port}`, 'Bootstrap');
}
void bootstrap();

