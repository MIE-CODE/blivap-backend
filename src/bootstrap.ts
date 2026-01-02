import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './shared/all-exception.filter';
import { ValidationFilter } from './shared/validation.filter';
import { ValidationPipe } from './shared/validation.pipe';

export async function bootstrap(app?: INestApplication, port?: number) {
  if (!app) {
    app = await NestFactory.create(AppModule, {
      cors: {
        origin: [
          /http:\/\/localhost:[1-9]+/,
          /http:\/\/127.0.0.1:[1-9]+/,
          // /^(http(s)?:\/\/)?([a-zA-Z1-9]+\.)?example.com$/,
        ],
      },
    });
  }

  const logger = new Logger('Bootstrap');

  app.useGlobalFilters(new AllExceptionsFilter(), new ValidationFilter());
  app.useGlobalPipes(new ValidationPipe());
  app.use(json({ limit: '100mb' }));
  app.use(urlencoded({ limit: '100mb', extended: true }));
  app.use(helmet());

  const configService = app.get(ConfigService);
  if (isNaN(Number(port))) {
    port = configService.get<number>('port');
  }

  await app.listen(port, '0.0.0.0');

  logger.log(`app started on port ${port}`);

  return app;
}
