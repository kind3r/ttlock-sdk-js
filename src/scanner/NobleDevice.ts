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
    // TODO check already discovered services
    this.services = new Map();
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
      await this.connect();
      const snc = await this.peripheral.discoverAllServicesAndCharacteristicsAsync();
      await this.disconnect();
      this.services = new Map();
      snc.services.forEach((service) => {
        const s = new NobleService(this, service);
        this.services.set(s.uuid, s);
      });
      return this.services;
    } catch (error) {
      console.error(error);
      return new Map();
    }
  }

  /**
   * Read all available characteristics
   */
  async readCharacteristics(): Promise<boolean> {
    try {
      await this.connect();
      for (let [uuid, service] of this.services) {
        for (let [uuid, characteristic] of service.characteristics) {
          if (characteristic.properties.includes("read")) {
            console.log("Reading", uuid);
            const data = await characteristic.read();
            console.log("Data", data.toString("ascii"));
          }
        }
      }
      await this.disconnect();
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

  toJSON(): string {
    let json: Record<string,any> = {
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
    let services: Record<string,any> = {}
    this.services.forEach((service) => {
      json.services[service.uuid] = {
        uuid: service.uuid,
        name: service.name,
        type: service.type,
        characteristics: {}
      };
      service.characteristics.forEach((characteristic) => {
        json.services[service.uuid].characteristics[characteristic.uuid] = {
          uuid: characteristic.uuid,
          name: characteristic.name,
          type: characteristic.type,
          properties: characteristic.properties,
          value: characteristic.lastValue?.toString("ascii"),
          descriptors: {}
        }
        characteristic.descriptors.forEach((descriptor) => {
          json.services[service.uuid].characteristics[characteristic.uuid].descriptors[descriptor.uuid] = {
            uuid: descriptor.uuid,
            name: descriptor.name,
            type: descriptor.type
          }
        })
      });
    });

    return JSON.stringify(json, null, 2);
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
      const characteristics = await this.service.discoverCharacteristicsAsync();
      this.characteristics = new Map();
      characteristics.forEach((characteristic) => {
        const c = new NobleCharacteristic(this.device, characteristic);
        this.characteristics.set(c.uuid, c);
      });
      return this.characteristics;
    } catch (error) {
      console.error(error);
      return new Map();
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
    this.characteristic.on("read", (data, isNotification) => {
      console.log("Read", this.uuid, data.toString('hex'), data.toString('ascii'));
    });
  }

  discoverDescriptors(): Promise<Map<string, DescriptorInterface>> {
    throw new Error("Method not implemented.");
  }

  async read(): Promise<Buffer> {
    let wasConnected = false;
    if (!this.device.connected) {
      await this.device.connect();
    } else {
      wasConnected = true;
    }
    console.log("Reading ", this.characteristic.toString());
    this.lastValue = await this.characteristic.readAsync();
    if (!wasConnected) {
      await this.device.disconnect();
    }
    return this.lastValue;
  }

  write(data: Buffer, notify: boolean): Promise<void> {
    throw new Error("Method not implemented.");
  }

  notify(notify: boolean): Promise<void> {
    throw new Error("Method not implemented.");
  }

  subscribe(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  toString(): string {
    return this.characteristic.toString();
  }
}

class NobleDescriptor implements DescriptorInterface {
  uuid: string;
  name?: string | undefined;
  type?: string | undefined;
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
    throw new Error("Method not implemented.");
  }

  writeValue(data: Buffer): Promise<void> {
    throw new Error("Method not implemented.");
  }

  toString(): string {
    return this.descriptor.toString();
  }
}