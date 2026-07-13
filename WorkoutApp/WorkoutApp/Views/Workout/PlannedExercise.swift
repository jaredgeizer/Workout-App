import Foundation

/// A row in the workout builder before the workout is started and persisted.
struct PlannedExercise: Identifiable {
    let id = UUID()
    var exercise: Exercise
    var targetSets: Int = 3
    var targetReps: Int = 10
}
