'use strict';

import events from "events";
import { LockType } from "./constant/Lock";
import { TTBluetoothDevice } from "./device/TTBluetoothDevice";
import { TTLock } from "./device/TTLock";

import { BluetoothLeService, TTLockUUIDs, ScannerType } from "./scanner/BluetoothLeService";
import { TTLockData } from "./store/TTLockData";
import { sleep } from "./util/timingUtil";

export interface Settings {
  uuids?: string[];
  scannerType?: ScannerType;
  lockData?: TTLockData[];
}

export interface TTLockClient {
  on(event: "foundLock", listener: (lock: TTLock) => void): this;
  on(event: "scanStart", listener: () => void): this;
  on(event: "scanStop", listener: () => void): this;
}

export class TTLockClient extends events.EventEmitter implements TTLockClient {
  bleService: BluetoothLeService | null = null;
  uuids: string[];
  scannerType: ScannerType = "noble";
  lockData: Map<string, TTLockData>;
  private adapterReady: boolean;

  constructor(options: Settings) {
    super();

    this.adapterReady = false;

    if (options.uuids) {
      this.uuids = options.uuids;
    } else {
      this.uuids = TTLockUUIDs;
    }

    if (options.scannerType) {
      this.scannerType = options.scannerType;
    }

    this.lockData = new Map();
    if (options.lockData && options.lockData.length > 0) {
      options.lockData.forEach((lockData) => {
        this.lockData.set(lockData.address, lockData);
      });
    }
  }

  async prepareBTService(): Promise<boolean> {
    if (this.bleService == null) {
      this.bleService = new BluetoothLeService(this.uuids, this.scannerType);
      this.bleService.on("ready", () => this.adapterReady = true);
      this.bleService.on("discover", this.onScanResult.bind(this));
      this.bleService.on("scanStart", () => this.emit("scanStart"));
      this.bleService.on("scanStop", () => this.emit("scanStop"));
      // wait for adapter to become ready
      let counter = 5;
      do {
        await sleep(500);
        counter--;
      } while (counter > 0 && !this.adapterReady);
      return this.adapterReady;
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

  getLockData(): TTLockData[] {
    const lockData: TTLockData[] = [];
    this.lockData.forEach((lock) => {
      lockData.push(lock);
    })
    return lockData;
  }

  private onScanResult(device: TTBluetoothDevice): void {
    // Is it a Lock device ?
    if (device.lockType != LockType.UNKNOWN) {
      const data = this.lockData.get(device.address);
      const lock = new TTLock(device, data);
      lock.on("lockUpdated", (lock) => {
        const lockData = lock.getLockData();
        if (lockData) {
          this.lockData.set(lockData.address, lockData);
        }
      });
      lock.on("lockReset", (address) => {
        this.lockData.delete(address);
      });
      this.emit("foundLock", lock);
    }
  }
}
