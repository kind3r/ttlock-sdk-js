'use strict';

const { TTLockClient } = require('./dist');

// const uuids = [];//["0000fe95-0000-1000-8000-00805f9b34fb"];
const api = new TTLockClient({
  // uuids: uuids,
  // scannerType: "noble"
});


api.prepareBTService();
api.startScanLock();
api.on("foundDevice", async (device) => {
  // if(device.device.advertisement.manufacturerData) {
    console.log(device.name, device.mAddress, device.lockType);
    console.log(JSON.stringify(device.device.advertisement));
  // }
  // await device.device.discoverServicesAsync();
  // console.log(device.device.advertisement);
  // console.log(device.device.services);
  // console.log(characteristics);
});
