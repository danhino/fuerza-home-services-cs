import SwiftUI

struct TechnicianHomeView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var online = false
    @State private var status: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Availability") {
                    Toggle("Go online", isOn: $online)
                        .onChange(of: online) { _, newValue in
                            Task { await setOnline(newValue) }
                        }
                    Button("Update location (demo)") {
                        Task { await updateLocationDemo() }
                    }
                }

                Section("Incoming requests (MVP)") {
                    Text("Realtime request inbox (Socket.IO) is wired on the backend; iOS realtime hookup is Phase 2 in this repo.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                if let status {
                    Section("Status") { Text(status).font(.footnote) }
                }
            }
            .navigationTitle("Technician")
        }
    }

    private func setOnline(_ isOnline: Bool) async {
        guard let token = session.token else { return }
        status = isOnline ? "Going online..." : "Going offline..."
        struct Body: Encodable { let onlineStatus: Bool }
        do {
            _ = try await API.request(
                "/technicians/me/online",
                method: "POST",
                token: token,
                body: Body(onlineStatus: isOnline)
            ) as TechProfileRes
            status = isOnline ? "Online" : "Offline"
        } catch {
            status = error.localizedDescription
        }
    }

    private func updateLocationDemo() async {
        guard let token = session.token else { return }
        status = "Updating location..."
        struct Body: Encodable { let lat: Double; let lng: Double }
        do {
            // Demo: downtown Austin
            _ = try await API.request(
                "/technicians/me/location",
                method: "POST",
                token: token,
                body: Body(lat: 30.2672, lng: -97.7431)
            ) as TechProfileRes
            status = "Location updated"
        } catch {
            status = error.localizedDescription
        }
    }
}

private struct TechProfileRes: Decodable {}


