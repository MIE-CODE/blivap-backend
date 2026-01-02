import {
  ValidationError,
  ValidationPipe as VP,
  ValidationPipeOptions,
} from '@nestjs/common';
import { merge } from 'lodash';

import { Util } from './util';
import { ValidationException } from './validation.exception';

export class ValidationPipe extends VP {
  constructor(options?: ValidationPipeOptions) {
    super(
      merge(
        {
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          transformOptions: {
            enableImplicitConversion: true,
          },
          exceptionFactory: (errors: ValidationError[]) => {
            const messages = Util.formatValidationErrors(errors);

            return new ValidationException(messages);
          },
        },
        options,
      ),
    );
  }
}
