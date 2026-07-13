import SwiftUI
import SwiftData

struct ExercisePickerView: View {
    let availableEquipmentNames: Set<String>?
    let onSelect: (Exercise) -> Void

    @Environment(\.dismiss) private var dismiss
    @Query(sort: \Exercise.name) private var allExercises: [Exercise]

    @State private var searchText = ""
    @State private var selectedMuscle: MuscleGroup?
    @State private var onlyAvailableEquipment = true

    private var filteredExercises: [Exercise] {
        allExercises.filter { exercise in
            if !searchText.isEmpty, !exercise.name.localizedCaseInsensitiveContains(searchText) {
                return false
            }
            if let selectedMuscle, !exercise.primaryMuscles.contains(selectedMuscle) {
                return false
            }
            if onlyAvailableEquipment, let availableEquipmentNames {
                return exercise.isAvailable(given: availableEquipmentNames)
            }
            return true
        }
    }

    var body: some View {
        NavigationStack {
            List {
                if availableEquipmentNames != nil {
                    Toggle("Only equipment at this gym", isOn: $onlyAvailableEquipment)
                }

                Picker("Muscle", selection: $selectedMuscle) {
                    Text("All Muscles").tag(MuscleGroup?.none)
                    ForEach(MuscleGroup.allCases) { muscle in
                        Text(muscle.displayName).tag(MuscleGroup?.some(muscle))
                    }
                }

                ForEach(filteredExercises, id: \.persistentModelID) { exercise in
                    Button {
                        onSelect(exercise)
                        dismiss()
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(exercise.name)
                                .foregroundStyle(.primary)
                            Text(exercise.primaryMuscles.map(\.displayName).joined(separator: ", "))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search exercises")
            .navigationTitle("Add Exercise")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}
