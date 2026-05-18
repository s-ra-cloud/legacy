import type { Core } from '@strapi/strapi';

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // Keep Neon (serverless Postgres) awake by pinging the DB every 4 minutes.
    // Neon suspends its compute after ~5 min of inactivity and terminates all
    // open connections, which crashes Strapi. This prevents that suspension.
    const PING_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

    const ping = async () => {
      try {
        await strapi.db.connection.raw('SELECT 1');
      } catch (err) {
        strapi.log.warn('[db-keepalive] ping failed — Neon may have suspended:', err.message);
      }
    };

    const interval = setInterval(ping, PING_INTERVAL_MS);

    // Clean up when Strapi shuts down so the interval doesn't block exit.
    strapi.server.httpServer?.on('close', () => clearInterval(interval));
  },
};
