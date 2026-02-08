import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var session: SessionStore

    var body: some View {
        NavigationStack {
            Form {
                Section("Role") {
                    Picker("Current role", selection: $session.selectedAppRole) {
                        ForEach(AppRole.allCases) { r in
                            Text(r.title).tag(r)
                        }
                    }
                    .pickerStyle(.inline)

                    Text("You can switch roles any time. Your account role on the server can be set to BOTH.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("Account") {
                    if let user = session.user {
                        LabeledContent("Name", value: user.name)
                        LabeledContent("Server role", value: user.role)
                    } else {
                        Text("Signed in.")
                    }
                    Button(role: .destructive) {
                        session.signOut()
                    } label: {
                        Text("Sign out")
                    }
                }
            }
            .navigationTitle("Settings")
        }
    }
}


