import SwiftUI
import SwiftData

struct GymListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Gym.createdAt) private var gyms: [Gym]

    @State private var newGymName = ""
    @State private var isAddingGym = false

    var body: some View {
        NavigationStack {
            List {
                ForEach(gyms, id: \.persistentModelID) { gym in
                    NavigationLink(value: gym) {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(gym.name)
                                    .font(.headline)
                                if gym.isDefault {
                                    Text("Default")
                                        .font(.caption2)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(.tint.opacity(0.15))
                                        .foregroundStyle(.tint)
                                        .clipShape(Capsule())
                                }
                            }
                            Text("\(gym.equipment.count) equipment items")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .onDelete(perform: deleteGyms)
            }
            .navigationDestination(for: Gym.self) { gym in
                GymDetailView(gym: gym)
            }
            .navigationTitle("Gyms")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        isAddingGym = true
                    } label: {
                        Label("Add Gym", systemImage: "plus")
                    }
                }
            }
            .alert("New Gym", isPresented: $isAddingGym) {
                TextField("Gym name", text: $newGymName)
                Button("Cancel", role: .cancel) { newGymName = "" }
                Button("Add") { addGym() }
            }
        }
    }

    private func addGym() {
        let trimmed = newGymName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        modelContext.insert(Gym(name: trimmed))
        newGymName = ""
    }

    private func deleteGyms(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(gyms[index])
        }
    }
}
