import type { Prettify } from "./common";

// TODO: unit test
export function pathResolver<T extends Record<string, string>>(routes: T) {
  return Object.fromEntries(
    Object.entries(routes).map(([k, v]) => {
      if (k.startsWith("/")) throw new Error("routes should not start with /");
      if (v.includes(":")) {
        return [
          k,
          (params: Record<string, string>) => {
            const mapped = v.replace(/:([^/]+)/g, (match, key: string) => {
              return params[key] ?? match;
            });
            return `/${mapped}`;
          },
        ];
      }
      return [k, `/${v}`];
    }),
  ) as unknown as PathResolver<T>;
}

export type PathResolver<T extends Record<string, string>> = Prettify<{
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  [K in keyof T]: T[K] extends `${string}:${infer _}`
    ? (params: Prettify<PathToParams<T[K]>>) => `/${T[K]}`
    : `/${T[K]}`;
}>;
type PathToParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Record<Param, string> & ParamsOf<Rest>
    : T extends `${string}:${infer Param}`
      ? Record<Param, string>
      : never;

// Workaround
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const emptyObject = {};
type EmptyObject = typeof emptyObject;

type ParamsOf<S extends string> =
  S extends `${string}:${infer Param}/${infer Rest}`
    ? Record<Param, string> & ParamsOf<Rest>
    : S extends `${string}:${infer Param}`
      ? Record<Param, string>
      : EmptyObject;
