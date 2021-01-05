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

  const client = new TTLockClient({
    lockData: lockData
  });
  await client.prepareBTService();
  client.startScanLock();
  console.log("Scan started");
  client.on("foundLock", async (lock) => {
    await lock.connect(true);
    console.log(lock.toJSON());
    console.log();

    if (lock.isInitialized() && lock.isPaired()) {
      console.log("Trying to add IC Card");
      console.log();
      console.log();
      lock.on("scanICStart", () => {
        console.log();
        console.log("Ready to scan an IC Card");
        console.log();
      });
      const result = await lock.addICCard('202001010000', '202212312359');
      console.log(result);
      await lock.disconnect();

      process.exit(0);
    }
  });
}

doStuff();