'use strict';

import { EventEmitter } from "events";
import { ScannerInterface, ScannerType } from "./ScannerInterface";
import { NobleScanner } from "./noble/NobleScanner";
import { TTBluetoothDevice } from "../device/TTBluetoothDevice";
import { DeviceInterface } from "./DeviceInterface";

export { ScannerType } from "./ScannerInterface";
export const TTLockUUIDs: string[] = ["1910", "00001910-0000-1000-8000-00805f9b34fb"];

export interface BluetoothLeService {
  on(event: "ready", listener: () => void): this;
  on(event: "discover", listener: (device: TTBluetoothDevice) => void): this;
  on(event: "scanStart", listener: () => void): this;
  on(event: "scanStop", listener: () => void): this;
}

export class BluetoothLeService extends EventEmitter implements BluetoothLeService {
  private scanner: ScannerInterface;
  private devices: Map<string, TTBluetoothDevice>;

  constructor(uuids: string[] = TTLockUUIDs, scannerType: ScannerType = "auto") {
    super();
    this.devices = new Map();
    if (scannerType == "auto") {
      scannerType = "noble";
    }
    if (scannerType == "noble") {
      this.scanner = new NobleScanner(uuids);
      this.scanner.on("ready", () => this.emit("ready"));
      this.scanner.on("discover", this.onDiscover.bind(this));
      this.scanner.on("scanStart", () => this.emit("scanStart"));
      this.scanner.on("scanStop", () => this.emit("scanStop"));
    } else {
      throw "Invalid parameters";
    }
  }

  async startScan(): Promise<boolean> {
    return await this.scanner.startScan();
  }

  async stopScan(): Promise<boolean> {
    return await this.scanner.stopScan();
  }

  private onDiscover(btDevice: DeviceInterface) {
    // TODO: move device storage to TTLockClient
    // check if the device was previously discovered and update
    if(this.devices.has(btDevice.id)) {
      const device = this.devices.get(btDevice.id);
      if (typeof device != 'undefined') {
        device.updateFromDevice(btDevice);
        // I don't think we should resend the discover on update
        // this.emit("discover", device);
      }
    } else {
      const device = TTBluetoothDevice.createFromDevice(btDevice);
      this.devices.set(btDevice.id, device);
      this.emit("discover", device);
    }
  }
}