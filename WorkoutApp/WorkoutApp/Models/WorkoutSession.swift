import Foundation
import SwiftData

@Model
final class WorkoutSession {
    var date: Date = Date.now
    var duration: TimeInterval = 0
    var notes: String?
    var isCompleted: Bool = false
    var healthKitSampleID: String?
    var gym: Gym?

    @Relationship(deleteRule: .cascade, inverse: \ExercisePerformance.session)
    var performances: [ExercisePerformance] = []

    init(date: Date = .now, duration: TimeInterval = 0, notes: String? = nil, gym: Gym? = nil) {
        self.date = date
        self.duration = duration
        self.notes = notes
        self.gym = gym
    }

    var totalVolume: Double {
        performances.reduce(0) { $0 + $1.totalVolume }
    }

    var exerciseCount: Int {
        performances.count
    }

    /// Primary muscles worked in this session, ordered by how much volume they account for.
    var muscleSummary: [MuscleGroup] {
        var counts: [MuscleGroup: Int] = [:]
        for performance in performances {
            guard let exercise = performance.exercise else { continue }
            for muscle in exercise.primaryMuscles {
                counts[muscle, default: 0] += 1
            }
        }
        return counts.sorted { $0.value > $1.value }.map(\.key)
    }

    /// Rough calorie estimate for HealthKit write-back, based on volume-agnostic duration
    /// since precise strength-training energy expenditure isn't measurable without a heart rate sensor.
    var estimatedActiveEnergy: Double {
        let minutes = duration / 60
        return minutes * 5.5 // ~5.5 kcal/min is a common estimate for moderate resistance training
    }
}
