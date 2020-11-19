'use strict';

import { ExtendedBluetoothDevice } from "./ExtendedBluetoothDevice";
import { ScannerInterface, ScannerStateType } from "./ScannerInterface";
import events from "events";
const { createBluetooth } = require('node-ble');

export class NodeBleScanner extends events.EventEmitter implements ScannerInterface {
  scannerState: ScannerStateType = "unknown";
  bluetooth: any;
  destroy: any;
  adapter: any;
  scanTimer: NodeJS.Timeout | null = null;
  devices: Map<string, any> = new Map();

  constructor(uuids: string[] = []) {
    super();

    const { bluetooth, destroy } = createBluetooth();
    this.bluetooth = bluetooth;
    this.destroy = destroy;
    // const adapter = await bluetooth.defaultAdapter()
  }

  startScan(): boolean {
    this.devices = new Map();
    this.startNodeBleScan();
    return true;
  }

  stopScan(): boolean {
    this.stopNodeBleScan();
    return true;
  }

  private async startNodeBleScan() {
    if (this.adapter == null) {
      this.adapter = await this.bluetooth.defaultAdapter();
    }
    await this.adapter.startDiscovery();
    this.scanTimer = setInterval(async () => {
      // fetch devices
      // compare with existing
      // emit discovery event
      const devices = await this.adapter.devices();
      this.updateDevices(devices);
    }, 5000);
  }

  private async stopNodeBleScan() {
    await this.adapter.stopDiscovery();

  }

  private async updateDevices(devices: string[]) {
    if (devices && devices.length) {
      for (var i = 0; i < devices.length; i++) {
        const device = await this.adapter.waitDevice(devices[i]);
        this.devices.set(devices[i], device);
        console.log(await device.toString());
        // await device.connect();
        const gatt = await device.gatt();
        console.log(await gatt.services());
        console.log(this.devices.size);
        // console.log(device);
      }
    }
  }
}