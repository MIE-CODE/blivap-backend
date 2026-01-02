import { Document, Model as M, PopulateOptions, SortOrder } from 'mongoose';

export type Model<T extends Document> = M<T>;

export type QueryPopulateOptions = PopulateOptions | PopulateOptions[];

export type SortArgs =
  | string
  | {
      [key: string]:
        | SortOrder
        | {
            $meta: 'textScore';
          };
    };
