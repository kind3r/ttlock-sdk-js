'use strict';

import { EventEmitter } from "events";

export declare interface DeviceInterface {
  id: string;
  uuid: string;
  name: string;
  address: string;
  addressType: string;
  connectable: boolean;
  rssi: number;
  mtu: number;
  manufacturerData: Buffer;
  services: Map<string, ServiceInterface>;
  connect(): Promise<boolean>;
  disconnect(): Promise<boolean>;
  discoverServices(): Promise<Map<string, ServiceInterface>>;
  readCharacteristics(): Promise<boolean>;
  toString(): string;
  toJSON(): string;
}

export declare interface ServiceInterface {
  uuid: string;
  name?: string;
  type?: string;
  includedServiceUuids: string[];
  characteristics: Map<string, CharacteristicInterface>;
  discoverCharacteristics(): Promise<Map<string, CharacteristicInterface>>;
  toString(): string;
}

export declare interface CharacteristicInterface extends EventEmitter {
  uuid: string;
  name?: string;
  type?: string;
  properties: string[];
  lastValue?: Buffer;
  descriptors: Map<string, DescriptorInterface>;
  discoverDescriptors(): Promise<Map<string, DescriptorInterface>>;
  read(): Promise<Buffer>;
  write(data: Buffer, notify: boolean): Promise<void>;
  notify(notify: boolean): Promise<void>;
  subscribe(): Promise<void>;
  toString(): string;
  
  on(event: "broadcast", listener: (state: string) => void): this;
  on(event: "notify", listener: (state: string) => void): this;
}

export declare interface DescriptorInterface {
  uuid: string;
  name?: string;
  type?: string;
  readValue(): Promise<Buffer>;
  writeValue(data: Buffer): Promise<void>;
  toString(): string;
}