type FieldTag = "filter" | "create" | "update" | "search" | "log";

type BaseField = {
  name: string;
  tags: FieldTag[];
  filterKey: string;
  header: string;
  path: string;
  column: string;
  nullable?: boolean;
  array?: boolean;
  unique?: boolean;
  schema?: string;
  optional?: boolean;
};

type IdField = {
  type: "id";
  join: {
    name: string;
    table: string;
    shortName: string;
    foreignKey: string;
    idKey?: string;
  };
  endpoint: string;
  defaultValue?: string | string[];
};

type StringField = {
  type: "string";
  size?: number;
  defaultValue?: string | string[];
};

type NumberField = {
  type: "number";
  defaultValue?: number | number[];
};

type DateField = {
  type: "date";
  defaultValue?: Date;
};

type EnumField = {
  type: "enum";
  values: string[];
  defaultValue?: string | string[];
};

type BooleanField = {
  type: "boolean";
  defaultValue?: boolean;
};

type FileField = {
  type: "file";
  allowedTypes: string[];
  maxFiles: number;
  minFiles: number;
  maxSizeInMB: number;
  defaultValue?: string | string[];
};

type Types =
  | IdField
  | StringField
  | NumberField
  | DateField
  | EnumField
  | BooleanField
  | FileField;

type ResourceField = BaseField & Types;

export type ResourceFields = ResourceField[];

export type Resource = {
  name: string;
  plural: string;
  shortName: string;
  prefix: string;
  fields: ResourceField[];
  createdAt?: boolean;
  updatedAt?: boolean;
  deletable?: boolean;
};

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type RawResourceField = Optional<
  BaseField,
  "filterKey" | "header" | "path" | "column"
> &
  Types;

export type FileTatget = {
  name: string;
  path: string;
  filename: string;
  render: (data: Resource, t: (k: string) => string) => string;
  append?: boolean;
};
