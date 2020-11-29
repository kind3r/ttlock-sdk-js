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

## Initialize lock

- `TTLockClient::initLock(ExtendedBluetoothDevice, InitLockCallback)`
  - `ConnectManager::connect2Device`, `OperationType.INIT_LOCK`
    - `BluetoothImpl::connect`
      - **`android.bluetooth.BluetoothAdapter.getRemoteDevice.connectGatt`**, store as `BluetoothImpl::mBluetoothGatt`, used later in `sendComand`
        - `BluetoothImpl::onConnectionStateChange`
          - **`android.bluetooth.BluetoothGatt.discoverServices`**
        - `BluetoothImpl::onServicesDiscovered`
          - DEVICE_INFORMATION_SERVICE = "**0000180a-0000-1000-8000-00805f9b34fb**"
          - list service characteristics
            - READ_MODEL_NUMBER_UUID = "**00002a24-0000-1000-8000-00805f9b34fb**"
            - READ_FIRMWARE_REVISION_UUID = "**00002a26-0000-1000-8000-00805f9b34fb**"
            - READ_HARDWARE_REVISION_UUID = "**00002a27-0000-1000-8000-00805f9b34fb**"
          - UUID_SERVICE = "**00001910-0000-1000-8000-00805f9b34fb**"
          - list service characteristics
            - UUID_WRITE = "**0000fff2-0000-1000-8000-00805f9b34fb**" => `BluetoothImpl::mNotifyCharacteristic`
            - UUID_READ = "**0000fff4-0000-1000-8000-00805f9b34fb**", set notification for changes
              - descriptor UUID_HEART_RATE_MEASUREMENT = "**00002902-0000-1000-8000-00805f9b34fb**", write **`android.bluetooth.BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE`**
        - `BluetoothImpl::onDescriptorWrite`
          - triggers `ConnectManager::onConnectSuccess`
  - `ConnectManager::onConnectSuccess`
    - `TTLockSDKApi::initLock`
      - `TransferData::setAPICommand(APICommand.OP_ADD_ADMIN)`
      - `TransferData::setHotelData(device.getHotelData())` // not useful I think
      - `CommandUtil::getAESKey(TransferData)`;
        - `BluetoothImpl::aesKeyArray = CommandUtil::defaultAesKeyArray`
        - `TransferData.setAesKeyArray(CommandUtil::defaultAesKeyArray)`
        - `Command(LockVersion.lockVersion_V3)`
        - `Command::setCommand(Command.COMM_GET_AES_KEY)`
        - `Command::setData(Constant.VENDOR.getBytes(), CommandUtil::defaultAesKeyArray)` (Constant.VENDOR = "SCIENER")
        - `TransferData::setTransferData(Command::buildCommand())`
        - `BluetoothImpl::sendCommand(TransferData)`
          - add 2 extra bytes at the end (CRLF)
          - split data into a data queue `LinkedList<byte[]>` with at most 20 bytes length each
          - **`android.bluetooth.BluetoothGatt::writeCharacteristic`**`(BluetoothImpl::mNotifyCharacteristic)` (UUID_WRITE = "**0000fff2-0000-1000-8000-00805f9b34fb**")
            - `BluetoothImpl::onCharacteristicWrite`
              - cycle **`android.bluetooth.BluetoothGatt::writeCharacteristic`** until no data is left
              - delay of 2500ms - 5500ms (probably to wait for a characteristic change before disconnecting ?)
              - `BluetoothImpl::disconnect`
            - `BluetoothImpl::onCharacteristicChanged` (asssumption, because previous event is a dead end)
              - store new data in `mReceivedDataBuffer`
              - 2 stoppers for end of data: CRLF at the end or a calculated `leftRecDataCount` (we have to figure it out later)
              - `BluetoothImpl::processCommandResponse` if end of data (remove CRLF if exists)
                - huge function to process all possible command responses
                - `new Command(values)`, check CRC
                - `data = command.getData(aesKeyArray)` - for lock init, the CommandUtil::defaultAesKeyArray is used
                - response is `Command.COMM_GET_AES_KEY`
                - check data[1] == CommandResponse.SUCCESS
                - `CommandUtil::V_addAdmin` with random `adminPs` and `unlockKey` (10 digit numbers, first digit always 0, so basically 9 digits)
                - response is `Command.COMM_RESPONSE`
                - command is `Command.COMM_ADD_ADMIN`
                - check if data == `SCIENER`
                - `CommandUtil.C_calibationTime` with time in ms and timezone
                - `BluetoothImpl::initLock`
                  - `CommandUtil.searchDeviceFeature`
                  - `BluetoothImpl::genCommandQue` Depending on the features, extra commands are ran agains the lock
                  - extra commands
                  - last command seems to set some random passwords `CommandUtil_V3::initPasswords`. After that `CommandUtil_V3::controlRemoteUnlock` and then `CommandUtil::operateFinished`
                  - a last check is being run `CommandUtil.readDeviceInfo` which starts another chain of commands to get more information about the device ending with finally calling `onInitLockSuccess`
```java
TTLockClient.getDefault().initLock(device, new InitLockCallback() {
    @Override
    public void onInitLockSuccess(String lockData,int specialValue) {
        //init success
    }
 
    @Override
    public void onFail(LockError error) {
        //failed                
    }
});
```

Lock features:
1, IC (card)
2, FINGER_PRINT
3, WRIST_BAND
5, PASSCODE_WITH_DELETE_FUNCTION
6, FIRMWARE_SETTTING
7, MODIFY_PASSCODE_FUNCTION
8, MANUAL_LOCK
9, PASSWORD_DISPLAY_OR_HIDE
13, MAGNETOMETER
15, AUDIO_MANAGEMENT
16, NB_LOCK
19, HOTEL_LOCK
23, PASSAGE_MODE_AND_AUTO_LOCK_AND_CAN_CLOSE