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
      console.log("Trying to reset the lock");
      console.log();
      console.log();
      const reset = await lock.resetLock();
      await lock.disconnect();
      const newLockData = client.getLockData();
      console.log(JSON.stringify(newLockData));
      try {
        await fs.writeFile(settingsFile, Buffer.from(JSON.stringify(newLockData)));
      } catch (error) {
        process.exit(1);
      }

      process.exit(0);
    }
  });
}

doStuff();