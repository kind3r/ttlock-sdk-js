'use strict';

import events from "events";

import { BluetoothLeService, TTLockUUIDs, ScannerType } from "./scanner/BluetoothLeService";
import { ExtendedBluetoothDevice } from "./scanner/ExtendedBluetoothDevice";

export declare interface Settings {
  uuids?: string[];
  scannerType?: ScannerType;
}

export declare interface TTLockClient {
  on(event: "foundDevice", listener: (device: ExtendedBluetoothDevice) => void): this;
}

export class TTLockClient extends events.EventEmitter implements TTLockClient {
  mBluetoothLeService: BluetoothLeService | null = null;
  uuids: string[];
  scannerType: ScannerType = "noble";

  constructor(options: Settings) {
    super();

    if (options.uuids) {
      this.uuids = options.uuids;
    } else {
      this.uuids = TTLockUUIDs;
    }

    if(options.scannerType) {
      this.scannerType = options.scannerType;
    }
  }

  prepareBTService(): boolean {
    if (this.mBluetoothLeService == null) {
      this.mBluetoothLeService = new BluetoothLeService(this.uuids, this.scannerType);
      this.mBluetoothLeService.on("discover", (device: ExtendedBluetoothDevice) => {
        // we should index and store the new device
        // we can use a Map for this, and maybe nconf for persistent storage
        // do we need to store the ExtendedBluetoothDevice or something else
        // where do we store paired, AES keys etc ? - not here, after init of the lock
        this.emit("foundDevice", device);
      });
    }
    return true;
  }

  stopBTService(): boolean {
    if (this.mBluetoothLeService != null) {
      this.stopScanLock();
      this.mBluetoothLeService = null;
    }
    return true;
  }

  startScanLock(): boolean {
    if (this.mBluetoothLeService != null) {
      return this.mBluetoothLeService.startScan();
    }
    return true;
  }

  stopScanLock(): boolean {
    if (this.mBluetoothLeService != null) {
      return this.mBluetoothLeService.stopScan();
    }
    return true;
  }
}
