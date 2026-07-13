import Foundation
import SwiftData

enum EquipmentCategory: String, Codable, CaseIterable, Identifiable {
    case freeWeight
    case machine
    case cable
    case bodyweight
    case band
    case bench
    case cardio
    case other

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .freeWeight: return "Free Weight"
        default: return rawValue.capitalized
        }
    }
}

@Model
final class Equipment {
    var name: String = ""
    var category: EquipmentCategory = EquipmentCategory.other
    var isCustom: Bool = false

    @Relationship(inverse: \Exercise.requiredEquipment)
    var exercises: [Exercise] = []

    @Relationship(inverse: \Gym.equipment)
    var gyms: [Gym] = []

    init(name: String, category: EquipmentCategory, isCustom: Bool = false) {
        self.name = name
        self.category = category
        self.isCustom = isCustom
    }
}
