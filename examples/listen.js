'use strict';

const { TTLockClient, sleep } = require('../dist');
const fs = require('fs/promises');
const settingsFile = "lockData.json";

async function doStuff() {
  let lockData;
  try {
    await fs.access(settingsFile);
    const lockDataTxt = (await fs.readFile(settingsFile)).toString();
    lockData = JSON.parse(lockDataTxt);
  } catch (error) {}

  let options = {
    lockData: lockData,
    scannerType: "noble",
    scannerOptions: {
      websocketHost: "127.0.0.1",
      websocketPort: 2846
    },
    // uuids: []
  };

  if (process.env.WEBSOCKET_ENABLE == "1") {
    options.scannerType = "noble-websocket";
    if (process.env.WEBSOCKET_HOST) {
      options.scannerOptions.websocketHost = process.env.WEBSOCKET_HOST;
    }
    if (process.env.WEBSOCKET_PORT) {
      options.scannerOptions.websocketPort = process.env.WEBSOCKET_PORT;
    }
    if (process.env.WEBSOCKET_KEY) {
      options.scannerOptions.websocketAesKey = process.env.WEBSOCKET_KEY;
    }
  }

  const client = new TTLockClient(options);
  await client.prepareBTService();
  client.startScanLock();
  console.log("Scan started");
  client.on("foundLock", async (lock) => {
    console.log(lock.toJSON());
    console.log();
    
    lock.on("locked", (l) => {
      console.log("Lock was locked");
    });

    lock.on("unlocked", (l) => {
      console.log("Lock was unlocked");
    })

    if (lock.isInitialized() && lock.isPaired()) {
      lock.on("disconnected", () => {
        // setTimeout(() => {
        //   lock.connect();
        // }, 3000);
        client.startScanLock();
      });
      await lock.connect();
      console.log("Connected to a known lock");
      console.log();
      console.log();
    }
  });
}

doStuff();