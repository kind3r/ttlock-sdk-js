'use strict';

const { TTLockClient, sleep, PassageModeType } = require('../dist');
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
  }

  const client = new TTLockClient(options);
  await client.prepareBTService();
  client.startScanLock();
  console.log("Scan started");
  client.on("foundLock", async (lock) => {
    await lock.connect();
    console.log(lock.toJSON());
    console.log();

    if (lock.isInitialized() && lock.isPaired()) {
      console.log("Trying to set passage mode");
      console.log();
      console.log();
      const result = await lock.deletePassageMode({
        type: PassageModeType.WEEKLY,
        weekOrDay: 5,
        month: 0,
        startHour: "0000",
        endHour: "2359"
      });
      await lock.disconnect();

      process.exit(0);
    }
  });
}

doStuff();