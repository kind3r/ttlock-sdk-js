'use strict';

import { EventEmitter } from "events";
import ReconnectingWebSocket from "reconnecting-websocket";
import WebSocket from "ws";
import CryptoJS from "crypto-js";
import chalk from "chalk";

type Peripheral = {
  uuid: string,
  address: string,
  advertisement?: any,
  rssi: number,
  connected: boolean,
  connecting: boolean,
  bufferedConnect: boolean
}

type WsAdvertisement = {
  localName: string,
  txPowerLevel: number,
  serviceUuids: string,
  manufacturerData?: string,
  serviceData?: string
}

type WsEvent = {
  type: string,
  challenge?: string,
  peripheralUuid: string,
  address: string,
  addressType: string,
  connectable: string,
  advertisement?: WsAdvertisement,
  rssi: number,
  serviceUuids: string,
  serviceUuid: string,
  includedServiceUuids: string,
  characteristics: string,
  characteristicUuid: string,
  isNotification: boolean,
  state: string,
  descriptors: string,
  descriptorUuid: string,
  handle: string,
  data?: string
}

export class NobleWebsocketBinding extends EventEmitter {
  private ws: ReconnectingWebSocket;
  private auth: boolean;
  private wasReady: boolean;
  private buffer: any[];
  private startScanCommand: any | null;
  private peripherals: Map<string, Peripheral>;
  private aesKey: CryptoJS.lib.WordArray;
  private credentials: string;

  constructor(address: string, port: number, key: string, user: string, pass: string) {
    super();

    this.aesKey = CryptoJS.enc.Hex.parse(key);
    this.credentials = user + ':' + pass;
    this.auth = false;
    this.wasReady = false;
    this.buffer = [];
    this.startScanCommand = null;
    this.peripherals = new Map();

    this.ws = new ReconnectingWebSocket(`ws://${address}:${port}/noble`, [], { WebSocket: WebSocket });

    this.on('message', this.onMessage.bind(this));

    this.ws.onopen = this.onOpen.bind(this);
    this.ws.onclose = this.onClose.bind(this);
    this.ws.onerror = this.onClose.bind(this);

    this.ws.onmessage = (event: any) => {
      try {
        if (process.env.WEBSOCKET_DEBUG == "1") {
          console.log("Received: " + chalk.green(event.data.toString()));
        }
        this.emit('message', JSON.parse(event.data.toString()));
      } catch (error) {
        console.error(error);
      }
    };
  }

  init() {

  }

  private onOpen() {
    console.log(chalk.green('Websocket connected'));
  }

  private onClose() {
    this.auth = false;
    console.log(chalk.red('Websocket disconnected'));
    // this.emit('stateChange', 'poweredOff');
    for(const [peripheralUuid, peripheral] of this.peripherals) {
      if (peripheral.connected) {
        peripheral.connected = false;
        console.log('Disconnect', peripheralUuid);
        this.emit('disconnect', peripheralUuid);
      }
      if (peripheral.connecting && !peripheral.bufferedConnect)  {
        // add re-connect to buffer
        peripheral.connecting = false;
        peripheral.bufferedConnect = true;
        this.connect(peripheralUuid);
      }
    }
  }

  private onMessage(event: WsEvent) {
    let {
      type,
      peripheralUuid,
      address,
      addressType,
      connectable,
      advertisement,
      rssi,
      serviceUuids,
      serviceUuid,
      includedServiceUuids,
      characteristics,
      characteristicUuid,
      isNotification,
      state,
      descriptors,
      descriptorUuid,
      handle
    } = event;
    const data = event.data ? Buffer.from(event.data, 'hex') : null;

    if (type === "auth") {
      // send authentication response
      if (typeof event.challenge != "undefined" && event.challenge.length == 32) {
        const challenge = CryptoJS.enc.Hex.parse(event.challenge);
        const response = CryptoJS.AES.encrypt(this.credentials, this.aesKey, {
          iv: challenge,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.ZeroPadding
        });

        this.sendCommand({
          action: "auth",
          response: response.toString(CryptoJS.format.Hex)
        });
      }
    } else if (type === 'stateChange') {
      if (state == "poweredOn" && !this.auth) {
        this.auth = true;
        if (this.buffer.length > 0) {
          if (process.env.WEBSOCKET_DEBUG == "1") {
            console.log("Sending buffered commands", this.buffer);
          }
          for (let command of this.buffer) {
            this.sendCommand(command);
          }
          this.buffer = [];
        }
      }
      if (!this.wasReady) {
        // only send state change once after the initial connection
        this.wasReady = true;
        this.emit('stateChange', state);
      }
    } else if (type === 'discover') {
      if (typeof advertisement != "undefined") {
        const advertisementObj = {
          localName: advertisement.localName,
          txPowerLevel: advertisement.txPowerLevel,
          serviceUuids: advertisement.serviceUuids,
          manufacturerData: (advertisement.manufacturerData ? Buffer.from(advertisement.manufacturerData, 'hex') : null),
          serviceData: (advertisement.serviceData ? Buffer.from(advertisement.serviceData, 'hex') : null)
        };

        let peripheral: Peripheral = {
          uuid: peripheralUuid,
          address: address,
          advertisement: advertisementObj,
          rssi: rssi,
          connected: false,
          connecting: false,
          bufferedConnect: false
        };
        this.peripherals.set(peripheralUuid, peripheral);

        this.emit('discover', peripheralUuid, address, addressType, connectable, advertisementObj, rssi);
      }
    } else if (type === 'connect') {
      const peripheral = this.peripherals.get(peripheralUuid);
      if (typeof peripheral != "undefined") {
        peripheral.connected = true;
        peripheral.connecting = false;
        peripheral.bufferedConnect = false;
      }
      this.emit('connect', peripheralUuid);
    } else if (type === 'disconnect') {
      const peripheral = this.peripherals.get(peripheralUuid);
      if (typeof peripheral != "undefined") {
        peripheral.connected = false;
        peripheral.connecting = false;
        peripheral.bufferedConnect = false;
      }
      this.emit('disconnect', peripheralUuid);
    } else if (type === 'rssiUpdate') {
      this.emit('rssiUpdate', peripheralUuid, rssi);
    } else if (type === 'servicesDiscover') {
      this.emit('servicesDiscover', peripheralUuid, serviceUuids);
    } else if (type === 'includedServicesDiscover') {
      this.emit('includedServicesDiscover', peripheralUuid, serviceUuid, includedServiceUuids);
    } else if (type === 'characteristicsDiscover') {
      this.emit('characteristicsDiscover', peripheralUuid, serviceUuid, characteristics);
    } else if (type === 'read') {
      this.emit('read', peripheralUuid, serviceUuid, characteristicUuid, data, isNotification);
    } else if (type === 'write') {
      this.emit('write', peripheralUuid, serviceUuid, characteristicUuid);
    } else if (type === 'broadcast') {
      this.emit('broadcast', peripheralUuid, serviceUuid, characteristicUuid, state);
    } else if (type === 'notify') {
      this.emit('notify', peripheralUuid, serviceUuid, characteristicUuid, state);
    } else if (type === 'descriptorsDiscover') {
      this.emit('descriptorsDiscover', peripheralUuid, serviceUuid, characteristicUuid, descriptors);
    } else if (type === 'valueRead') {
      this.emit('valueRead', peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid, data);
    } else if (type === 'valueWrite') {
      this.emit('valueWrite', peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid);
    } else if (type === 'handleRead') {
      this.emit('handleRead', peripheralUuid, handle, data);
    } else if (type === 'handleWrite') {
      this.emit('handleWrite', peripheralUuid, handle);
    } else if (type === 'handleNotify') {
      this.emit('handleNotify', peripheralUuid, handle, data);
    }
  }

  private sendCommand(command: any, errorCallback?: any) {
    if (!this.auth && command.action != "auth") {
      if (process.env.WEBSOCKET_DEBUG == "1") {
        console.log('Buffering command', command);
      }
      this.buffer.push(command);
    } else {
      const message = JSON.stringify(command);
      this.ws.send(message);
      if (process.env.WEBSOCKET_DEBUG == "1") {
        console.log("Sent:    " + chalk.cyan(message));
      }
    }
  }

  startScanning(serviceUuids: string[], allowDuplicates: boolean = true) {
    this.startScanCommand = {
      action: 'startScanning',
      serviceUuids: serviceUuids,
      allowDuplicates: allowDuplicates
    };
    this.sendCommand(this.startScanCommand);

    this.emit('scanStart');
  }

  stopScanning() {
    this.startScanCommand = null;

    this.sendCommand({
      action: 'stopScanning'
    });

    this.emit('scanStop');
  }

  connect(deviceUuid: string) {
    const peripheral = this.peripherals.get(deviceUuid);

    if (typeof peripheral != "undefined" && !peripheral.connected && !peripheral.connecting) {
      peripheral.connecting = true;
      this.sendCommand({
        action: 'connect',
        peripheralUuid: peripheral.uuid
      });
    }
  }

  disconnect(deviceUuid: string) {
    const peripheral = this.peripherals.get(deviceUuid);

    if (typeof peripheral != "undefined") {
      this.sendCommand({
        action: 'disconnect',
        peripheralUuid: peripheral.uuid
      });
    }
  }

  updateRssi(deviceUuid: string) {
    const peripheral = this.peripherals.get(deviceUuid);

    if (typeof peripheral != "undefined") {
      this.sendCommand({
        action: 'updateRssi',
        peripheralUuid: peripheral.uuid
      });
    }
  }

  discoverServices(deviceUuid: string, uuids: string[]) {
    const peripheral = this.peripherals.get(deviceUuid);

    if (typeof peripheral != "undefined") {
      this.sendCommand({
        action: 'discoverServices',
        peripheralUuid: peripheral.uuid,
        uuids: uuids
      });
    }
  }

  discoverIncludedServices(deviceUuid: string, serviceUuid: string, serviceUuids: string[]) {
    const peripheral = this.peripherals.get(deviceUuid);

    if (typeof peripheral != "undefined") {
      this.sendCommand({
        action: 'discoverIncludedServices',
        peripheralUuid: peripheral.uuid,
        serviceUuid: serviceUuid,
        serviceUuids: serviceUuids
      });
    }
  }

  discoverCharacteristics(deviceUuid: string, serviceUuid: string, characteristicUuids: string[]) {
    const peripheral = this.peripherals.get(deviceUuid);

    if (typeof peripheral != "undefined") {
      this.sendCommand({
        action: 'discoverCharacteristics',
        peripheralUuid: peripheral.uuid,
        serviceUuid: serviceUuid,
        characteristicUuids: characteristicUuids
      });
    }
  }

  read(deviceUuid: string, serviceUuid: string, characteristicUuid: string) {
    const peripheral = this.peripherals.get(deviceUuid);

    if (typeof peripheral != "undefined") {
      this.sendCommand({
        action: 'read',
        peripheralUuid: peripheral.uuid,
        serviceUuid: serviceUuid,
        characteristicUuid: characteristicUuid
      });
    }
  }

  write(deviceUuid: string, serviceUuid: string, characteristicUuid: string, data: Buffer, withoutResponse: boolean) {
    const peripheral = this.peripherals.get(deviceUuid);

    if (typeof peripheral != "undefined") {
      this.sendCommand({
        action: 'write',
        peripheralUuid: peripheral.uuid,
        serviceUuid: serviceUuid,
        characteristicUuid: characteristicUuid,
        data: data.toString('hex'),
        withoutResponse: withoutResponse
      });
    }
  }

  broadcast(deviceUuid: string, serviceUuid: string, characteristicUuid: string, broadcast: any) {
    const peripheral = this.peripherals.get(deviceUuid);

    if (typeof peripheral != "undefined") {
      this.sendCommand({
        action: 'broadcast',
        peripheralUuid: peripheral.uuid,
        serviceUuid: serviceUuid,
        characteristicUuid: characteristicUuid,
        broadcast: broadcast
      });
    }
  }

  notify(deviceUuid: string, serviceUuid: string, characteristicUuid: string, notify: any) {
    const peripheral = this.peripherals.get(deviceUuid);

    if (typeof peripheral != "undefined") {
      this.sendCommand({
        action: 'notify',
        peripheralUuid: peripheral.uuid,
        serviceUuid: serviceUuid,
        characteristicUuid: characteristicUuid,
        notify: notify
      });
    }
  }

  discoverDescriptors(deviceUuid: string, serviceUuid: string, characteristicUuid: string) {
    const peripheral = this.peripherals.get(deviceUuid);

    if (typeof peripheral != "undefined") {
      this.sendCommand({
        action: 'discoverDescriptors',
        peripheralUuid: peripheral.uuid,
        serviceUuid: serviceUuid,
        characteristicUuid: characteristicUuid,
      });
    }
  }

  readValue(deviceUuid: string, serviceUuid: string, characteristicUuid: string, descriptorUuid: string) {
    const peripheral = this.peripherals.get(deviceUuid);

    if (typeof peripheral != "undefined") {
      this.sendCommand({
        action: 'readValue',
        peripheralUuid: peripheral.uuid,
        serviceUuid: serviceUuid,
        characteristicUuid: characteristicUuid,
        descriptorUuid: descriptorUuid
      });
    }
  }

  writeValue(deviceUuid: string, serviceUuid: string, characteristicUuid: string, descriptorUuid: string, data: Buffer) {
    const peripheral = this.peripherals.get(deviceUuid);

    if (typeof peripheral != "undefined") {
      this.sendCommand({
        action: 'writeValue',
        peripheralUuid: peripheral.uuid,
        serviceUuid: serviceUuid,
        characteristicUuid: characteristicUuid,
        descriptorUuid: descriptorUuid,
        data: data.toString('hex')
      });
    }
  }

  readHandle(deviceUuid: string, handle: any) {
    const peripheral = this.peripherals.get(deviceUuid);

    if (typeof peripheral != "undefined") {
      this.sendCommand({
        action: 'readHandle',
        peripheralUuid: peripheral.uuid,
        handle: handle
      });
    }
  }

  writeHandle(deviceUuid: string, handle: any, data: Buffer, withoutResponse: boolean) {
    const peripheral = this.peripherals.get(deviceUuid);

    if (typeof peripheral != "undefined") {
      this.sendCommand({
        action: 'writeHandle',
        peripheralUuid: peripheral.uuid,
        handle: handle,
        data: data.toString('hex'),
        withoutResponse: withoutResponse
      });
    }
  }
}