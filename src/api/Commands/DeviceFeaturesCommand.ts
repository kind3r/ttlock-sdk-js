'use strict';

import { CommandType } from "../../constant/CommandType";
import { FeatureValue } from "../../constant/FeatureValue";
import { padHexString } from "../../util/digitUtil";
import { Command } from "../Command";

export class DeviceFeaturesCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_SEARCHE_DEVICE_FEATURE;

  private batteryCapacity?: number;
  private special?: number;
  private featureList?: Set<FeatureValue>;

  protected processData(): void {
    if (this.commandData) {
      this.batteryCapacity = this.commandData.readInt8(0);
      this.special = this.commandData.readInt32BE(1);
      console.log(this.commandData);
      const features = this.commandData.readUInt32BE(1);
      this.featureList = this.processFeatures(features);
    }
  }

  protected readFeatures(data?: Buffer): string {
    if (data) {
      let features: string = "";
      let temp: string = "";
      for (let i = 0; i < data.length; i++) {
        temp += padHexString(data.readInt8(i).toString(16));
        if (i % 4 == 3) {
          features = temp + features;
          temp = "";
        }
      }
      let i = 0;
      while (i < features.length && features.charAt(i) == "0") {
        i++;
      }
      if (i == features.length) {
        return "0";
      }
      return features.substring(i).toUpperCase();
    } else {
      return "";
    }
  }

  protected processFeatures(features: number): Set<FeatureValue> {
    let featureList: Set<FeatureValue> = new Set();
    const featuresBinary = features.toString(2);
    Object.values(FeatureValue).forEach((feature) => {
      if (typeof feature != "string" && featuresBinary.length > (feature as number)) {
        if (featuresBinary.charAt(featuresBinary.length - (feature as number) - 1) == "1") {
          featureList.add(feature as FeatureValue);
        }
      }
    });
    return featureList;
  }

  getBatteryCapacity(): number {
    if (this.batteryCapacity) {
      return this.batteryCapacity;
    } else {
      return -1;
    }
  }

  getSpecial(): number {
    if (this.special) {
      return this.special;
    } else {
      return 0;
    }
  }

  getFeaturesList(): Set<FeatureValue> {
    if (this.featureList) {
      return this.featureList;
    } else {
      return new Set();
    }
  }

  build(): Buffer {
    return Buffer.from([]);
  }

}