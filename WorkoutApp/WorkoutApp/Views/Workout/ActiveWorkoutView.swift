import SwiftUI
import SwiftData

struct ActiveWorkoutView: View {
    @Bindable var session: WorkoutSession
    let onFinish: () -> Void

    @Environment(\.modelContext) private var modelContext
    @State private var isSaving = false
    @State private var errorMessage: String?

    private var sortedPerformances: [ExercisePerformance] {
        session.performances.sorted { $0.orderIndex < $1.orderIndex }
    }

    var body: some View {
        NavigationStack {
            List {
                ForEach(sortedPerformances, id: \.persistentModelID) { performance in
                    Section(performance.exercise?.name ?? "Exercise") {
                        ForEach(performance.sets.sorted { $0.setNumber < $1.setNumber }, id: \.persistentModelID) { set in
                            SetRow(set: set)
                        }
                    }
                }
            }
            .navigationTitle("Workout in Progress")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .destructive) { cancelWorkout() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Finish") { Task { await finishWorkout() } }
                }
            }
            .disabled(isSaving)
            .overlay {
                if isSaving {
                    ProgressView("Saving…")
                        .padding()
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
                }
            }
            .alert("Couldn't save to Apple Health", isPresented: Binding(
                get: { errorMessage != nil },
                set: { if !$0 { errorMessage = nil } }
            )) {
                Button("OK") { errorMessage = nil }
            } message: {
                Text(errorMessage ?? "")
            }
        }
    }

    private func cancelWorkout() {
        modelContext.delete(session)
        onFinish()
    }

    private func finishWorkout() async {
        isSaving = true
        session.duration = Date.now.timeIntervalSince(session.date)
        session.isCompleted = true

        do {
            try await HealthKitManager.shared.requestAuthorization()
            let sampleID = try await HealthKitManager.shared.saveWorkout(session)
            session.healthKitSampleID = sampleID
        } catch {
            errorMessage = error.localizedDescription
        }

        isSaving = false
        onFinish()
    }
}

private struct SetRow: View {
    @Bindable var set: SetEntry

    var body: some View {
        HStack {
            Text("Set \(set.setNumber)")
                .frame(width: 52, alignment: .leading)
                .foregroundStyle(.secondary)

            TextField("Weight", value: $set.weight, format: .number)
                .keyboardType(.decimalPad)
                .textFieldStyle(.roundedBorder)
                .frame(width: 64)
            Text("lb")
                .font(.caption)
                .foregroundStyle(.secondary)

            TextField("Reps", value: $set.reps, format: .number)
                .keyboardType(.numberPad)
                .textFieldStyle(.roundedBorder)
                .frame(width: 48)
            Text("reps")
                .font(.caption)
                .foregroundStyle(.secondary)

            Spacer()

            Button {
                set.isCompleted.toggle()
            } label: {
                Image(systemName: set.isCompleted ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(set.isCompleted ? .green : .secondary)
                    .font(.title3)
            }
            .buttonStyle(.plain)
        }
    }
}
