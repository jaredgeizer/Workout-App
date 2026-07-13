import Foundation
import SwiftData

@Model
final class SetEntry {
    var setNumber: Int = 1
    var weight: Double = 0
    var reps: Int = 0
    var rpe: Double?
    var isCompleted: Bool = false

    var performance: ExercisePerformance?

    init(setNumber: Int, weight: Double = 0, reps: Int = 0, rpe: Double? = nil, isCompleted: Bool = false) {
        self.setNumber = setNumber
        self.weight = weight
        self.reps = reps
        self.rpe = rpe
        self.isCompleted = isCompleted
    }

    var volume: Double {
        isCompleted ? weight * Double(reps) : 0
    }
}
