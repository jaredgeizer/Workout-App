import SwiftUI
import SwiftData

struct WorkoutHomeView: View {
    @Query(sort: \Gym.createdAt) private var gyms: [Gym]

    @State private var isBuilding = false
    @State private var showingActiveWorkout = false
    @State private var activeSession: WorkoutSession?

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()
                Image(systemName: "figure.strengthtraining.traditional")
                    .font(.system(size: 64))
                    .foregroundStyle(.tint)
                Text("Ready for your next workout?")
                    .font(.title2.bold())
                    .multilineTextAlignment(.center)

                Button {
                    isBuilding = true
                } label: {
                    Text("Start New Workout")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(.tint)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                }
                .padding(.horizontal, 32)

                Spacer()
                Spacer()
            }
            .navigationTitle("Workout")
            .sheet(isPresented: $isBuilding) {
                BuildWorkoutView(gyms: gyms) { session in
                    activeSession = session
                    isBuilding = false
                    showingActiveWorkout = true
                }
            }
            .fullScreenCover(isPresented: $showingActiveWorkout) {
                if let activeSession {
                    ActiveWorkoutView(session: activeSession) {
                        showingActiveWorkout = false
                        self.activeSession = nil
                    }
                }
            }
        }
    }
}
