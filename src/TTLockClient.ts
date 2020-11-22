'use strict';

import events from "events";

import { BluetoothLeService, TTLockUUIDs, ScannerType } from "./scanner/BluetoothLeService";
import { ExtendedBluetoothDevice } from "./scanner/ExtendedBluetoothDevice";
import { DeviceDatabase } from "./store/DeviceDatabase";

export declare interface Settings {
  uuids?: string[];
  scannerType?: ScannerType;
  deviceDatabase?: string;
}

export declare interface TTLockClient {
  on(event: "foundDevice", listener: (device: ExtendedBluetoothDevice) => void): this;
}

export class TTLockClient extends events.EventEmitter implements TTLockClient {
  bleService: BluetoothLeService | null = null;
  uuids: string[];
  scannerType: ScannerType = "noble";
  deviceDatabase: DeviceDatabase;

  constructor(options: Settings) {
    super();

    if (options.uuids) {
      this.uuids = options.uuids;
    } else {
      this.uuids = TTLockUUIDs;
    }

    if (options.scannerType) {
      this.scannerType = options.scannerType;
    }

    this.deviceDatabase = new DeviceDatabase();
    if (options.deviceDatabase) {
      if(!this.deviceDatabase.loadFromJSON(options.deviceDatabase)) {
        throw new Error("Invalid device database format");
      }
    }
  }



  prepareBTService(): boolean {
    if (this.bleService == null) {
      this.bleService = new BluetoothLeService(this.uuids, this.scannerType);
      this.bleService.on("discover", this.onScanResult.bind(this));
    }
    return true;
  }

  stopBTService(): boolean {
    if (this.bleService != null) {
      this.stopScanLock();
      this.bleService = null;
    }
    return true;
  }

  startScanLock(): boolean {
    if (this.bleService != null) {
      return this.bleService.startScan();
    }
    return true;
  }

  stopScanLock(): boolean {
    if (this.bleService != null) {
      return this.bleService.stopScan();
    }
    return true;
  }

  private onScanResult(device: ExtendedBluetoothDevice): void {
    // we should index and store the new device
    // we can use a Map for this, and maybe nconf for persistent storage
    // do we need to store the ExtendedBluetoothDevice or something else
    // where do we store paired, AES keys etc ? - not here, after init of the lock
    this.deviceDatabase.addOrUpdateDevice(device);

    this.emit("foundDevice", device);
  }
}
