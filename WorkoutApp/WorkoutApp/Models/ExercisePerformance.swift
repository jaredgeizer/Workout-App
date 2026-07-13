import Foundation
import SwiftData

@Model
final class ExercisePerformance {
    var orderIndex: Int = 0
    var exercise: Exercise?
    var session: WorkoutSession?

    @Relationship(deleteRule: .cascade, inverse: \SetEntry.performance)
    var sets: [SetEntry] = []

    init(orderIndex: Int, exercise: Exercise? = nil, session: WorkoutSession? = nil) {
        self.orderIndex = orderIndex
        self.exercise = exercise
        self.session = session
    }

    var totalVolume: Double {
        sets.reduce(0) { $0 + $1.volume }
    }

    var isComplete: Bool {
        !sets.isEmpty && sets.allSatisfy(\.isCompleted)
    }
}
