import { createId } from "@paralleldrive/cuid2";
import type { KyselyDB } from "@repo/db";
import type { AuthUser } from "../../lib/auth/index.js";
import { serialize } from "./serialize.js";
import type {
  ActionPayload,
  LogAction,
  LogActionUnion,
  SerializedLogValue,
} from "./types.js";

export type LoggerContext = number[];

export class DBLogger {
  #db: KyselyDB;
  #user: AuthUser;
  #requestId?: string;
  #logs: LogUnitInner[] = [];

  constructor(db: KyselyDB, user: AuthUser, requestId?: string) {
    this.#db = db;
    this.#user = user;
    this.#requestId = requestId;
  }

  setDB(db: KyselyDB) {
    this.#db = db;
  }

  log<T extends LogAction>(action: T, data: ActionPayload[T]): ExposedLogUnit {
    const log = new LogUnitInner(
      action,
      serialize({ action, data } as LogActionUnion),
    );
    this.#logs.push(log);
    return log;
  }

  async #insertLogs(logs: LogUnitInner[], parentId?: string) {
    for (const log of logs) {
      const dblog = await this.#db
        .insertInto("userActivities")
        .values({
          id: createId(),
          userId: this.#user.id,
          action: log.getAction(),
          requestId: this.#requestId,
          createdAt: new Date(),
          values: log.getData(),
          parentId,
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      const logs = log.getLogs();
      if (logs.length > 0) {
        await this.#insertLogs(logs, dblog.id);
      }
    }
  }

  #debug(logs: LogUnitInner[], level = 0) {
    // print logs recursively
    for (const log of logs) {
      // console.log('  '.repeat(level), log.getAction(), log.getData());
      this.#debug(log.getLogs(), level + 1);
    }
  }

  debug() {
    this.#debug(this.#logs);
  }

  execute() {
    if (this.#logs.length === 0) Promise.resolve();
    return this.#insertLogs(this.#logs);
  }
}

class LogUnitInner {
  #action: LogAction;
  #data: SerializedLogValue[];
  #logs: LogUnitInner[];

  constructor(action: LogAction, data: SerializedLogValue[]) {
    this.#action = action;
    this.#data = data;
    this.#logs = [];
  }

  log<T extends LogAction>(action: T, data: ActionPayload[T]): ExposedLogUnit {
    const log = new LogUnitInner(
      action,
      serialize({ action, data } as LogActionUnion),
    );
    this.#logs.push(log);
    return log;
  }

  getAction() {
    return this.#action;
  }

  getData() {
    return this.#data;
  }

  getLogs() {
    return this.#logs;
  }
}

interface ExposedLogUnit {
  log: <T extends LogAction>(
    action: T,
    data: ActionPayload[T],
  ) => ExposedLogUnit;
}

export type LogUnit = ExposedLogUnit;

type RemoveLastChar<S extends string> = S extends `${infer F}#` ? F : never;
type Concat<T extends string[]> = T extends [infer F, ...infer R]
  ? F extends string
    ? R extends string[]
      ? `${F}#${Concat<R>}`
      : never
    : never
  : "";

export function concat<T extends string[]>(...strings: T) {
  return strings.join("#") as RemoveLastChar<Concat<T>>;
}
