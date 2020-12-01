'use strict';

const { TTLockClient } = require('./dist');

// const uuids = [];
const api = new TTLockClient({
  // uuids: uuids,
  // scannerType: "noble"
});

console.log("Starting scan...");
api.prepareBTService();
api.startScanLock();
api.on("foundLock", async (device) => {
  await device.connect();
  // don't disconnect so we receive subscriptions
  // await device.disconnect();
  console.log(device.toJSON());
  console.log();

  if (!device.initialized) {
    console.log("Trying to init the lock");
    await device.initLock();
    console.log();
    console.log();
    console.log(device.toJSON());
    console.log();
    console.log();
    process.exit(0);
  }
});
