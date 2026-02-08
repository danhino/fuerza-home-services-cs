import SwiftUI

struct MainTabsView: View {
    @EnvironmentObject private var session: SessionStore

    var body: some View {
        TabView {
            if session.selectedAppRole == .customer {
                CustomerHomeMapView()
                    .tabItem { Label("Map", systemImage: "map") }
            } else {
                TechnicianHomeView()
                    .tabItem { Label("Requests", systemImage: "bolt.fill") }
            }

            SettingsView()
                .tabItem { Label("Settings", systemImage: "gear") }
        }
    }
}


