import SwiftUI
import SwiftData

struct GymDetailView: View {
    @Bindable var gym: Gym

    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Equipment.name) private var allEquipment: [Equipment]

    @State private var isAddingEquipment = false
    @State private var newEquipmentName = ""
    @State private var newEquipmentCategory: EquipmentCategory = .other

    private var groupedEquipment: [(EquipmentCategory, [Equipment])] {
        let groups = Dictionary(grouping: allEquipment, by: \.category)
        return EquipmentCategory.allCases.compactMap { category in
            guard let items = groups[category], !items.isEmpty else { return nil }
            return (category, items)
        }
    }

    var body: some View {
        List {
            Section {
                TextField("Gym name", text: $gym.name)
            }

            ForEach(groupedEquipment, id: \.0) { category, items in
                Section(category.displayName) {
                    ForEach(items, id: \.persistentModelID) { item in
                        Toggle(item.name, isOn: binding(for: item))
                    }
                }
            }
        }
        .navigationTitle("Edit Gym")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    isAddingEquipment = true
                } label: {
                    Label("Add Equipment", systemImage: "plus")
                }
            }
        }
        .alert("New Equipment", isPresented: $isAddingEquipment) {
            TextField("Equipment name", text: $newEquipmentName)
            Button("Cancel", role: .cancel) { newEquipmentName = "" }
            Button("Add") { addCustomEquipment() }
        }
    }

    private func binding(for equipment: Equipment) -> Binding<Bool> {
        Binding(
            get: { gym.equipment.contains(equipment) },
            set: { isOn in
                if isOn {
                    if !gym.equipment.contains(equipment) {
                        gym.equipment.append(equipment)
                    }
                } else {
                    gym.equipment.removeAll { $0.persistentModelID == equipment.persistentModelID }
                }
            }
        )
    }

    private func addCustomEquipment() {
        let trimmed = newEquipmentName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let equipment = Equipment(name: trimmed, category: .other, isCustom: true)
        modelContext.insert(equipment)
        gym.equipment.append(equipment)
        newEquipmentName = ""
    }
}
