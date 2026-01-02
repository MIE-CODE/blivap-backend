import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: [
        /http:\/\/localhost:[1-9]+/,
        /http:\/\/127.0.0.1:[1-9]+/,
        // /^(http(s)?:\/\/)?([a-zA-Z1-9]+\.)?example.com$/,
      ],
    },
    bodyParser: true,
  });
  const logger = new Logger('Bootstrap');

  app.use(json({ limit: '100mb' }));
  app.use(urlencoded({ limit: '100mb', extended: true }));
  app.use(helmet());

  const configService = app.get(ConfigService);
  const port = configService.get<string>('port');

  await app.listen(port, '0.0.0.0');

  logger.log(`app started on port ${port}`);
}
bootstrap();
