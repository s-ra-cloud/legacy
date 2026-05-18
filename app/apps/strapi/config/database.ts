import path from 'path';

export default ({ env }) => {
  const client = env('DATABASE_CLIENT', 'sqlite');

  const connections = {
    mysql: {
      connection: {
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 3306),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) && {
          key: env('DATABASE_SSL_KEY', undefined),
          cert: env('DATABASE_SSL_CERT', undefined),
          ca: env('DATABASE_SSL_CA', undefined),
          capath: env('DATABASE_SSL_CAPATH', undefined),
          cipher: env('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
    },
    postgres: {
      connection: {
        connectionString: env('DATABASE_URL'),
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) && {
          key: env('DATABASE_SSL_KEY', undefined),
          cert: env('DATABASE_SSL_CERT', undefined),
          ca: env('DATABASE_SSL_CA', undefined),
          capath: env('DATABASE_SSL_CAPATH', undefined),
          cipher: env('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
        schema: env('DATABASE_SCHEMA', 'public'),
      },
      pool: {
        // min:0 — no idle connections held open. Neon (serverless Postgres)
        // suspends compute after ~5 min of inactivity and kills all connections.
        // min>0 causes Knex to hold connections Neon will destroy.
        min: env.int('DATABASE_POOL_MIN', 0),
        // Keep pool small so Neon wake-up doesn't spawn many simultaneous
        // connection attempts that all time out and fill the pool.
        max: env.int('DATABASE_POOL_MAX', 3),
        // Release idle connections quickly — well before Neon's ~5 min window.
        idleTimeoutMillis: env.int('DATABASE_POOL_IDLE_TIMEOUT', 20000),
        // How often tarn reaps idle connections.
        reapIntervalMillis: env.int('DATABASE_POOL_REAP_INTERVAL', 1000),
        // Allow 90 s for a new connection — Neon cold-start can take 10-30 s;
        // the default 30 s tarn timeout fires before Neon finishes waking up,
        // leaving all pool slots stuck in "creating" → pool appears full → crash.
        createTimeoutMillis: env.int('DATABASE_POOL_CREATE_TIMEOUT', 90000),
        // Don't cascade a single failed create to all pending acquires.
        propagateCreateError: false,
      },
    },
    sqlite: {
      connection: {
        filename: path.join(__dirname, '..', '..', env('DATABASE_FILENAME', '.tmp/data.db')),
      },
      useNullAsDefault: true,
    },
  };

  return {
    connection: {
      client,
      ...connections[client],
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
  };
};
