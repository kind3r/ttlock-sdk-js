'use strict';

import { Service } from "@abandonware/noble";
import { CharacteristicInterface, ServiceInterface } from "./DeviceInterface";
import { NobleCharacteristic } from "./NobleCharacteristic";
import { NobleDevice } from "./NobleDevice";

export class NobleService implements ServiceInterface {
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