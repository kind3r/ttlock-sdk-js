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
      websocketPort: 0xB1e
    },
    // uuids: []
  };

  if (process.env.WEBSOCKET_ENABLE == 1) {
    options.scannerType = "noble-websocket";
  }

  const client = new TTLockClient(options);
  await client.prepareBTService();
  client.startScanLock();
  console.log("Scan started");
  client.on("foundLock", async (lock) => {
    await lock.connect(true);
    console.log(lock.toJSON());
    console.log();

    if (lock.isInitialized() && lock.isPaired()) {
      console.log("Trying to add passcode");
      console.log();
      console.log();
      const result = await lock.addPassCode(1, '123456', '202001010000', '202212312359');
      await lock.disconnect();

      process.exit(0);
    }
  });
}

doStuff();