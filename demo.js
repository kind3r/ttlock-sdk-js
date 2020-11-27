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
  await device.connect();
  await device.disconnect()
  console.log(device.toJSON());
  console.log();
});
