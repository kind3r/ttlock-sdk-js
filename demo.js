'use strict';

const { TTLockClient } = require('./dist');

// const uuids = [];
const api = new TTLockClient({
  // uuids: uuids,
  // scannerType: "noble"
});


api.prepareBTService();
api.startScanLock();
api.on("foundDevice", async (device) => {
  // if(device.device.advertisement.manufacturerData) {
    // console.log(device.name, device.mAddress, device.lockType);
    // console.log(device.toJSON());
    await api.stopScanLock();
    await device.device.readCharacteristics();
    const services = device.device.services;
    console.log(device.device.toJSON());
    console.log();
    console.log(device.toJSON());
    console.log();
  // }
  // await device.device.discoverServicesAsync();
  // console.log(device.device.advertisement);
  // console.log(device.device.services);
  // console.log(characteristics);
});
