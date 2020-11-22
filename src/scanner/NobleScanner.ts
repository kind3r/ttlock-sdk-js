'use strict';

import { ExtendedBluetoothDevice } from "./ExtendedBluetoothDevice";
import { ScannerInterface, ScannerStateType } from "./ScannerInterface";
import noble from "@abandonware/noble";
import events from "events";

type nobleStateType = "unknown" | "resetting" | "unsupported" | "unauthorized" | "poweredOff" | "poweredOn";

export class NobleScanner extends events.EventEmitter implements ScannerInterface {
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
      await noble.startScanningAsync(this.uuids, true);
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

  private onNobleDiscover(peripheral: noble.Peripheral): void {
    var device = this.createFromPeripheral(peripheral);
    if (device != null) {
      // console.info("noble discovered uuid:", peripheral.uuid, " rssi:", peripheral.rssi, " name:", peripheral.advertisement.localName);
      this.emit("discover", device);
    }
  }

  private onNobleScanStart(): void {
    this.scannerState = "scanning";
  }

  private onNobleScanStop(): void {
    this.scannerState = "stopped";
  }

  private createFromPeripheral(peripheral: noble.Peripheral): ExtendedBluetoothDevice | null {
    const id = peripheral.id;
    const uuid = peripheral.uuid;
    const name = peripheral.advertisement.localName;
    const rssi = peripheral.rssi;
    let manufacturerData = Buffer.from([]);
    if (peripheral.advertisement.manufacturerData) {
      manufacturerData = peripheral.advertisement.manufacturerData;
    }
    const device = new ExtendedBluetoothDevice(id, name, rssi, manufacturerData, peripheral);
    device.uuid = uuid;
    
    return device;
  }
}

