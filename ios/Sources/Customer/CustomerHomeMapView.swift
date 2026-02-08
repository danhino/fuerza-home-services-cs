import SwiftUI
import MapKit

struct CustomerHomeMapView: View {
    @EnvironmentObject private var session: SessionStore

    @State private var trade: Trade = .plumber
    @State private var pins: [TechnicianPinDTO] = []
    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 30.2672, longitude: -97.7431),
        span: MKCoordinateSpan(latitudeDelta: 0.08, longitudeDelta: 0.08)
    )
    @State private var status: String?

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                Map(coordinateRegion: $region, annotationItems: pins) { pin in
                    MapAnnotation(coordinate: CLLocationCoordinate2D(latitude: pin.currentLat ?? 0, longitude: pin.currentLng ?? 0)) {
                        VStack(spacing: 2) {
                            Image(systemName: "mappin.circle.fill")
                                .font(.title2)
                                .foregroundStyle(pin.onlineStatus ? .green : .gray)
                            Text(pin.trades.first?.label ?? "Tech")
                                .font(.caption2)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(.thinMaterial, in: Capsule())
                        }
                        .accessibilityLabel("\(pin.name), \(Int(pin.distKm)) kilometers away")
                    }
                }
                .ignoresSafeArea()

                CustomerBottomSheet(
                    trade: $trade,
                    pins: pins,
                    status: status,
                    onRefresh: { Task { await loadNearby() } },
                    onRequest: { Task { await requestService() } }
                )
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Text("Fuerza").font(.headline)
                }
            }
            .task {
                await loadNearby()
            }
        }
    }

    private func loadNearby() async {
        guard let token = session.token else { return }
        status = "Loading nearby technicians..."
        struct Res: Decodable { let technicians: [TechnicianPinDTO] }
        do {
            let q = "?lat=\(region.center.latitude)&lng=\(region.center.longitude)&trade=\(trade.rawValue)"
            let res: Res = try await API.request("/technicians/nearby\(q)", token: token)
            pins = res.technicians.filter { $0.currentLat != nil && $0.currentLng != nil }
            status = pins.isEmpty ? "No technicians available right now." : nil
        } catch {
            status = error.localizedDescription
        }
    }

    private func requestService() async {
        guard let token = session.token else { return }
        status = "Creating job..."
        struct EstimateRes: Decodable { let amountCents: Int; let currency: String }
        struct CreateRes: Decodable { let job: JobDTO }
        struct EstimateBody: Encodable { let trade: String }
        struct CreateBody: Encodable {
            let trade: String
            let description: String
            let photos: [String]
            let address: String
            let lat: Double
            let lng: Double
            let isAsap: Bool
        }

        do {
            let est: EstimateRes = try await API.request(
                "/jobs/estimate",
                method: "POST",
                token: token,
                body: EstimateBody(trade: trade.rawValue)
            )
            status = "Flat estimate: \(formatMoney(cents: est.amountCents, currency: est.currency)). Submitting…"

            let created: CreateRes = try await API.request(
                "/jobs",
                method: "POST",
                token: token,
                body: CreateBody(
                    trade: trade.rawValue,
                    description: "ASAP \(trade.label) request (MVP demo).",
                    photos: [],
                    address: "123 Main St, Austin, TX",
                    lat: region.center.latitude,
                    lng: region.center.longitude,
                    isAsap: true
                )
            )
            status = "Requested job \(created.job.id). Waiting for a technician…"
        } catch {
            status = error.localizedDescription
        }
    }

    private func formatMoney(cents: Int, currency: String) -> String {
        let nf = NumberFormatter()
        nf.numberStyle = .currency
        nf.currencyCode = currency.uppercased()
        return nf.string(from: NSNumber(value: Double(cents) / 100.0)) ?? "\(cents)"
    }
}

private struct CustomerBottomSheet: View {
    @Binding var trade: Trade
    let pins: [TechnicianPinDTO]
    let status: String?
    let onRefresh: () -> Void
    let onRequest: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            Capsule()
                .fill(Color.secondary.opacity(0.35))
                .frame(width: 36, height: 5)
                .padding(.top, 10)

            HStack {
                Picker("Trade", selection: $trade) {
                    ForEach(Trade.allCases) { t in
                        Text(t.label).tag(t)
                    }
                }
                .pickerStyle(.menu)
                Spacer()
                Button("Refresh", action: onRefresh)
            }
            .padding(.horizontal, 16)

            if let status {
                Text(status)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 16)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            if pins.isEmpty {
                Button("Request service", action: onRequest)
                    .buttonStyle(.borderedProminent)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 16)
            } else {
                List {
                    Section("Closest technicians") {
                        ForEach(pins.prefix(8)) { pin in
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(pin.name).font(.headline)
                                    Text("\(pin.trades.first?.label ?? "Technician") • \(String(format: "%.1f", pin.distKm)) km")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text(String(format: "%.1f★", pin.rating))
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
                .listStyle(.plain)
                .frame(height: 260)

                Button("Request service", action: onRequest)
                    .buttonStyle(.borderedProminent)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 16)
            }
        }
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .padding(.horizontal, 10)
        .padding(.bottom, 10)
        .accessibilityElement(children: .contain)
    }
}


