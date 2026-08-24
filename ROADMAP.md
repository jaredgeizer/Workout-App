# Roadmap

Ideas for future work, captured as they come up. Nothing here is scheduled or
scoped in detail yet — this is a holding pen to plan from later, not a
commitment.

## Active workout experience

- **Add exercises mid-workout.** Right now exercises are locked in once you
  hit Start on the build/review screen. Being able to tap "+ Add Exercise"
  from inside `ActiveWorkout` itself — same picker, just appended as a new
  `ExercisePerformance` on the in-progress session — would cover the common
  case of deciding to throw in an extra movement partway through.

- **Swap an exercise for an alternative.** Replace an exercise you've
  already started (or one still in the plan) with another that targets the
  same or similar muscles — e.g. swap Barbell Bench Press for Dumbbell Bench
  Press if the bench is taken. This was explicitly deferred out of the
  original milestone scope; the data's already there to support it
  (`Exercise.primaryMuscles` gives a natural "find alternatives" query,
  filtered to the current gym's equipment the same way the exercise picker
  already filters).

- **Workout timer.** An elapsed-time clock for the whole session, visible
  during `ActiveWorkout` — today duration is only computed after the fact
  from `finishWorkout`'s start/end timestamps, with nothing shown live.

- **Per-exercise / rest timer.** A countdown between sets (or configurable
  per exercise) to pace rest periods, distinct from the overall session
  timer above.

## Logging convenience

- **Editing one set's weight adjusts the following sets.** If you bump the
  weight on set 2 mid-exercise, sets 3+ (the ones not yet logged) should
  probably follow along automatically instead of needing the same edit
  repeated per set — with the obvious care needed around not clobbering sets
  you've already completed.

- **Default/last-used weight per exercise.** Independent of saved routines:
  when adding any exercise to a workout (routine or ad hoc), pre-fill the
  weight from the last time you did that exercise, the way routines already
  do via `progression.ts`'s history lookup — just generalized so it applies
  even to exercises with no routine behind them.
