// import { getCookie } from 'hono/cookie';
// import { createMiddleware } from 'hono/factory';
// import { baseLocale } from '~/paraglide/runtime';

// export function locale() {
//   return createMiddleware<{
//     Variables: {
//       locale: string;
//     };
//   }>(async (c, next) => {
//     const locale = getCookie(c, 'locale') ?? baseLocale;

//     c.set('locale', locale);
//     await next();
//   });
// }
