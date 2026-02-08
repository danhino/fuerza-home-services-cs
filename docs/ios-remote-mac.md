# iOS on Windows: Remote Mac Build & Deploy

You cannot compile an iPhone app on Windows. The standard production workflow is:
- Code on Windows (Cursor)
- Build/sign/upload on macOS (CI or remote Mac)

## Recommended: GitHub Actions (macOS) + TestFlight

### Prereqs
- Apple Developer Program membership
- An App Store Connect app record for bundle id `com.fuerza.homeservices`

### Secrets you’ll add to GitHub
In your GitHub repo: **Settings → Secrets and variables → Actions**

- `APPLE_TEAM_ID`: your Apple Developer Team ID
- `APP_STORE_CONNECT_KEY_ID`: App Store Connect API key id
- `APP_STORE_CONNECT_ISSUER_ID`: issuer id
- `APP_STORE_CONNECT_PRIVATE_KEY`: the `.p8` key contents
- `MATCH_PASSWORD`: password for Fastlane match (if you use match)

You can also start without match and just run CI builds/tests (no signing).

### What CI does
- Runs Xcode build + unit tests
- Optionally signs and uploads to TestFlight (Phase 2 once bundle/certs are configured)

## Remote Mac providers
- MacStadium (dedicated Mac minis)
- AWS EC2 Mac instances

On the Mac:
- Install Xcode (App Store)
- Install Homebrew
- `brew install xcodegen`
- Generate project from `ios/project.yml`


