interface Props {
  selectMode: boolean;
  selectedCount: number;
  onEnterSelectMode: () => void;
  onCancel: () => void;
  onMakeSuperset: () => void;
}

/** The Select / Cancel / Make Superset button row shared by the plan editor, routine editor, and active workout. */
export function SupersetSelectBar({ selectMode, selectedCount, onEnterSelectMode, onCancel, onMakeSuperset }: Props) {
  if (!selectMode) {
    return (
      <button onClick={onEnterSelectMode} className="text-xs font-medium text-sky-400 active:text-sky-300">
        Select
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={onCancel} className="text-xs font-medium text-slate-400 active:text-slate-200">
        Cancel
      </button>
      <button
        onClick={onMakeSuperset}
        disabled={selectedCount < 2}
        className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 disabled:bg-slate-700 disabled:text-slate-500"
      >
        Make Superset{selectedCount > 0 ? ` (${selectedCount})` : ""}
      </button>
    </div>
  );
}
