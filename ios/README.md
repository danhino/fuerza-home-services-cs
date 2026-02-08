# iOS app (SwiftUI)

You can **edit all iOS code on Windows**, but to **build/run/sign** you need a Mac with Xcode.

This repo supports a “remote Mac” workflow:

## Option A (recommended): GitHub Actions macOS runner (CI builds)
1. Push this repo to GitHub.
2. Add an Apple Developer account + App Store Connect access.
3. Configure signing secrets (see `docs/ios-remote-mac.md`).
4. CI will build + run tests and (optionally) upload to TestFlight.

## Option B: Dedicated remote Mac (MacStadium / AWS EC2 Mac)
1. Rent a Mac.
2. Clone repo.
3. Run `brew install xcodegen` and generate the Xcode project from `ios/project.yml`.
4. Build/run via Xcode.

## Local config
The app reads API base URL from `FuerzaConfig.plist` (generated in Xcode scheme build settings in Phase 2).
For MVP, edit `API.baseURL` in `Sources/App/API.swift`.


