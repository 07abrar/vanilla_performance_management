export type ResourceKey = 'users' | 'activities' | 'tracks' | 'recap';

export type Listener = () => void;

export const listeners: Record<ResourceKey, Set<Listener>> = {
  users: new Set(),
  activities: new Set(),
  tracks: new Set(),
  recap: new Set()
};

export function notify(key: ResourceKey): void {
  listeners[key].forEach((listener) => listener());
}

export function subscribe(keys: ResourceKey[], listener: Listener): () => void {
  keys.forEach((key) => listeners[key].add(listener));
  return () => {
    keys.forEach((key) => listeners[key].delete(listener));
  };
}
