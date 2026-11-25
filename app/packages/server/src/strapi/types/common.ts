export type StrapiPagination = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
};

export type StrapiResponse<T, V extends boolean = true> = {
  data: V extends true ? T[] : T;
  meta: {
    pagination: StrapiPagination;
  };
};

export type StrapiRecord<T> = T & {
  id: number;
  documentId: string;
};

export type StrapiRelationMany<T> = T[]

export type StrapiRelationOne<T> = T;

export interface StrapiBlock {
  id: string;
  __component: string;
}

export interface StrapiMedia {
  name: string;
  alternativeText: null | string;
  caption: null;
  width: null | number;
  height: null | number;
  ext: string;
  mime: string;
  url: string;
}

export type StrapiSingleMedia = StrapiRelationOne<StrapiRecord<StrapiMedia>>;

export type StrapiManyMedia = StrapiRelationMany<StrapiRecord<StrapiMedia>>;

export interface StrapiDate {
  createdAt: Date;
  updatedAt: Date;
}

