import { isEmpty, isNil } from 'lodash';

export type ResponseObject<T> = {
  code?: string;

  message: string;

  data?: T;

  meta?: unknown;
};

export class Response {
  static json<T>(
    message: string,
    data?: T,
    meta?: unknown,
    code?: string,
  ): ResponseObject<T> {
    const responseObj: ResponseObject<T> = { message };
    if (!isNil(data)) {
      responseObj.data = data;
    }
    if (!isNil(meta)) {
      responseObj.meta = meta;
    }
    if (!isEmpty(code)) {
      responseObj.code = code;
    }

    return responseObj;
  }
}
