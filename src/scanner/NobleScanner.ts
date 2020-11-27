'use strict';

import { ScannerInterface, ScannerStateType } from "./ScannerInterface";
import noble from "@abandonware/noble";
import { EventEmitter } from "events";
import { NobleDevice } from "./NobleDevice";

type nobleStateType = "unknown" | "resetting" | "unsupported" | "unauthorized" | "poweredOff" | "poweredOn";

export class NobleScanner extends EventEmitter implements ScannerInterface {
  uuids: string[];
  scannerState: ScannerStateType = "unknown";
  private nobleState: nobleStateType = "unknown";
  private devices: Set<string> = new Set();

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

  async startScan(): Promise<boolean> {
    if (this.scannerState == "unknown" || this.scannerState == "stopped") {
      this.scannerState = "starting";
      if (this.nobleState == "poweredOn") {
        return await this.startNobleScan();
      }
      return true;
    }
    return false;
  }

  async stopScan(): Promise<boolean> {
    if (this.scannerState == "scanning") {
      this.scannerState = "stopping";
      return await this.stopNobleScan();
    }
    return false;
  }

  private async startNobleScan(): Promise<boolean> {
    try {
      await noble.startScanningAsync(this.uuids, false);
      this.scannerState = "scanning";
      return true;
    } catch (error) {
      console.error(error);
      if (this.scannerState == "starting") {
        this.scannerState = "stopped";
      }
      return false;
    }
  }

  private async stopNobleScan(): Promise<boolean> {
    try {
      await noble.stopScanningAsync();
      this.scannerState = "stopped";
      return true;
    } catch (error) {
      console.error(error);
      if (this.scannerState == "stopping") {
        this.scannerState = "scanning";
      }
      return false;
    }
  }

  private onNobleStateChange(state: nobleStateType): void {
    this.nobleState = state;
    if (this.scannerState == "starting" && this.nobleState == "poweredOn") {
      this.startNobleScan();
    }
  }

  private async onNobleDiscover(peripheral: noble.Peripheral): Promise<void> {
    // if the device was already found, maybe advertisement has changed
    if (!this.devices.has(peripheral.id)) {
      this.devices.add(peripheral.id);
      // first time found, scan the services
      const nobleDevice = new NobleDevice(peripheral);
      // await nobleDevice.discoverServices();
      this.emit("discover", nobleDevice);
    }
  }

  private onNobleScanStart(): void {
    this.scannerState = "scanning";
  }

  private onNobleScanStop(): void {
    this.scannerState = "stopped";
  }
}

