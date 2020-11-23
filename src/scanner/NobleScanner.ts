'use strict';

import { ExtendedBluetoothDevice } from "./ExtendedBluetoothDevice";
import { ScannerInterface, ScannerStateType } from "./ScannerInterface";
import noble from "@abandonware/noble";
import { EventEmitter } from "events";
import { NobleDevice } from "./NobleDevice";

type nobleStateType = "unknown" | "resetting" | "unsupported" | "unauthorized" | "poweredOff" | "poweredOn";

export class NobleScanner extends EventEmitter implements ScannerInterface {
  uuids: string[];
  scannerState: ScannerStateType = "unknown";
  private nobleState: nobleStateType = "unknown";

  constructor(uuids: string[] = []) {
    super();
    this.uuids = uuids;
    noble.on('discover', this.onNobleDiscover.bind(this));
    noble.on('stateChange', this.onNobleStateChange.bind(this));
    noble.on('scanStart', this.onNobleScanStart.bind(this));
    noble.on('scanStop', this.onNobleScanStop.bind(this));
  }

  getState(): ScannerStateType {
    return this.scannerState;
  }

  startScan(): boolean {
    if (this.scannerState == "unknown" || this.scannerState == "stopped") {
      this.scannerState = "starting";
      if (this.nobleState == "poweredOn") {
        this.startNobleScan();
      }
      return true;
    }
    return false;
  }

  stopScan(): boolean {
    if (this.scannerState == "scanning") {
      this.scannerState = "stopping";
      this.stopNobleScan();
      return true;
    }
    return false;
  }

  private async startNobleScan(): Promise<void> {
    try {
      await noble.startScanningAsync(this.uuids, false);
      this.scannerState = "scanning";
    } catch (error) {
      console.error(error);
      if (this.scannerState == "starting") {
        this.scannerState = "stopped";
      }
    }
  }

  private async stopNobleScan(): Promise<void> {
    try {
      await noble.stopScanningAsync();
      this.scannerState = "stopped";
    } catch (error) {
      console.error(error);
      if (this.scannerState == "stopping") {
        this.scannerState = "scanning";
      }
    }
  }

  private onNobleStateChange(state: nobleStateType): void {
    this.nobleState = state;
    if (this.scannerState == "starting" && this.nobleState == "poweredOn") {
      this.startNobleScan();
    }
  }

  private async onNobleDiscover(peripheral: noble.Peripheral): Promise<void> {
    if (this.scannerState != "scanning") {
      return;
    }
    var nobleDevice = new NobleDevice(peripheral);
    // stop scanning
    // how do we determine if scanning is active or not ?
    // noble.reset();
    await nobleDevice.discoverServices();
    // resume scanning
    try {
      const device = new ExtendedBluetoothDevice(nobleDevice);
      this.emit("discover", device);
    } catch (error) {
      console.error(error);
    }
  }

  private onNobleScanStart(): void {
    this.scannerState = "scanning";
  }

  private onNobleScanStop(): void {
    this.scannerState = "stopped";
  }
}

