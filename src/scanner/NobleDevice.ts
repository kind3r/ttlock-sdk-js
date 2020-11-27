'use strict';

import { DeviceInterface, ServiceInterface, CharacteristicInterface, DescriptorInterface } from "./DeviceInterface";
import { Peripheral, Service, Characteristic, Descriptor } from "@abandonware/noble";
import { EventEmitter } from "events";

export class NobleDevice implements DeviceInterface {
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
    this.peripheral = peripheral;
    this.id = peripheral.id;
    this.uuid = peripheral.uuid;
    this.name = peripheral.advertisement.localName;
    this.address = peripheral.address.replace(/\-/g, ':');
    this.addressType = peripheral.addressType;
    this.connectable = peripheral.connectable;
    this.rssi = peripheral.rssi
    // this.mtu = peripheral.mtu;
    if (peripheral.advertisement.manufacturerData) {
      this.manufacturerData = peripheral.advertisement.manufacturerData;
    } else {
      this.manufacturerData = Buffer.from([]);
    }
    this.services = new Map();
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
      return true;
    }
    return false;
  }

  async disconnect(): Promise<boolean> {
    if (this.connectable && this.connected) {
      try {
        await this.peripheral.disconnectAsync();
        this.connected = false;
        this.services = new Map();
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
  async discoverServices(): Promise<Map<string, ServiceInterface>> {
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

class NobleService implements ServiceInterface {
  uuid: string;
  name: string;
  type: string;
  includedServiceUuids: string[];
  characteristics: Map<string, NobleCharacteristic> = new Map();
  private device: NobleDevice;
  private service: Service;

  constructor(device: NobleDevice, service: Service) {
    this.device = device;
    this.service = service;
    this.uuid = service.uuid;
    this.name = service.name;
    this.type = service.type;
    this.includedServiceUuids = service.includedServiceUuids;
    // also add characteristics if they exist
    if (service.characteristics && service.characteristics.length > 0) {
      this.characteristics = new Map();
      service.characteristics.forEach((characteristic) => {
        const c = new NobleCharacteristic(this.device, characteristic);
        this.characteristics.set(c.uuid, c);
      });
    }
  }

  async discoverCharacteristics(): Promise<Map<string, CharacteristicInterface>> {
    try {
      this.device.checkBusy();
      const characteristics = await this.service.discoverCharacteristicsAsync();
      this.device.resetBusy();
      this.characteristics = new Map();
      characteristics.forEach((characteristic) => {
        const c = new NobleCharacteristic(this.device, characteristic);
        this.characteristics.set(c.uuid, c);
      });
      return this.characteristics;
    } catch (error) {
      console.error(error);
      this.device.resetBusy();
      return new Map();
    }
  }

  async readCharacteristics(): Promise<Map<string, CharacteristicInterface>> {
    if (this.characteristics.size == 0) {
      await this.discoverCharacteristics();
    }

    for (let [uuid, characteristic] of this.characteristics) {
      await characteristic.read();
    }

    return this.characteristics;
  }

  toJSON(asObject: boolean): string | Object {
    let json: Record<string, any> = {
      uuid: this.uuid,
      name: this.name,
      type: this.type,
      characteristics: {}
    };
    this.characteristics.forEach((characteristic) => {
      json.characteristics[characteristic.uuid] = characteristic.toJSON(true);
    });

    if (asObject) {
      return json;
    } else {
      return JSON.stringify(json);
    }
  }

  toString(): string {
    return this.service.toString();
  }
}

class NobleCharacteristic extends EventEmitter implements CharacteristicInterface {
  uuid: string;
  name?: string | undefined;
  type?: string | undefined;
  properties: string[];
  lastValue?: Buffer;
  descriptors: Map<string, NobleDescriptor> = new Map();
  private device: NobleDevice;
  private characteristic: Characteristic;

  constructor(device: NobleDevice, characteristic: Characteristic) {
    super();
    this.device = device;
    this.characteristic = characteristic;
    this.uuid = characteristic.uuid;
    this.name = characteristic.name;
    this.type = characteristic.type;
    this.properties = characteristic.properties;
  }

  discoverDescriptors(): Promise<Map<string, DescriptorInterface>> {
    throw new Error("Method not implemented.");
  }

  async read(): Promise<Buffer | undefined> {
    this.device.checkBusy();
    if (!this.device.connected) {
      this.device.resetBusy();
      throw new Error("NobleDevice is not connected");
    }
    try {
      this.lastValue = await this.characteristic.readAsync();
    } catch (error) {
      console.error(error);
    }
    this.device.resetBusy();
    return this.lastValue;
  }

  write(data: Buffer, notify: boolean): Promise<void> {
    this.device.checkBusy();
    if (!this.device.connected) {
      this.device.resetBusy();
      throw new Error("NobleDevice is not connected");
    }

    this.device.resetBusy();
    throw new Error("Method not implemented.");
  }

  notify(notify: boolean): Promise<void> {
    throw new Error("Method not implemented.");
  }

  subscribe(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  toJSON(asObject: boolean): string | Object {
    let json: Record<string, any> = {
      uuid: this.uuid,
      name: this.name,
      type: this.type,
      properties: this.properties,
      value: this.lastValue?.toString(),
      descriptors: {}
    }
    this.descriptors.forEach((descriptor) => {
      json.descriptors[this.uuid] = this.toJSON(true);
    });

    if (asObject) {
      return json;
    } else {
      return JSON.stringify(json);
    }
  }

  toString(): string {
    return this.characteristic.toString();
  }
}

class NobleDescriptor implements DescriptorInterface {
  uuid: string;
  name?: string | undefined;
  type?: string | undefined;
  lastValue?: Buffer;
  private device: NobleDevice;
  private descriptor: Descriptor;

  constructor(device: NobleDevice, descriptor: Descriptor) {
    this.device = device;
    this.descriptor = descriptor;
    this.uuid = descriptor.uuid;
    this.name = descriptor.name;
    this.type = descriptor.type;
  }

  readValue(): Promise<Buffer> {
    this.device.checkBusy();
    if (!this.device.connected) {
      this.device.resetBusy();
      throw new Error("NobleDevice is not connected");
    }

    this.device.resetBusy();
    throw new Error("Method not implemented.");
  }

  writeValue(data: Buffer): Promise<void> {
    this.device.checkBusy();
    if (!this.device.connected) {
      this.device.resetBusy();
      throw new Error("NobleDevice is not connected");
    }

    this.device.resetBusy();
    throw new Error("Method not implemented.");
  }

  toJSON(asObject: boolean = false) {
    const json = {
      uuid: this.uuid,
      name: this.name,
      type: this.type
    }

    if (asObject) {
      return json;
    } else {
      return JSON.stringify(json);
    }
  }

  toString(): string {
    return this.descriptor.toString();
  }
}