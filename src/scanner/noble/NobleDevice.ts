'use strict';

import { DeviceInterface, ServiceInterface } from "../DeviceInterface";
import { Peripheral } from "@abandonware/noble";
import { EventEmitter } from "events";
import { NobleService } from "./NobleService";

export class NobleDevice extends EventEmitter implements DeviceInterface {
  id: string;
  uuid: string;
  name: string;
  address: string;
  addressType: string;
  connectable: boolean;
  connected: boolean = false;
  rssi: number;
  mtu: number = 20;
  manufacturerData: Buffer;
  services: Map<string, NobleService>;
  busy: boolean = false;
  private peripheral: Peripheral;

  constructor(peripheral: Peripheral) {
    super();
    this.peripheral = peripheral;
    this.id = peripheral.id;
    this.uuid = peripheral.uuid;
    this.name = peripheral.advertisement.localName;
    this.address = peripheral.address.replace(/\-/g, ':').toUpperCase();
    this.addressType = peripheral.addressType;
    this.connectable = peripheral.connectable;
    this.rssi = peripheral.rssi
    // this.mtu = peripheral.mtu;
    if (peripheral.advertisement.manufacturerData) {
      this.manufacturerData = peripheral.advertisement.manufacturerData;
    } else {
      this.manufacturerData = Buffer.from([]);
    }
    this.peripheral.on("disconnect", this.onDisconnect.bind(this));
    this.services = new Map();
  }

  updateFromPeripheral() {
    this.name = this.peripheral.advertisement.localName;
    this.address = this.peripheral.address.replace(/\-/g, ':').toUpperCase();
    this.addressType = this.peripheral.addressType;
    this.connectable = this.peripheral.connectable;
    this.rssi = this.peripheral.rssi
    // this.mtu = peripheral.mtu;
    if (this.peripheral.advertisement.manufacturerData) {
      this.manufacturerData = this.peripheral.advertisement.manufacturerData;
    } else {
      this.manufacturerData = Buffer.from([]);
    }
  }

  checkBusy(): boolean {
    if (this.busy) {
      throw new Error("NobleDevice is busy");
    } else {
      this.busy = true;
      return true;
    }
  }

  resetBusy(): boolean {
    if (this.busy) {
      this.busy = false;
    }
    return this.busy;
  }

  async connect(): Promise<boolean> {
    if (this.connectable && !this.connected) {
      await this.peripheral.connectAsync();
      this.connected = true;
      this.emit("connected");
      return true;
    }
    return false;
  }

  async disconnect(): Promise<boolean> {
    if (this.connectable && this.connected) {
      try {
        await this.peripheral.disconnectAsync();
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    }
    return false;
  }

  /**
   * Discover all services, characteristics and descriptors
   */
  async discoverAll(): Promise<Map<string, ServiceInterface>> {
    try {
      this.checkBusy();
      if (!this.connected) {
        this.resetBusy();
        throw new Error("NobleDevice not connected");
      }
      const snc = await this.peripheral.discoverAllServicesAndCharacteristicsAsync();
      this.resetBusy();
      this.services = new Map();
      snc.services.forEach((service) => {
        const s = new NobleService(this, service);
        this.services.set(s.uuid, s);
      });
      return this.services;
    } catch (error) {
      console.error(error);
      this.resetBusy();
      return new Map();
    }
  }

  /**
   * Discover services only
   */
  async discoverServices(): Promise<Map<string, ServiceInterface>> {
    try {
      this.checkBusy();
      if (!this.connected) {
        this.resetBusy();
        throw new Error("NobleDevice not connected");
      }
      const services = await this.peripheral.discoverServicesAsync();
      this.resetBusy();
      this.services = new Map();
      services.forEach((service) => {
        const s = new NobleService(this, service);
        this.services.set(s.uuid, s);
      });
      return this.services;
    } catch (error) {
      console.error(error);
      this.resetBusy();
      return new Map();
    }
  }

  /**
   * Read all available characteristics
   */
  async readCharacteristics(): Promise<boolean> {
    try {
      if (!this.connected) {
        throw new Error("NobleDevice not connected");
      }
      if (this.services.size == 0) {
        await this.discoverServices();
      }
      for (let [uuid, service] of this.services) {
        for (let [uuid, characteristic] of service.characteristics) {
          if (characteristic.properties.includes("read")) {
            console.log("Reading", uuid);
            const data = await characteristic.read();
            if (typeof data != "undefined") {
              console.log("Data", data.toString("ascii"));
            }
          }
        }
      }
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  onDisconnect() {
    this.connected = false;
    this.resetBusy();
    this.services = new Map();
    this.emit("disconnected");
  }

  toString(): string {
    let text = "";
    this.services.forEach((service) => {
      text += service.toString() + "\n";
    });
    return text;
  }

  toJSON(asObject: boolean = false): string | Object {
    let json: Record<string, any> = {
      id: this.id,
      uuid: this.uuid,
      name: this.name,
      address: this.address,
      addressType: this.addressType,
      connectable: this.connectable,
      rssi: this.rssi,
      mtu: this.mtu,
      services: {}
    };
    let services: Record<string, any> = {}
    this.services.forEach((service) => {
      json.services[service.uuid] = service.toJSON(true);
    });

    if (asObject) {
      return json;
    } else {
      return JSON.stringify(json);
    }
  }
}