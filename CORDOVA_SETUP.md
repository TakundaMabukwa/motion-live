# Cordova GMV Barcode Scanner Setup

## Installation

To use the VIN scanner functionality in this application, you need to install the Cordova GMV Barcode Scanner plugin.

### Prerequisites

1. **Cordova CLI** installed globally:
   ```bash
   npm install -g cordova
   ```

2. **Android Studio** (for Android development)
3. **Xcode** (for iOS development)

### Plugin Installation

1. **Add the plugin to your Cordova project:**
   ```bash
   cordova plugin add cordova-gmv-barcode-scanner
   ```

2. **For iOS, you may need to add camera permissions to `config.xml`:**
   ```xml
   <platform name="ios">
     <config-file target="Info.plist" parent="NSCameraUsageDescription">
       <string>This app uses the camera to scan VIN numbers and driver's licenses.</string>
     </config-file>
   </platform>
   ```

3. **For Android, add camera permissions to `config.xml`:**
   ```xml
   <platform name="android">
     <uses-permission android:name="android.permission.CAMERA" />
   </platform>
   ```

### Plugin Features

The `cordova-gmv-barcode-scanner` plugin provides:

#### 1. VIN Scanning (`scanVIN`)
- **Purpose**: Scan vehicle VIN numbers
- **Formats**: Code39 and Data Matrix
- **Validation**: Built-in VIN checksum validation
- **Usage**:
  ```javascript
  window.plugins.GMVBarcodeScanner.scanVIN(
    (result) => { /* Handle VIN */ },
    (error) => { /* Handle error */ },
    { width: 0.5, height: 0.7 }
  );
  ```

#### 2. Driver's License Scanning (`scanLicense`)
- **Purpose**: Scan driver's license PDF417 barcodes
- **Format**: PDF417
- **Output**: Structured license data object
- **Usage**:
  ```javascript
  window.plugins.GMVBarcodeScanner.scanLicense(
    (result) => { /* Handle license data */ },
    (error) => { /* Handle error */ },
    { width: 0.5, height: 0.7 }
  );
  ```

#### 3. Generic Barcode Scanning (`scan`)
- **Purpose**: Scan any supported barcode format
- **Formats**: Code128, Code39, Code93, CodaBar, DataMatrix, EAN13, EAN8, ITF, QRCode, UPCA, UPCE, PDF417, Aztec
- **Usage**:
  ```javascript
  window.plugins.GMVBarcodeScanner.scan(
    (result) => { /* Handle result */ },
    (error) => { /* Handle error */ },
    options
  );
  ```

### Plugin Options

```javascript
var options = {
  types: {
    Code128: true,
    Code39: true,
    Code93: true,
    CodaBar: true,
    DataMatrix: true,
    EAN13: true,
    EAN8: true,
    ITF: true,
    QRCode: true,
    UPCA: true,
    UPCE: true,
    PDF417: true,
    Aztec: true
  },
  detectorSize: {
    width: 0.5,  // 50% of screen width
    height: 0.7  // 70% of screen height
  }
};
```

### VIN Validation

The plugin includes built-in VIN validation:
- **Length**: Must be exactly 17 characters
- **Characters**: Only A-H, J-N, P-Z, 0-9 (no I, O, Q)
- **Checksum**: Validates the 9th digit using VIN checksum algorithm

### Driver's License Output

The `scanLicense` function returns structured data:
```javascript
{
  "LicenseNumber": "123456789",
  "FirstName": "Johnny",
  "MiddleName": "Allen",
  "LastName": "Appleseed",
  "BirthDate": "1/31/1990",
  "LicenseExpiration": "1/31/2025",
  "Address": {
    "Address": "1234 Main St.",
    "City": "Fairyland",
    "State": "AB",
    "Zip": "12345"
  },
  "LicenseState": "AB"
}
```

### Platform-Specific Notes

#### Android
- Detector size doesn't exclude surrounding areas from scanning
- All visible content in preview is scanned

#### iOS
- Detector size automatically excludes surrounding areas
- More precise scanning area

### Testing

1. **Build for Android:**
   ```bash
   cordova build android
   ```

2. **Build for iOS:**
   ```bash
   cordova build ios
   ```

3. **Run on device:**
   ```bash
   cordova run android --device
   cordova run ios --device
   ```

### Troubleshooting

1. **Camera permissions not working:**
   - Check `config.xml` permissions
   - Ensure device has camera access enabled

2. **Plugin not found:**
   - Verify plugin is installed: `cordova plugin list`
   - Reinstall if needed: `cordova plugin remove cordova-gmv-barcode-scanner && cordova plugin add cordova-gmv-barcode-scanner`

3. **Scanning not working:**
   - Test on physical device (not simulator)
   - Check console for error messages
   - Verify camera permissions are granted

### Integration with This App

The VIN scanner component automatically detects the GMV plugin and uses it when available. If not available, it falls back to generic Cordova barcode scanning or manual entry.

**Features:**
- ✅ **VIN-specific scanning** with validation
- ✅ **Driver's license scanning** with structured data
- ✅ **Fallback support** for different environments
- ✅ **Manual entry** for web environments
- ✅ **Error handling** and user feedback 