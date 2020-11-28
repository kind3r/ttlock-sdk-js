'use strict';

import { EventEmitter } from "events";

export declare interface DeviceInterface extends EventEmitter {
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
  busy: boolean;
  checkBusy(): boolean;
  resetBusy(): boolean;
  connect(): Promise<boolean>;
  disconnect(): Promise<boolean>;
  discoverServices(): Promise<Map<string, ServiceInterface>>;
  readCharacteristics(): Promise<boolean>;
  toJSON(asObject: boolean): string | Object;
  toString(): string;

  on(event: "connected", listener: () => void): this;
  on(event: "disconnected", listener: () => void): this;
}

export declare interface ServiceInterface {
  uuid: string;
  name?: string;
  type?: string;
  includedServiceUuids: string[];
  characteristics: Map<string, CharacteristicInterface>;
  discoverCharacteristics(): Promise<Map<string, CharacteristicInterface>>;
  readCharacteristics(): Promise<Map<string, CharacteristicInterface>>
  toJSON(asObject: boolean): string | Object;
  toString(): string;
}

export declare interface CharacteristicInterface extends EventEmitter {
  uuid: string;
  name?: string;
  type?: string;
  properties: string[];
  isReading: boolean;
  lastValue?: Buffer;
  descriptors: Map<string, DescriptorInterface>;
  discoverDescriptors(): Promise<Map<string, DescriptorInterface>>;
  read(): Promise<Buffer | undefined>;
  write(data: Buffer, withoutResponse: boolean): Promise<void>;
  subscribe(): Promise<void>;
  toJSON(asObject: boolean): string | Object;
  toString(): string;
  
  on(event: "dataRead", listener: (data: Buffer) => void): this;
}

export declare interface DescriptorInterface {
  uuid: string;
  name?: string;
  type?: string;
  lastValue?: Buffer;
  readValue(): Promise<Buffer | undefined>;
  writeValue(data: Buffer): Promise<void>;
  toJSON(asObject: boolean): string | Object;
  toString(): string;
}