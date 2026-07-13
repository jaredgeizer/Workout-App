import SwiftUI
import SwiftData

struct WorkoutHistoryView: View {
    @Query(filter: #Predicate<WorkoutSession> { $0.isCompleted }, sort: \WorkoutSession.date, order: .reverse)
    private var sessions: [WorkoutSession]

    @Environment(\.modelContext) private var modelContext

    var body: some View {
        NavigationStack {
            Group {
                if sessions.isEmpty {
                    ContentUnavailableView(
                        "No Workouts Yet",
                        systemImage: "calendar.badge.clock",
                        description: Text("Finish a workout to see it show up here.")
                    )
                } else {
                    List {
                        ForEach(sessions, id: \.persistentModelID) { session in
                            NavigationLink(value: session) {
                                WorkoutHistoryRow(session: session)
                            }
                        }
                        .onDelete(perform: deleteSessions)
                    }
                }
            }
            .navigationTitle("Log")
            .navigationDestination(for: WorkoutSession.self) { session in
                WorkoutDetailView(session: session)
            }
        }
    }

    private func deleteSessions(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(sessions[index])
        }
    }
}

private struct WorkoutHistoryRow: View {
    let session: WorkoutSession

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(session.date.formatted(date: .abbreviated, time: .omitted))
                .font(.caption)
                .foregroundStyle(.secondary)

            Text(session.muscleSummary.map(\.displayName).joined(separator: ", "))
                .font(.headline)

            HStack(spacing: 16) {
                Label("\(session.exerciseCount) exercises", systemImage: "list.bullet")
                Label(formattedDuration, systemImage: "clock")
                Label("\(Int(session.totalVolume)) lb", systemImage: "scalemass")
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }

    private var formattedDuration: String {
        let minutes = Int(session.duration / 60)
        return "\(minutes) min"
    }
}
