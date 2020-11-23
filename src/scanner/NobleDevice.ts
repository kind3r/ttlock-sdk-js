'use strict';

import { DeviceDatabase } from "../store/DeviceDatabase";
import { DeviceInterface, ServiceInterface, CharacteristicInterface, DescriptorInterface } from "./DeviceInterface";
import { Peripheral, Service, Characteristic, Descriptor } from "@abandonware/noble";
import noble from "@abandonware/noble";
import { EventEmitter } from "events";

export class NobleDevice implements DeviceInterface {
  id: string;
  uuid: string;
  name: string;
  address: string;
  addressType: string;
  connectable: boolean;
  rssi: number;
  manufacturerData: Buffer;
  services: Map<string, ServiceInterface>;
  private peripheral: Peripheral;

  constructor(peripheral: Peripheral) {
    this.peripheral = peripheral;
    this.id = peripheral.id;
    this.uuid = peripheral.uuid;
    this.name = peripheral.advertisement.localName;
    this.address = peripheral.address;
    this.addressType = peripheral.addressType;
    this.connectable = peripheral.connectable;
    this.rssi = peripheral.rssi
    if(peripheral.advertisement.manufacturerData) {
      this.manufacturerData = peripheral.advertisement.manufacturerData;
    } else {
      this.manufacturerData = Buffer.from([]);
    }
    // TODO check already discovered services
    this.services = new Map();
  }

  async discoverServices(): Promise<Map<string, ServiceInterface>> {
    try {
      await this.peripheral.connectAsync();
      const snc = await this.peripheral.discoverAllServicesAndCharacteristicsAsync();
      await this.peripheral.disconnectAsync();
      this.services = new Map();
      snc.services.forEach((service) => {
        const s = new NobleService(service);
        this.services.set(s.uuid, s);
      });
      return this.services;
    } catch (error) {
      console.error(error);
      return new Map();
    }
  }
}

class NobleService implements ServiceInterface {
  uuid: string;
  name: string;
  type: string;
  includedServiceUuids: string[];
  characteristics: Map<string, CharacteristicInterface> = new Map();
  private service: Service;

  constructor(service: Service) {
    this.service = service;
    this.uuid = service.uuid;
    this.name = service.name;
    this.type = service.type;
    this.includedServiceUuids = service.includedServiceUuids;
    // also add characteristics if they exist
    if (service.characteristics && service.characteristics.length > 0) {
      this.characteristics = new Map();
      service.characteristics.forEach((characteristic) => {
        const c = new NobleCharacteristic(characteristic);
        this.characteristics.set(c.uuid, c);
      });
    }
  }

  async discoverCharacteristics(): Promise<Map<string, CharacteristicInterface>> {
    try {
      const characteristics = await this.service.discoverCharacteristicsAsync();
      this.characteristics = new Map();
      characteristics.forEach((characteristic) => {
        const c = new NobleCharacteristic(characteristic);
        this.characteristics.set(c.uuid, c);
      });
      return this.characteristics;
    } catch (error) {
      console.error(error);
      return new Map();
    }
  }

}

class NobleCharacteristic extends EventEmitter implements CharacteristicInterface {
  uuid: string;
  name?: string | undefined;
  type?: string | undefined;
  properties: string[];
  descriptors?: Map<string, DescriptorInterface> | undefined;
  private characteristic: Characteristic;

  constructor(characteristic: Characteristic) {
    super();
    this.characteristic = characteristic;
    this.uuid = characteristic.uuid;
    this.name = characteristic.name;
    this.type = characteristic.type;
    this.properties = characteristic.properties;
  }

  discoverDescriptors(): Promise<Map<string, DescriptorInterface>> {
    throw new Error("Method not implemented.");
  }
  
  read(): Promise<Buffer> {
    throw new Error("Method not implemented.");
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
}

class NobleDescriptor implements DescriptorInterface {
  uuid: string;
  name?: string | undefined;
  type?: string | undefined;
  private descriptor: Descriptor;

  constructor(descriptor: Descriptor) {
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

}