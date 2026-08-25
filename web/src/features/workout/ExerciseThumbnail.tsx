import type { Exercise } from "../../types/exercise";

interface Props {
  exercise: Exercise | undefined;
  /** Omit to render a static (non-interactive) thumbnail, e.g. inside a row that's already
   * clickable for something else. */
  onOpen?: () => void;
  size?: number;
}

export function ExerciseThumbnail({ exercise, onOpen, size = 40 }: Props) {
  const style = { width: size, height: size };
  const content = exercise?.mediaUrl ? (
    <img src={exercise.mediaUrl} alt="" className="h-full w-full object-cover" />
  ) : (
    <span className="text-lg" aria-hidden="true">
      🏋️
    </span>
  );

  if (!onOpen) {
    return (
      <div style={style} className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-700">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      style={style}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-700 active:opacity-70"
    >
      {content}
    </button>
  );
}
