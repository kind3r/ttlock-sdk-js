# Operational flow

## Init previous data
- Load stored data

## Discovery

- Turn bluetooth on
- Start LE scan for UUID = **1910**
- On BLE device found add or update
- Parse manufacturer data for the public details about the device (mac, lock type, battery, settings mode)
  - name is not available on MacOs until paired (?)
- Save data

## Initialisation
- Connect to the GATT server of the device
- Discover services
- Discover characteristcs for service **0000180a-0000-1000-8000-00805f9b34fb**
  - READ_MODEL_NUMBER_UUID = "**00002a24-0000-1000-8000-00805f9b34fb**"
  - READ_FIRMWARE_REVISION_UUID = "**00002a26-0000-1000-8000-00805f9b34fb**"
  - READ_HARDWARE_REVISION_UUID = "**00002a27-0000-1000-8000-00805f9b34fb**"
- Discover characteristics for service **00001910-0000-1000-8000-00805f9b34fb**
  - UUID_WRITE = "**0000fff2-0000-1000-8000-00805f9b34fb**" => `BluetoothImpl::mNotifyCharacteristic`
  - UUID_READ = "**0000fff4-0000-1000-8000-00805f9b34fb**", set notification for changes
    - descriptor UUID_HEART_RATE_MEASUREMENT = "**00002902-0000-1000-8000-00805f9b34fb**", write **`android.bluetooth.BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE`**