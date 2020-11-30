'use strict';

import events from "events";
import { LockType } from "./constant/Lock";
import { TTBluetoothDevice } from "./device/TTBluetoothDevice";
import { TTLock } from "./device/TTLock";

import { BluetoothLeService, TTLockUUIDs, ScannerType } from "./scanner/BluetoothLeService";
import { DeviceDatabase } from "./store/DeviceDatabase";

export interface Settings {
  uuids?: string[];
  scannerType?: ScannerType;
  deviceDatabase?: string;
}

export interface TTLockClient {
  on(event: "foundLock", listener: (lock: TTLock) => void): this;
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

  async startScanLock(): Promise<boolean> {
    if (this.bleService != null) {
      return await this.bleService.startScan();
    }
    return false;
  }

  async stopScanLock(): Promise<boolean> {
    if (this.bleService != null) {
      return await this.bleService.stopScan();
    }
    return true;
  }

  private onScanResult(device: TTBluetoothDevice): void {
    // we should index and store the new device
    // we can use a Map for this, and maybe nconf for persistent storage
    // do we need to store the ExtendedBluetoothDevice or something else
    // where do we store paired, AES keys etc ? - not here, after init of the lock

    
    // Is it a Lock device ?
    if (device.lockType != LockType.UNKNOWN) {
      const lock = new TTLock(device);
      this.deviceDatabase.addOrUpdateDevice(lock);
      this.emit("foundLock", lock);
    }
  }
}
