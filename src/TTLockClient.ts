'use strict';

import events from "events";
import { LockType } from "./constant/Lock";
import { TTBluetoothDevice } from "./device/TTBluetoothDevice";
import { TTLock } from "./device/TTLock";

import { BluetoothLeService, TTLockUUIDs, ScannerType } from "./scanner/BluetoothLeService";
import { ScannerOptions } from "./scanner/ScannerInterface";
import { TTLockData } from "./store/TTLockData";
import { sleep } from "./util/timingUtil";

export interface Settings {
  uuids?: string[];
  scannerType?: ScannerType;
  scannerOptions?: ScannerOptions;
  lockData?: TTLockData[];
}

export interface TTLockClient {
  on(event: "ready", listener: () => void): this;
  on(event: "foundLock", listener: (lock: TTLock) => void): this;
  on(event: "scanStart", listener: () => void): this;
  on(event: "scanStop", listener: () => void): this;
  on(event: "updatedLockData", listener: () => void): this;
  on(event: "monitorStart", listener: () => void): this;
  on(event: "monitorStop", listener: () => void): this;
}

export class TTLockClient extends events.EventEmitter implements TTLockClient {
  bleService: BluetoothLeService | null = null;
  uuids: string[];
  scannerType: ScannerType = "noble";
  scannerOptions: ScannerOptions;
  lockData: Map<string, TTLockData>;
  private adapterReady: boolean;
  private lockDevices: Map<string, TTLock> = new Map();
  private scanning: boolean = false;
  private monitoring: boolean = false;

  constructor(options: Settings) {
    super();

    this.adapterReady = false;

    if (options.uuids) {
      this.uuids = options.uuids;
    } else {
      this.uuids = TTLockUUIDs;
    }

    if (typeof options.scannerType != "undefined") {
      this.scannerType = options.scannerType;
    }

    if (typeof options.scannerOptions != "undefined") {
      this.scannerOptions = options.scannerOptions;
    } else {
      this.scannerOptions = {};
    }

    this.lockData = new Map();
    if (options.lockData && options.lockData.length > 0) {
      this.setLockData(options.lockData);
    }
  }

  async prepareBTService(): Promise<boolean> {
    if (this.bleService == null) {
      this.bleService = new BluetoothLeService(this.uuids, this.scannerType, this.scannerOptions);
      this.bleService.on("ready", () => { this.adapterReady = true; this.emit("ready") });
      this.bleService.on("scanStart", this.onScanStart.bind(this));
      this.bleService.on("scanStop", this.onScanStop.bind(this));
      this.bleService.on("discover", this.onScanResult.bind(this));
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
    if (this.bleService != null && !this.scanning && !this.monitoring) {
      this.scanning = true;
      this.scanning = await this.bleService.startScan();
      return this.scanning;
    }
    return false;
  }

  async stopScanLock(): Promise<boolean> {
    if (this.bleService != null && this.isScanning()) {
      return await this.bleService.stopScan();
    }
    return true;
  }

  async startMonitor(): Promise<boolean> {
    if (this.bleService != null && !this.scanning && !this.monitoring) {
      this.monitoring = true;
      this.monitoring = await this.bleService.startScan(true);
      return this.monitoring;
    }
    return false;
  }

  async stopMonitor(): Promise<boolean> {
    if (this.bleService != null && this.isMonitoring()) {
      return await this.bleService.stopScan();
    }
    return false;
  }

  isScanning(): boolean {
    if (this.bleService) {
      return (this.bleService.isScanning() && this.scanning);
    }
    return false;
  }

  isMonitoring(): boolean {
    if (this.bleService) {
      return (this.bleService.isScanning() && this.monitoring);
    }
    return false;
  }

  getLockData(): TTLockData[] {
    const lockData: TTLockData[] = [];
    for (let [id, lock] of this.lockData) {
      lockData.push(lock);
    }
    return lockData;
  }

  setLockData(newLockData: TTLockData[]): void {
    this.lockData = new Map();
    if (newLockData && newLockData.length > 0) {
      newLockData.forEach((lockData) => {
        this.lockData.set(lockData.address, lockData);
        const lock = this.lockDevices.get(lockData.address);
        if (typeof lock != "undefined") {
          lock.updateLockData(lockData);
        }
      });
    }
  }

  private onScanStart(): void {
    if (this.scanning) {
      this.emit("scanStart");
    } else if (this.monitoring) {
      this.emit("monitorStart");
    }
  }

  private onScanStop(): void {
    if (this.scanning) {
      this.emit("scanStop");
      this.scanning = false;
    } else if (this.monitoring) {
      this.emit("monitorStop");
      this.monitoring = false;
    }
  }

  private onScanResult(device: TTBluetoothDevice): void {
    // Is it a Lock device ?
    if (device.lockType != LockType.UNKNOWN) {

      if (!this.lockDevices.has(device.address)) {
        const data = this.lockData.get(device.address);
        const lock = new TTLock(device, data);
        this.lockDevices.set(device.address, lock);
        lock.on("dataUpdated", (lock) => {
          const lockData = lock.getLockData();
          if (typeof lockData != "undefined") {
            this.lockData.set(lockData.address, lockData);
            this.emit("updatedLockData");
          }
        });
        lock.on("lockReset", (address) => {
          this.lockData.delete(address);
        });

        this.emit("foundLock", lock);
      }

    }
  }
}
