import type { DB } from "@repo/db";
import { z } from "zod";

export type LogUpdateTracker =
  | {
      old: string | undefined | null;
      new: string | undefined;
    }
  | undefined;

export type LogIdUpdateTracker =
  | {
      old: string;
      new: string | undefined;
    }
  | undefined;

export interface ActionPayload {
  CREATE_USER: {
    name: string;
    email: string;
  };
  UPDATE_USER: {
    name: LogUpdateTracker;
    imageId: LogIdUpdateTracker;
  };
}

export type LogAction = keyof ActionPayload;

export type LogActionUnion = {
  [K in LogAction]: {
    action: K;
    data: ActionPayload[K];
  };
}[LogAction];

export type SerializedLogValue =
  | `id#${keyof DB}#${string}`
  | "_" // indicates undefined
  | `str#${string}`
  | `enum#${string}`
  | `from#${string}#to#${string}`
  | `fromId#${keyof DB}#${string}#to#${string}`;

const loggableTableSchema = z.union([z.literal("users"), z.literal("media")]);

export const idRefSchema = z.preprocess(
  (it) => {
    if (typeof it === "string") {
      return it.split("#");
    }
    return it;
  },
  z.tuple([z.literal("id"), loggableTableSchema, z.string().min(3)]),
);

export type LoggableTable = z.infer<typeof loggableTableSchema>;

export interface ActivityLog {
  id: string;
  action: LogAction;
  values: string[];
  created_at: Date;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    image: string;
  };
}

export const logValueSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("str"),
    value: z.string(),
  }),
  z.object({
    type: z.literal("enum"),
    value: z.string(),
  }),
  z.object({
    type: z.literal("fromTo"),
    from: z.string(),
    to: z.string(),
  }),
  z.object({
    type: z.literal("id"),
    table: loggableTableSchema,
    id: z.string().min(3),
  }),
  z.object({
    type: z.literal("fromIdToId"),
    table: loggableTableSchema,
    from: z.string(),
    to: z.string(),
  }),
]);

export type LogValueTypes =
  | {
      type: "str";
      value: string;
    }
  | {
      type: "enum";
      value: string;
    }
  | {
      type: "fromTo";
      from: string;
      to: string;
    }
  | {
      type: "id";
      table: LoggableTable;
      id: string;
      data: DB[LoggableTable];
    }
  | {
      type: "fromIdToId";
      table: LoggableTable;
      from: string;
      to: string;
      data: { from: DB[LoggableTable]; to: DB[LoggableTable] };
    };

export const logValueParserSchema = z.preprocess(
  (it) => {
    if (typeof it === "string") {
      return it.split("#");
    }
    return it;
  },
  z.union([
    z.tuple([z.literal("id"), loggableTableSchema, z.string()]),
    z.tuple([
      z.literal("fromId"),
      loggableTableSchema,
      z.string(),
      z.literal("to"),
      z.string(),
    ]),
    z.tuple([z.literal("from"), z.string(), z.literal("to"), z.string()]),
    z.tuple([z.literal("str"), z.string()]),
    z.tuple([z.literal("enum"), z.string()]),
  ]),
);
