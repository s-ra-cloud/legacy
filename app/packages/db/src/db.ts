import { env } from "@repo/shared";
import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import { formatISO } from "date-fns";
import type { DB } from "./generated/kysely.js";
import postgres from "postgres";
import { PostgresJSDialect } from "kysely-postgres-js";

const dateSerializer = {
  to: 1082,
  from: [1082],
  serialize: (val: string) => {
    return val ? formatISO(val) : val;
  },
  parse: (val: string) => val,
};

const timestampSerializer = {
  to: 1114,
  from: [1114],
  serialize: (val: string) => {
    return val ? formatISO(val) : val;
  },
  parse: (val: string) => val,
};

const timestampWithTimeZoneSerializer = {
  to: 1184,
  from: [1114, 1184],
  serialize: (val: string) => {
    return val ? formatISO(val) : val;
  },
  parse: (val: string) => val,
};

const pg = postgres(env.DATABASE_URL, {
  types: {
    date: dateSerializer,
    timestamptz: timestampWithTimeZoneSerializer,
    timestamp: timestampSerializer,
  },
});

const dialect = new PostgresJSDialect({ postgres: pg });

const db = new Kysely<DB>({
  dialect,
  plugins: [new CamelCasePlugin()],
});

// async function initOIDEnumTypes() {
//  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
//  const oids = await (db as Kysely<any>)
//    .selectFrom('pg_type')
//    .select(eb => [eb.ref('typarray').$castTo<string>().as('typarray')])
//    .where('typname', 'in', OID_ENUM_TYPES)
//    .execute();
//  for (const it of oids) {
//    if (env.NODE_ENV === 'production') {
//      logger.debug(`Setting type parser for ${it.typarray} as array`);
//    }
//    pg.types.setTypeParser(Number(it.typarray), (val: string) =>
//      val.slice(1, -1).split(','));
//  }
// }
//
// initOIDEnumTypes().catch(console.error);

export type KyselyDB = Kysely<DB>;
export { db, dialect };
