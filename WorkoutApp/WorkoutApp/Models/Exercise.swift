import Foundation
import SwiftData

enum ExerciseCategory: String, Codable, CaseIterable, Identifiable {
    case compound
    case isolation
    case cardio

    var id: String { rawValue }
    var displayName: String { rawValue.capitalized }
}

@Model
final class Exercise {
    var name: String = ""
    var primaryMuscles: [MuscleGroup] = []
    var secondaryMuscles: [MuscleGroup] = []
    var category: ExerciseCategory = ExerciseCategory.compound
    var instructions: String?
    var isCustom: Bool = false

    var requiredEquipment: [Equipment] = []

    @Relationship(inverse: \ExercisePerformance.exercise)
    var performances: [ExercisePerformance] = []

    init(
        name: String,
        primaryMuscles: [MuscleGroup],
        secondaryMuscles: [MuscleGroup] = [],
        category: ExerciseCategory,
        instructions: String? = nil,
        requiredEquipment: [Equipment] = [],
        isCustom: Bool = false
    ) {
        self.name = name
        self.primaryMuscles = primaryMuscles
        self.secondaryMuscles = secondaryMuscles
        self.category = category
        self.instructions = instructions
        self.requiredEquipment = requiredEquipment
        self.isCustom = isCustom
    }

    /// All muscles this exercise targets, primary first.
    var allMuscles: [MuscleGroup] {
        primaryMuscles + secondaryMuscles
    }

    func isAvailable(given availableEquipment: Set<String>) -> Bool {
        requiredEquipment.isEmpty || requiredEquipment.allSatisfy { availableEquipment.contains($0.name) }
    }
}
