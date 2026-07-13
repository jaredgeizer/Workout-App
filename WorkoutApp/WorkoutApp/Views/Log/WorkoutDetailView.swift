import SwiftUI
import SwiftData

struct WorkoutDetailView: View {
    let session: WorkoutSession

    private var sortedPerformances: [ExercisePerformance] {
        session.performances.sorted { $0.orderIndex < $1.orderIndex }
    }

    var body: some View {
        List {
            Section {
                LabeledContent("Date", value: session.date.formatted(date: .abbreviated, time: .shortened))
                LabeledContent("Gym", value: session.gym?.name ?? "Any Equipment")
                LabeledContent("Duration", value: "\(Int(session.duration / 60)) min")
                LabeledContent("Volume", value: "\(Int(session.totalVolume)) lb")
                if session.healthKitSampleID != nil {
                    Label("Synced to Apple Health", systemImage: "heart.fill")
                        .foregroundStyle(.pink)
                }
            }

            ForEach(sortedPerformances, id: \.persistentModelID) { performance in
                Section(performance.exercise?.name ?? "Exercise") {
                    ForEach(performance.sets.sorted { $0.setNumber < $1.setNumber }, id: \.persistentModelID) { set in
                        HStack {
                            Text("Set \(set.setNumber)")
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text("\(formattedWeight(set.weight)) lb × \(set.reps) reps")
                            if set.isCompleted {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(.green)
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle(session.muscleSummary.map(\.displayName).joined(separator: ", "))
        .navigationBarTitleDisplayMode(.inline)
    }

    private func formattedWeight(_ weight: Double) -> String {
        weight.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(weight)) : String(weight)
    }
}
