# Original SDK analisys

> The analisys is done only on the **`LockType.LOCK_TYPE_V3`** that use command protocol V3 lock as there are 7 types of locks that use slightly different type of protocol and features. It is possible to extend in the future to also support this type of locks.

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
                - `CommandUtil.C_calibationTime` with time in ms and timezone. The response of this returns a bad CRC
                - `BluetoothImpl::initLock`
                  - `CommandUtil.searchDeviceFeature`
                  - `BluetoothImpl::genCommandQue` Depending on the features, extra commands are ran agains the lock
                  - extra commands:
                    - Command.COMM_AUDIO_MANAGE -> CommandUtil_V3.audioManage
                    - Command.COMM_AUTO_LOCK_MANAGE -> CommandUtil.searchAutoLockTime
                    - Command.COMM_GET_ADMIN_CODE -> CommandUtil_V3.getAdminCode
                  - last command seems to set some random passwords `CommandUtil_V3::initPasswords`. After that `CommandUtil_V3::controlRemoteUnlock` and then `CommandUtil::operateFinished`
                  - a last check is being run `CommandUtil.readDeviceInfo` which starts another chain of commands to get more information about the device ending with finally calling `onInitLockSuccess`
                    - DeviceInfoType.MODEL_NUMBER -> modelNum
                    - DeviceInfoType.HARDWARE_REVISION -> hardwareRevision
                    - DeviceInfoType.FIRMWARE_REVISION -> firmwareRevision
                    - DeviceInfoType.MANUFACTURE_DATE -> factoryDate
                    - if FeatureValue.NB_LOCK : 
                      - DeviceInfoType.NB_OPERATOR -> nbOperator
                      - DeviceInfoType.NB_IMEI -> nbNodeId
                      - DeviceInfoType.NB_CARD_INFO -> nbCardNumber
                      - DeviceInfoType.NB_RSSI -> nbRssi
                        - Posibilitity to run `CommandUtil_V3.configureNBServerAddress` with transferData.getPort() and transferData.getAddress()
                        - TODO: check what that is for
                    - else :
                      - DeviceInfoType.LOCK_CLOCK -> lockClock
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

## Reset lock

- Same connection stuff as for init
- `TTLockSDKApi::resetLock`
  - `CommandUtil::A_checkAdmin`:222 uid, lockVersionString, adminPs, unlockKey, lockFlagPos, aesKeyArray, 0, null, apiCommand (from lockData)
  - `CommandUtil::A_checkAdmin`:263 (uid, lockVersionString, adminPs, unlockKey, lockFlagPos, aesKeyArray, 0, null, apiCommand)
    - `CommandUtil_V3::checkAdmin` returns psFromLock, probably like a token
    - `CommandUtil::checkRandom`
    - `BluetoothImpl::isCheckedLockPermission = true`
    - `CommandUtil.R_resetLock`

```java
TTLockClient.getDefault().resetLock(mCurrentLock.getLockData(), mCurrentLock.getLockMac(),new ResetLockCallback() {
    @Override
    public void onResetLockSuccess() {
        makeToast("-lock is reset and now upload to  server -");
        uploadResetLock2Server();
    }
 
    @Override
    public void onFail(LockError error) {
        makeErrorToast(error);
    }
});
```

## Lock/unlock

- Same connection stuff as for init
- `TTLockSDKApi::controlLock`, keyData.getUserType() == 110302 - does not seem to be used anywhere
  - `TTLockSDKApi::unlockByUser`
    - `CommandUtil::U_checkUserTime`
    - `CommandUtil.G_unlock`
  - `TTLockSDKApi::unlockByAdmin`
    - `CommandUtil.A_checkAdmin`
    - `CommandUtil.G_unlock`
  - `TTLockSDKApi::lockByUser`
    - `CommandUtil::U_checkUserTime`
    - `CommandUtil.lock`

```java
TTLockClient.getDefault().controlLock(ControlAction.UNLOCK, mMyTestLockEKey.getLockData(), mMyTestLockEKey.getLockMac(),new ControlLockCallback() {
    @Override
    public void onControlLockSuccess(int lockAction, int battery, int uniqueId) {
        Toast.makeText(UnlockActivity.this,"lock is unlock  success!",Toast.LENGTH_LONG).show();
    }
 
    @Override
    public void onFail(LockError error) {
        Toast.makeText(UnlockActivity.this,"unLock fail!--" + error.getDescription(),Toast.LENGTH_LONG).show();
    }
});

TTLockClient.getDefault().controlLock(ControlAction.LOCK, mMyTestLockEKey.getLockData(), mMyTestLockEKey.getLockMac(),new ControlLockCallback() {
    @Override
    public void onControlLockSuccess(int lockAction, int battery, int uniqueId) {
        Toast.makeText(UnlockActivity.this,"lock is locked!",Toast.LENGTH_LONG).show();
    }
 
    @Override
    public void onFail(LockError error) {
        Toast.makeText(UnlockActivity.this,"lock lock fail!--" + error.getDescription(),Toast.LENGTH_LONG).show();
    }
});
```

