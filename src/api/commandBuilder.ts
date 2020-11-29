'use strict';

import { Command, CommandInterface } from "./Command";
import * as commands from "./Commands";

export function commandBuilder(data: Buffer): Command {
  const commandType = data.readInt8(0);
  const classNames = Object.keys(commands);
  for (let i = 0; i < classNames.length; i++) {
    const commandClass: CommandInterface = Reflect.get(commands, classNames[i]);
    if (commandClass.COMMAND_TYPE == commandType) {
      return Reflect.construct(commandClass, [data]);
    }
  }

  return new commands.UnknownCommand(data);
}