import { COMMAND_IN_RELEASE, ERRORS } from "../constants.js";
import Command from "./Command.js";

export default class InReleaseCommand extends Command {
    constructor(targets) {
        super(COMMAND_IN_RELEASE, [targets]);
    }
}