'use strict';
const fs = require('fs/promises');

module.exports = async (settingsFile) => {
  let lockData = [];
  try {
    await fs.access(settingsFile);
    const lockDataTxt = (await fs.readFile(settingsFile)).toString();
    lockData = JSON.parse(lockDataTxt);
  } catch (error) {
    console.error(error);
  }
  return lockData;
}