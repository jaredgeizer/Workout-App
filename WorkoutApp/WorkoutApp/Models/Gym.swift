import Foundation
import SwiftData

@Model
final class Gym {
    var name: String = ""
    var isDefault: Bool = false
    var createdAt: Date = Date.now

    var equipment: [Equipment] = []

    init(name: String, isDefault: Bool = false, equipment: [Equipment] = []) {
        self.name = name
        self.isDefault = isDefault
        self.equipment = equipment
    }

    var equipmentNames: Set<String> {
        Set(equipment.map(\.name))
    }
}
