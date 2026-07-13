import SwiftUI
import SwiftData

struct BuildWorkoutView: View {
    let gyms: [Gym]
    let onStart: (WorkoutSession) -> Void

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var selectedGym: Gym?
    @State private var plannedExercises: [PlannedExercise] = []
    @State private var isPickingExercise = false

    var body: some View {
        NavigationStack {
            List {
                Section("Gym") {
                    Picker("Gym", selection: $selectedGym) {
                        Text("Any Equipment").tag(Gym?.none)
                        ForEach(gyms, id: \.persistentModelID) { gym in
                            Text(gym.name).tag(Gym?.some(gym))
                        }
                    }
                }

                Section("Exercises") {
                    ForEach($plannedExercises) { $planned in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(planned.exercise.name)
                                .font(.headline)
                            HStack {
                                Stepper("Sets: \(planned.targetSets)", value: $planned.targetSets, in: 1...10)
                            }
                            HStack {
                                Stepper("Reps: \(planned.targetReps)", value: $planned.targetReps, in: 1...30)
                            }
                        }
                    }
                    .onDelete { offsets in
                        plannedExercises.remove(atOffsets: offsets)
                    }

                    Button {
                        isPickingExercise = true
                    } label: {
                        Label("Add Exercise", systemImage: "plus")
                    }
                }
            }
            .navigationTitle("New Workout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Start") { startWorkout() }
                        .disabled(plannedExercises.isEmpty)
                }
            }
            .sheet(isPresented: $isPickingExercise) {
                ExercisePickerView(availableEquipmentNames: selectedGym?.equipmentNames) { exercise in
                    plannedExercises.append(PlannedExercise(exercise: exercise))
                }
            }
        }
    }

    private func startWorkout() {
        let session = WorkoutSession(date: .now, gym: selectedGym)
        modelContext.insert(session)

        for (index, planned) in plannedExercises.enumerated() {
            let performance = ExercisePerformance(orderIndex: index, exercise: planned.exercise, session: session)
            modelContext.insert(performance)
            for setNumber in 1...planned.targetSets {
                let set = SetEntry(setNumber: setNumber, weight: 0, reps: planned.targetReps, isCompleted: false)
                set.performance = performance
                modelContext.insert(set)
                performance.sets.append(set)
            }
            session.performances.append(performance)
        }

        onStart(session)
    }
}
