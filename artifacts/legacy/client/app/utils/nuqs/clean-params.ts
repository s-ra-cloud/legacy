type ExcludeNullParams<T extends Record<string, unknown>> = {
  [K in keyof T]: null extends T[K] ? Exclude<T[K], null> | undefined : T[K];
};

export function excludeNullParams<T extends Record<string, unknown>>(
  params: T,
): ExcludeNullParams<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== null),
  ) as ExcludeNullParams<T>;
}
