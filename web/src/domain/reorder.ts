export interface Groupable {
  groupId?: string;
}

/**
 * Contiguous [start, end) range of the block (solo item, or whole superset) containing
 * `index`. An ungrouped item is always its own block of size 1.
 */
export function blockRange<T extends Groupable>(items: T[], index: number): [number, number] {
  const groupId = items[index].groupId;
  if (!groupId) return [index, index + 1];

  let start = index;
  while (start > 0 && items[start - 1].groupId === groupId) start--;
  let end = index + 1;
  while (end < items.length && items[end].groupId === groupId) end++;
  return [start, end];
}

/**
 * Moves the whole block containing `index` up or down past its neighboring block — e.g.
 * dragging an entire superset past the exercise above/below it. No-op at either edge.
 */
export function moveBlock<T extends Groupable>(items: T[], index: number, direction: "up" | "down"): T[] {
  const [start, end] = blockRange(items, index);

  if (direction === "up") {
    if (start === 0) return items;
    const [prevStart] = blockRange(items, start - 1);
    return [...items.slice(0, prevStart), ...items.slice(start, end), ...items.slice(prevStart, start), ...items.slice(end)];
  }

  if (end === items.length) return items;
  const [, nextEnd] = blockRange(items, end);
  return [...items.slice(0, start), ...items.slice(end, nextEnd), ...items.slice(start, end), ...items.slice(nextEnd)];
}

/**
 * Swaps `index` with its neighbor within the same superset (changes turn/rotation order).
 * No-op if `index` isn't grouped, or is already at that edge of its group.
 */
export function moveWithinGroup<T extends Groupable>(items: T[], index: number, direction: "up" | "down"): T[] {
  const groupId = items[index].groupId;
  if (!groupId) return items;

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= items.length || items[swapWith].groupId !== groupId) return items;

  const next = [...items];
  [next[index], next[swapWith]] = [next[swapWith], next[index]];
  return next;
}
