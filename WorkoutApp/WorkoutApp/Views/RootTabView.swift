import SwiftUI

struct RootTabView: View {
    var body: some View {
        TabView {
            WorkoutHomeView()
                .tabItem {
                    Label("Workout", systemImage: "dumbbell.fill")
                }

            GymListView()
                .tabItem {
                    Label("Gyms", systemImage: "building.2.fill")
                }

            WorkoutHistoryView()
                .tabItem {
                    Label("Log", systemImage: "calendar")
                }
        }
    }
}
