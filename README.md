![SSSS Mobile Logo](http://ssssmobile.app/ssss_icon_114.png)

# SSSS Mobile
## Shamir's Secret Sharing Scheme Split & Combine Functions for Android & iOS

2020 Dustin Runnells (dustin@runnells.name)

Website/FAQ: https://ssssmobile.app

Based on the SSSS tool by B. Poettering (http://point-at-infinity.org/ssss/>http://point-at-infinity.org/ssss/) using the ssss-js
library by Gabriel Burca (https://www.npmjs.com/package/ssss-js).

### Status
Currently published in the Google Play store and Apple App Store
* Google Play - https://play.google.com/store/apps/details?id=com.dustinrunnells.ssss
* Apple App Store - https://apps.apple.com/us/app/ssss-mobile/id1505136665?ls=1

## Dependancies
Titanium Modules:
  - ti.nfc - https://github.com/appcelerator-modules/ti.nfc
  - ti.barcode - https://github.com/appcelerator-modules/ti.barcode

Javascript/Node:
  - ssss-js by Gabriel Burca - https://www.npmjs.com/package/ssss-js
  - bignumber.js by Michael Mclaughlin - https://travis-ci.org/github/MikeMcl/bignumber.js
  - qrcodejs by Shim Sangmin - https://github.com/davidshimjs/qrcodejs
  - JQuery - http://jquery.com (Help and QR Code view are actually Webviews)

Icons:
  - Sergey Ershov - https://www.iconfinder.com/iconsets/multimedia-75
  - Paste Icon by Freepik - https://www.flaticon.com/free-icon/paste_178922

Font:
  - Arimo by Steve Matteson - https://fonts.google.com/specimen/Arimo

## Notes
Distributing this app for iOS requires a Provisioning Profile with a non-wildcard App Identifier that contains the "NFC Tag Reading" capability.

## Build
Titanium SDK 8.3.1.

Run on Android device:
```appc run -p android --build-only```

Run on iPhone:
```appc run -p ios --build-only```

Google Play Package Build:
```appc run -p android -T dist-playstore -K <keystore> -P <keystore_password> -L ssss -O <dist_dir>```
