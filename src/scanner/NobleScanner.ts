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
    if(this.scannerState != "scanning") {
      return;
    }
    console.log("Stopping scan");
    await this.stopScan();
    // noble.reset();
    var device = await this.createFromPeripheral(peripheral);
    console.log("Starting scan");
    await this.startScan();

    if (device != null) {
      this.emit("discover", device);
    }
  }

  private onNobleScanStart(): void {
    this.scannerState = "scanning";
  }

  private onNobleScanStop(): void {
    this.scannerState = "stopped";
  }

  private async createFromPeripheral(peripheral: noble.Peripheral): Promise<ExtendedBluetoothDevice | null> {
    const id = peripheral.id;
    const uuid = peripheral.uuid;
    const name = peripheral.advertisement.localName;
    const rssi = peripheral.rssi;
    let manufacturerData = Buffer.from([]);
    if (peripheral.advertisement.manufacturerData) {
      manufacturerData = peripheral.advertisement.manufacturerData;
    }
    try {
      const services = await this.discoverServices(peripheral);
      const device = new ExtendedBluetoothDevice(id, name, rssi, manufacturerData, peripheral);
      device.uuid = uuid;
      return device;
    } catch (error) {
      console.error(error.message);
    }

    return null;
  }

  private async discoverServices(peripheral: noble.Peripheral): Promise<noble.Service[] | null> {
    // WIP
    // in order to read services scan needs to be stopped
    try {
      console.log("State 1:", peripheral.state);
      console.log("Connecting");
      await peripheral.connectAsync();
      console.log("State 2:", peripheral.state);
      console.log("Discovering services");
      const services = await peripheral.discoverAllServicesAndCharacteristicsAsync();
      console.log("Disconnecting");
      await peripheral.disconnectAsync();
      // maybe read some of the important data
      // console.log(services);
      // services.services.forEach((service) => {
      //   console.log('uuid:', service.uuid, 'characteristics:');
      //   service.characteristics.forEach((characteristic) => {
      //     console.log('    ', characteristic.toString());
      //   });
      // });
      return services.services;
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}

