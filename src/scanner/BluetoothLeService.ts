'use strict';

import { EventEmitter } from "events";
import { ScannerInterface, ScannerOptions, ScannerType } from "./ScannerInterface";
import { NobleScanner } from "./noble/NobleScanner";
import { TTBluetoothDevice } from "../device/TTBluetoothDevice";
import { DeviceInterface } from "./DeviceInterface";
import { NobleScannerWebsocket } from "./noble/NobleScannerWebsocket";

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
  private btDevices: Map<string, TTBluetoothDevice>;

  constructor(uuids: string[] = TTLockUUIDs, scannerType: ScannerType = "noble", scannerOptions: ScannerOptions) {
    super();
    this.btDevices = new Map();
    if (scannerType == "noble") {
      this.scanner = new NobleScanner(uuids);
    } else if (scannerType == "noble-websocket") {
      this.scanner = new NobleScannerWebsocket(uuids, 
        scannerOptions.websocketHost, 
        scannerOptions.websocketPort,
        scannerOptions.websocketAesKey,
        scannerOptions.websocketUsername,
        scannerOptions.websocketPassword);
    } else {
      throw "Invalid parameters";
    }
    this.scanner.on("ready", () => this.emit("ready"));
    this.scanner.on("discover", this.onDiscover.bind(this));
    this.scanner.on("scanStart", () => this.emit("scanStart"));
    this.scanner.on("scanStop", () => this.emit("scanStop"));
  }

  async startScan(passive: boolean = false): Promise<boolean> {
    return await this.scanner.startScan(passive);
  }

  async stopScan(): Promise<boolean> {
    return await this.scanner.stopScan();
  }

  isScanning(): boolean {
    return this.scanner.getState() == "scanning";
  }

  forgetDevice(id: string) {
    this.btDevices.delete(id);
  }

  private onDiscover(device: DeviceInterface) {
    // TODO: move device storage to TTLockClient
    // check if the device was previously discovered and update
    if(this.btDevices.has(device.id)) {
      const ttDevice = this.btDevices.get(device.id);
      if (typeof ttDevice != 'undefined') {
        ttDevice.updateFromDevice(device);
        // this.emit("discover", ttDevice);
      }
    } else {
      const ttDevice = TTBluetoothDevice.createFromDevice(device, this.scanner);
      this.btDevices.set(device.id, ttDevice);
      this.emit("discover", ttDevice);
    }
  }
}