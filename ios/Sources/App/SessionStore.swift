import Foundation

final class SessionStore: ObservableObject {
    @Published var token: String? {
        didSet { persist() }
    }
    @Published var user: UserDTO?

    @Published var selectedAppRole: AppRole = .customer {
        didSet { persistRole() }
    }

    private let tokenKey = "fuerza.jwt"
    private let roleKey = "fuerza.selectedRole"

    init() {
        token = UserDefaults.standard.string(forKey: tokenKey)
        if let raw = UserDefaults.standard.string(forKey: roleKey),
           let r = AppRole(rawValue: raw) {
            selectedAppRole = r
        }
    }

    func signOut() {
        token = nil
        user = nil
    }

    private func persist() {
        if let token {
            UserDefaults.standard.set(token, forKey: tokenKey)
        } else {
            UserDefaults.standard.removeObject(forKey: tokenKey)
        }
    }

    private func persistRole() {
        UserDefaults.standard.set(selectedAppRole.rawValue, forKey: roleKey)
    }
}


