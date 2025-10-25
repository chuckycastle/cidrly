/**
 * createSelectors Utility
 * Auto-generates selector hooks for Zustand stores to reduce boilerplate
 *
 * @example
 * ```ts
 * const useBearStoreBase = create<BearState>()((set) => ({ ... }))
 * const useBearStore = createSelectors(useBearStoreBase)
 *
 * // Usage in components:
 * const bears = useBearStore.use.bears() // instead of useBearStore((s) => s.bears)
 * const increase = useBearStore.use.increase() // instead of useBearStore((s) => s.increase)
 * ```
 */

import type { StoreApi, UseBoundStore } from 'zustand';

type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never;

/**
 * Creates auto-generated selectors for a Zustand store
 *
 * @param _store - The Zustand store to enhance with selectors
 * @returns Enhanced store with `.use.propertyName()` selector methods
 *
 * @remarks
 * This utility eliminates the need to write repetitive selector functions like:
 * `const value = useStore((state) => state.value)`
 *
 * Instead, you can use:
 * `const value = useStore.use.value()`
 */
export const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  _store: S,
): WithSelectors<typeof _store> => {
  const store = _store as WithSelectors<typeof _store>;
  store.use = {} as WithSelectors<typeof _store>['use'];

  for (const k of Object.keys(store.getState())) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (store.use as any)[k] = (): any => store((s) => s[k as keyof typeof s]);
  }

  return store;
};
