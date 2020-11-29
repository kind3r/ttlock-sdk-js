'use strict';

import { CommandType } from "../constant/CommandType";
import { Command, CommandInterface } from "./Command";
import * as commands from "./Commands";

function getCommandClass(commandType: CommandType): CommandInterface | void {
  const classNames = Object.keys(commands);
  for (let i = 0; i < classNames.length; i++) {
    const commandClass: CommandInterface = Reflect.get(commands, classNames[i]);
    if (commandClass.COMMAND_TYPE == commandType) {
      return commandClass;
    }
  }
}

export function commandFromData(data: Buffer): Command {
  const commandType: CommandType = data.readInt8(0);
  const commandClass = getCommandClass(commandType);
  if (commandClass) {
    return Reflect.construct(commandClass, [data]);
  } else {
    return new commands.UnknownCommand(data);
  }
}

export function commandFromType(commandType: CommandType): Command {
  const commandClass = getCommandClass(commandType);
  if (commandClass) {
    return Reflect.construct(commandClass, []);
  } else {
    return new commands.UnknownCommand();
  }
}