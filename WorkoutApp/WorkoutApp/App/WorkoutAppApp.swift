import SwiftUI
import SwiftData

@main
struct WorkoutAppApp: App {
    let modelContainer: ModelContainer

    init() {
        let schema = Schema([
            Equipment.self,
            Exercise.self,
            Gym.self,
            WorkoutSession.self,
            ExercisePerformance.self,
            SetEntry.self
        ])
        let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            modelContainer = try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            fatalError("Failed to create ModelContainer: \(error)")
        }

        DataSeeder.seedIfNeeded(context: modelContainer.mainContext)
    }

    var body: some Scene {
        WindowGroup {
            RootTabView()
        }
        .modelContainer(modelContainer)
    }
}
