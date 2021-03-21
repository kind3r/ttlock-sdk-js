'use strict';
const fs = require('fs/promises');

module.exports = async (settingsFile, lockData) => {
  try {
    let lockDataTxt = JSON.stringify(lockData);
    // console.log();
    // console.log(lockDataTxt);
    // console.log();
    await fs.writeFile(settingsFile, lockDataTxt);
  } catch (error) {
    console.error("Error saving lock data file", error);
    return false;
  }
  return true;
}