import Foundation

enum MuscleGroup: String, Codable, CaseIterable, Identifiable {
    case chest
    case back
    case lats
    case traps
    case shoulders
    case biceps
    case triceps
    case forearms
    case abs
    case obliques
    case lowerBack
    case glutes
    case quadriceps
    case hamstrings
    case calves
    case adductors
    case abductors
    case neck

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .lowerBack: return "Lower Back"
        default: return rawValue.capitalized
        }
    }
}
