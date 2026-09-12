/**
 * Zod marks optional properties as `prop?: T | undefined`, which `exactOptionalPropertyTypes`
 * refuses to assign to our `prop?: T` content types. `Loosen<T>` widens a type the same way so a
 * schema can still be checked against the TypeScript type it mirrors (a missing or misspelled
 * property is a compile error) without giving up exact optionals elsewhere.
 */
export type Loosen<T> = T extends (infer U)[]
  ? Loosen<U>[]
  : T extends object
    ? { [K in keyof T]: Loosen<T[K]> | (undefined extends T[K] ? undefined : never) }
    : T;
