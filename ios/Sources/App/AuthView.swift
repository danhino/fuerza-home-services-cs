import SwiftUI

struct AuthView: View {
    @EnvironmentObject private var session: SessionStore

    @State private var channel: String = "email"
    @State private var target: String = "customer@fuerza.local"
    @State private var name: String = "Demo User"
    @State private var role: String = "customer"
    @State private var code: String = ""
    @State private var devCodeHint: String?
    @State private var status: String?
    @State private var loading = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Login") {
                    Picker("Channel", selection: $channel) {
                        Text("Email").tag("email")
                        Text("Phone").tag("phone")
                    }
                    TextField(channel == "email" ? "email" : "phone", text: $target)
                        .textInputAutocapitalization(.never)
                        .keyboardType(channel == "email" ? .emailAddress : .phonePad)

                    TextField("Name (first login only)", text: $name)

                    Picker("Role", selection: $role) {
                        Text("Customer").tag("customer")
                        Text("Technician").tag("technician")
                        Text("Both").tag("both")
                    }
                }

                Section("OTP") {
                    HStack {
                        Button("Send code") { Task { await start() } }
                            .disabled(loading)
                        Spacer()
                        if let devCodeHint {
                            Text("Dev: \(devCodeHint)")
                                .foregroundStyle(.secondary)
                                .font(.footnote)
                        }
                    }
                    TextField("6-digit code", text: $code)
                        .keyboardType(.numberPad)
                    Button("Verify & Sign in") { Task { await verify() } }
                        .disabled(loading || code.count != 6)
                }

                if let status {
                    Section("Status") {
                        Text(status).font(.footnote)
                    }
                }
            }
            .navigationTitle("Fuerza")
        }
    }

    private func start() async {
        loading = true
        defer { loading = false }
        status = "Requesting code..."
        struct Body: Encodable { let channel: String; let target: String }
        do {
            let res: StartRes = try await API.request("/auth/start", method: "POST", body: Body(channel: channel, target: target))
            devCodeHint = res.devCode
            status = "Code requested."
        } catch {
            status = error.localizedDescription
        }
    }

    private func verify() async {
        loading = true
        defer { loading = false }
        status = "Verifying..."
        struct Body: Encodable { let channel: String; let target: String; let code: String; let name: String?; let role: String? }
        do {
            let res: VerifyRes = try await API.request(
                "/auth/verify",
                method: "POST",
                body: Body(channel: channel, target: target, code: code, name: name.isEmpty ? nil : name, role: role)
            )
            session.token = res.token
            session.user = res.user
            status = "Signed in."
        } catch {
            status = error.localizedDescription
        }
    }
}

private struct StartRes: Decodable {
    let devCode: String?
}

private struct VerifyRes: Decodable {
    let token: String
    let user: UserDTO
}


