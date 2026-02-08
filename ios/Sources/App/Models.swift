import Foundation

enum AppRole: String, CaseIterable, Identifiable {
    case customer
    case technician

    var id: String { rawValue }
    var title: String {
        switch self {
        case .customer: return "I need service"
        case .technician: return "I provide service"
        }
    }
}

enum Trade: String, CaseIterable, Codable, Identifiable {
    case plumber, electrician, hvac, cleaning, pool
    var id: String { rawValue }
    var label: String {
        switch self {
        case .plumber: return "Plumber"
        case .electrician: return "Electrician"
        case .hvac: return "HVAC"
        case .cleaning: return "House Cleaning"
        case .pool: return "Pool Service"
        }
    }
}

struct UserDTO: Codable, Identifiable {
    let id: String
    let role: String
    let name: String
    let phone: String?
    let email: String?
    let photo: String?
    let rating: Double
    let createdAt: String
}

struct TechnicianPinDTO: Codable, Identifiable {
    var id: String { userId }
    let userId: String
    let name: String
    let photo: String?
    let rating: Double
    let trades: [Trade]
    let onlineStatus: Bool
    let currentLat: Double?
    let currentLng: Double?
    let serviceRadiusKm: Double
    let distKm: Double
}

struct EstimateDTO: Codable {
    let amountCents: Int
    let currency: String
}

struct JobDTO: Codable, Identifiable {
    let id: String
    let createdAt: String?
    let updatedAt: String?
    let customerId: String
    let technicianId: String?
    let trade: Trade
    let description: String
    let photos: [String]?
    let address: String
    let lat: Double
    let lng: Double
    let status: String
    let estimate: JobEstimateDTO?
    let estimateChangeRequests: [EstimateChangeRequestDTO]?
    let chat: [ChatMessageDTO]?
}

struct JobEstimateDTO: Codable {
    let jobId: String?
    let originalAmountCents: Int
    let currentAmountCents: Int
    let currency: String
}

struct EstimateChangeRequestDTO: Codable, Identifiable {
    let id: String
    let jobId: String
    let proposedByUserId: String
    let oldAmountCents: Int
    let newAmountCents: Int
    let reason: String
    let status: String
    let createdAt: String?
    let decidedAt: String?
}

struct ChatMessageDTO: Codable, Identifiable {
    let id: String
    let createdAt: String?
    let jobId: String
    let senderId: String
    let message: String
}


