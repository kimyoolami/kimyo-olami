import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.setGlobalPrefix('api');
  const allowedOrigins = process.env.FRONTEND_URL?.split(',').map((origin) =>
    origin.trim(),
  );
  app.enableCors({
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) {
      if (!origin || allowedOrigins?.includes(origin)) {
        callback(null, true);
        return;
      }

      try {
        const url = new URL(origin);
        const isVercelPreview =
          url.protocol === 'https:' && url.hostname.endsWith('.vercel.app');
        callback(null, isVercelPreview);
      } catch {
        callback(null, false);
      }
    },
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
void bootstrap();
