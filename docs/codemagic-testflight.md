# Codemagic + TestFlight setup

This repo includes `codemagic.yaml` to build and upload the iOS app to TestFlight.

## 1) Create your App Store Connect app
- Bundle ID: `com.fuerza.homeservices`
- App name: **Fuerza Home Services**

## 2) Create App Store Connect API key
App Store Connect → Users and Access → Keys

You will need:
- **Key ID**
- **Issuer ID**
- **Private key (.p8) contents**

## 3) Configure Codemagic
1. Connect your GitHub repo in Codemagic.
2. Add the following **Environment Variable Group** named `app_store_connect`:
   - `APP_STORE_CONNECT_KEY_IDENTIFIER`
   - `APP_STORE_CONNECT_ISSUER_ID`
   - `APP_STORE_CONNECT_PRIVATE_KEY` (paste the .p8 contents)

3. Add another **Environment Variable Group** named `ios_signing`.
   - If you use Codemagic automatic signing, add Apple Developer credentials as required.
   - If you use manual signing, upload your Distribution Certificate + Provisioning Profile.

## 4) Run the build
In Codemagic, trigger the `ios_testflight` workflow.

The workflow:
- generates the Xcode project with **XcodeGen**
- builds an **IPA**
- uploads to **TestFlight**

## 5) TestFlight
Open App Store Connect → TestFlight and add internal testers.

## Notes
- Update `ios/exportOptions.plist` if you need different distribution settings.
- If you change the bundle ID, update `codemagic.yaml` and `ios/project.yml`.


