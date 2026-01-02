import { ValidationError } from '@nestjs/common';
import { PopulateOptions, SortOrder } from 'mongoose';

import { PaginationRequestDTO } from './pagination.dto';

type FormattedValidationErrors = {
  [x: string]: string | FormattedValidationErrors;
};

export class Util {
  static formatValidationErrors(
    errorsToFromat: ValidationError[],
  ): FormattedValidationErrors {
    return errorsToFromat.reduce((accumulator, error: ValidationError) => {
      let constraints: string | FormattedValidationErrors;
      if (Array.isArray(error.children) && error.children.length) {
        constraints = this.formatValidationErrors(error.children);
      } else {
        const hasContraints = !!error.constraints;
        if (hasContraints) {
          let items = Object.values(error.constraints);
          const lastItem = items.pop();
          items = [items.join(', '), lastItem].filter((item) => item);
          constraints = items.join(' and ');
        } else {
          constraints = '';
        }
      }
      return {
        ...accumulator,
        [error.property]: constraints,
      };
    }, {} as FormattedValidationErrors);
  }

  static generateRandomString(length: number): string {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;

    if (length <= 0) {
      throw new Error('Length must be a positive integer.');
    }

    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charactersLength);
      result += characters[randomIndex];
    }

    return result;
  }

  static getPaginateOptions(
    paginateDTO: PaginationRequestDTO,
    populate?: PopulateOptions | PopulateOptions[],
    sort?: string | Record<string, SortOrder>,
    select?: string | string[],
  ) {
    const { page = 1, limit = 10 } = paginateDTO;
    let { all } = paginateDTO;

    if (+limit === -1) {
      all = 'true';
    }

    const pagination = !(
      all === '1' ||
      all === 'true' ||
      all === 'yes' ||
      all === 'on'
    );

    const opts = {
      page,
      limit,
      pagination,
      select,
      populate,
      sort,
      customLabels: {
        docs: 'data',
        totalDocs: 'total',
        hasPrevPage: 'hasPreviousPage',
      },
    };
    if (!populate) {
      delete opts.populate;
    }
    if (!sort) {
      delete opts.sort;
    }

    return opts;
  }

  static slugify(text: string) {
    return text
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '');
  }

  static calculateDistance(
    location1: { latitude: number; longitude: number },
    location2: { latitude: number; longitude: number },
  ) {
    const R = 6371; // Radius of the earth in km
    const dLat = (location2.latitude - location1.latitude) * (Math.PI / 180);
    const dLon = (location2.longitude - location1.longitude) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(location1.latitude * (Math.PI / 180)) *
        Math.cos(location2.latitude * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }
}
