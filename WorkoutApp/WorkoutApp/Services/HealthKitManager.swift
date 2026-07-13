import Foundation
import HealthKit

/// Wraps HealthKit authorization and writes completed strength-training workouts.
@MainActor
final class HealthKitManager {
    static let shared = HealthKitManager()

    private let store = HKHealthStore()

    private var typesToShare: Set<HKSampleType> {
        [HKObjectType.workoutType(), HKQuantityType(.activeEnergyBurned)]
    }

    var isHealthDataAvailable: Bool {
        HKHealthStore.isHealthDataAvailable()
    }

    func requestAuthorization() async throws {
        guard isHealthDataAvailable else { return }
        try await store.requestAuthorization(toShare: typesToShare, read: [])
    }

    /// Writes a completed workout session to Apple Health as a traditional strength training workout.
    /// Returns the HealthKit UUID string for the saved sample, if the write succeeds.
    @discardableResult
    func saveWorkout(_ session: WorkoutSession) async throws -> String? {
        guard isHealthDataAvailable else { return nil }

        let startDate = session.date
        let endDate = session.date.addingTimeInterval(session.duration)

        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .traditionalStrengthTraining

        let builder = HKWorkoutBuilder(healthStore: store, configuration: configuration, device: .local())

        try await builder.beginCollection(at: startDate)

        let energyUnit = HKUnit.kilocalorie()
        let energyQuantity = HKQuantity(unit: energyUnit, doubleValue: session.estimatedActiveEnergy)
        let energySample = HKQuantitySample(
            type: HKQuantityType(.activeEnergyBurned),
            quantity: energyQuantity,
            start: startDate,
            end: endDate
        )
        try await builder.add([energySample])

        try await builder.endCollection(at: endDate)
        let workout = try await builder.finishWorkout()
        return workout?.uuid.uuidString
    }
}
