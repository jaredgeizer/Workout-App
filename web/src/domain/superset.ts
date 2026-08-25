/**
 * Collapses the selected indexes into one contiguous block at the position of the
 * earliest-selected item, preserving relative order of both selected and non-selected items.
 * Used so a freshly-made superset renders as one adjacent block instead of scattered cards.
 */
export function groupTogether<T>(items: T[], selectedIndexes: Set<number>): T[] {
  const result: T[] = [];
  let inserted = false;
  items.forEach((item, i) => {
    if (selectedIndexes.has(i)) {
      if (!inserted) {
        selectedIndexes.forEach((si) => result.push(items[si])); // Set preserves insertion order
        inserted = true;
      }
      return;
    }
    result.push(item);
  });
  return result;
}

export interface SupersetGroupMember {
  performanceId: string;
  completedSets: number;
  totalSets: number;
}

export interface SupersetAdvanceResult {
  nextPerformanceId: string | undefined;
  /** True exactly when the scan wrapped past the last member back toward the first —
   * the only signal used to decide whether to start the rest timer. */
  roundCompleted: boolean;
}

/**
 * Given a superset group's members (in rotation order) and which member's set was just
 * logged (with that member's completedSets already reflecting the just-logged set), finds
 * the next member still short of its target set count, skipping any member already done.
 * Degrades gracefully once only one member remains unfinished: it keeps landing on that one
 * member and reports roundCompleted every time, i.e. behaves like a normal solo exercise.
 */
export function advanceSupersetRotation(
  members: SupersetGroupMember[],
  justLoggedPerformanceId: string,
): SupersetAdvanceResult {
  const stillActive = members.some((m) => m.completedSets < m.totalSets);
  if (!stillActive) return { nextPerformanceId: undefined, roundCompleted: false };

  const startIdx = members.findIndex((m) => m.performanceId === justLoggedPerformanceId);
  for (let step = 1; step <= members.length; step++) {
    const idx = (startIdx + step) % members.length;
    const wrapped = idx <= startIdx;
    if (members[idx].completedSets < members[idx].totalSets) {
      return { nextPerformanceId: members[idx].performanceId, roundCompleted: wrapped };
    }
  }
  return { nextPerformanceId: undefined, roundCompleted: true };
}
