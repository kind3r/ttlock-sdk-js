# Original SDK analisys

## SDK init and scanning

- `TTLockClient::getDefault` - singleton*ish* pattern (*most of the classes are like this*)
-  Calls `TTLockSDKApi::prepareBTService`
  - Calls `BluetoothImpl::prepareBTService`
    - register bluetooth device state change (**powering on**, **on**, **off**, etc.) callback `BroadcastReceiver::onReceive`
      - this also starts the scan in case bluetooth turns on and scan was requested
    - sets `mBluetoothManager = android.bluetooth.BluetoothManager`, `mBluetoothAdapter = mBluetoothManager.getAdapter()`;

```java
TTLockClient.getDefault().prepareBTService(getApplicationContext());
```

- `TTLockClient::startScanLock(ScanLockCallback)`
- Calls `LockCallbackManager::setLockScanCallback(ScanLockCallback)`
- Calls `Calls TTLockSDKApi::startScan`
  - Calls `BluetoothImpl::startScan`
    - LockCallbackManager::getLockScanCallback
    - `mScanner = ScannerCompat.getScanner()`, 
      - decides between `ScannerLollipop` and `ScannerImplJB`
      - UUID_SERVICE = "**00001910-0000-1000-8000-00805f9b34fb**"
    - `ScannerCompat::startScan(ScanCallback)`;
      - `ScannerLollipop::startScanInternal` with uuids above
        - **`android.bluetooth.le.BluetoothLeScanner.startScan`**
          - **`ScanSettings.SCAN_MODE_LOW_LATENCY`**
          - **`ScanFilter`** - uuids or null if scanAll
          - `ScanCallbackImpl`
        - `ScanCallbackImpl::onScanResult`
          - `ScanCallback::onScan` with new `ExtendedBluetoothDevice(`**`android.bluetooth.le.ScanResult`**`)`
            - **`android.bluetooth.le.ScanResult.getBytes`** Returns raw bytes of scan record. **This is what we need to determine all the parameters of the lock**
            - `ScanLockCallback::onScanLockSuccess`

```java
TTLockClient.getDefault().startScanLock(new ScanLockCallback() {
    @Override
    public void onScanLockSuccess(ExtendedBluetoothDevice device) {
 
    }
});
```

```java
TTLockClient.getDefault().stopBTService();
```

