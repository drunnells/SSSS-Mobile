![SSSS Mobile Logo](https://raw.githubusercontent.com/drunnells/SSSS-Mobile/master/app/assets/android/appicon.png)

# SSSS Mobile
## Shamir's Secret Sharing Scheme Split & Combine Functions for Android & iOS

2023 Dustin Runnells (dustin@runnells.name)

Website/FAQ: https://ssssmobile.app

Based on the SSSS tool by B. Poettering (http://point-at-infinity.org/ssss/) using the ssss-js
library by Gabriel Burca (https://www.npmjs.com/package/ssss-js).

__If you intend to protect potentially important information, please take all necessary backup precautions and use at your own risk!__

### Status
Currently published here:
* Google Play - https://play.google.com/store/apps/details?id=com.dustinrunnells.ssss
* Apple App Store - https://apps.apple.com/us/app/ssss-mobile/id1505136665?ls=1
* Amazon App Store - https://www.amazon.com/dp/B086PHQ9XF

## Dependancies
[Titanium SDK](https://titaniumsdk.com/)

Titanium Modules:
  - ti.nfc - https://github.com/tidev/ti.nfc
    - I needed the NfcForegroundDispatchFilter to include FLAG_MUTABLE: [Pull Request #79](https://github.com/tidev/ti.nfc/pull/79)
  - ti.barcode - https://github.com/tidev/ti.barcode

Javascript/Node:
  - ssss-js by Gabriel Burca - https://www.npmjs.com/package/ssss-js
  - bignumber.js by Michael Mclaughlin - https://travis-ci.org/github/MikeMcl/bignumber.js
  - qrcodejs by Shim Sangmin - https://github.com/davidshimjs/qrcodejs
  - JQuery - http://jquery.com (Help and QR Code view are actually Webviews)
  - secure-random-password - https://github.com/rackerlabs/secure-random-password

Icons:
  - Sergey Ershov - https://www.iconfinder.com/iconsets/multimedia-75
  - Cole Bemis - https://www.iconfinder.com/iconsets/feather-2
  - Paste Icon by Freepik - https://www.flaticon.com/free-icon/paste_178922

Font:
  - Arimo by Steve Matteson - https://fonts.google.com/specimen/Arimo

## Notes
Distributing this app for iOS requires a Provisioning Profile with a non-wildcard App Identifier that contains the "NFC Tag Reading" capability.

## Build
Titanium SDK 12.1.2.GA.

Run on Android device:
```ti build -p android --build-only```

Run on iPhone:
```appc run -p ios --build-only```

Google Play Package Build:
```ti build -p android -T dist-playstore -K <keystore> -P <keystore_password> -L ssss -O <dist_dir>```
