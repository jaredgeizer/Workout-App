import Foundation
import SwiftData

/// Loads the bundled equipment + exercise library into SwiftData the first time the app runs.
enum DataSeeder {
    private struct SeedEquipment: Decodable {
        let name: String
        let category: EquipmentCategory
    }

    private struct SeedExercise: Decodable {
        let name: String
        let primaryMuscles: [MuscleGroup]
        let secondaryMuscles: [MuscleGroup]
        let category: ExerciseCategory
        let equipment: [String]
    }

    static func seedIfNeeded(context: ModelContext) {
        seedEquipment(context: context)
        seedExercises(context: context)
        seedDefaultGym(context: context)
    }

    private static func seedEquipment(context: ModelContext) {
        let existingCount = (try? context.fetchCount(FetchDescriptor<Equipment>())) ?? 0
        guard existingCount == 0 else { return }
        guard let items: [SeedEquipment] = decode("equipment") else { return }

        for item in items {
            context.insert(Equipment(name: item.name, category: item.category))
        }
    }

    private static func seedExercises(context: ModelContext) {
        let existingCount = (try? context.fetchCount(FetchDescriptor<Exercise>())) ?? 0
        guard existingCount == 0 else { return }
        guard let items: [SeedExercise] = decode("exercises") else { return }

        let allEquipment = (try? context.fetch(FetchDescriptor<Equipment>())) ?? []
        let equipmentByName = Dictionary(uniqueKeysWithValues: allEquipment.map { ($0.name, $0) })

        for item in items {
            let matchedEquipment = item.equipment.compactMap { equipmentByName[$0] }
            let exercise = Exercise(
                name: item.name,
                primaryMuscles: item.primaryMuscles,
                secondaryMuscles: item.secondaryMuscles,
                category: item.category,
                requiredEquipment: matchedEquipment
            )
            context.insert(exercise)
        }
    }

    private static func seedDefaultGym(context: ModelContext) {
        let existingCount = (try? context.fetchCount(FetchDescriptor<Gym>())) ?? 0
        guard existingCount == 0 else { return }

        let allEquipment = (try? context.fetch(FetchDescriptor<Equipment>())) ?? []
        let homeEquipmentNames: Set<String> = ["Bodyweight", "Dumbbell", "Pull-up Bar", "Resistance Band"]
        let homeEquipment = allEquipment.filter { homeEquipmentNames.contains($0.name) }

        let home = Gym(name: "Home", isDefault: true, equipment: homeEquipment)
        context.insert(home)
    }

    private static func decode<T: Decodable>(_ resourceName: String) -> T? {
        guard let url = Bundle.main.url(forResource: resourceName, withExtension: "json") else {
            assertionFailure("Missing seed resource: \(resourceName).json")
            return nil
        }
        do {
            let data = try Data(contentsOf: url)
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            assertionFailure("Failed to decode \(resourceName).json: \(error)")
            return nil
        }
    }
}
