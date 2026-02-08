import Foundation

enum API {
    static var baseURL = URL(string: "http://localhost:3001")!

    struct ApiOk<T: Decodable>: Decodable {
        let ok: Bool
        let data: T
    }

    static func request<T: Decodable>(
        _ path: String,
        method: String = "GET",
        token: String? = nil,
        body: Encodable? = nil
    ) async throws -> T {
        var req = URLRequest(url: baseURL.appending(path: path))
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        if let token {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "authorization")
        }
        if let body {
            req.httpBody = try JSONEncoder().encode(AnyEncodable(body))
        }

        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        if http.statusCode < 200 || http.statusCode >= 300 {
            let text = String(data: data, encoding: .utf8) ?? ""
            throw NSError(domain: "API", code: http.statusCode, userInfo: [NSLocalizedDescriptionKey: text])
        }

        let wrapper = try JSONDecoder().decode(ApiOk<T>.self, from: data)
        return wrapper.data
    }
}

struct AnyEncodable: Encodable {
    private let _encode: (Encoder) throws -> Void
    init(_ encodable: Encodable) {
        _encode = encodable.encode
    }
    func encode(to encoder: Encoder) throws {
        try _encode(encoder)
    }
}


