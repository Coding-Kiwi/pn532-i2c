import { COMMAND_SAMCONFIGURATION } from "../constants.js";
import Command from "./Command.js";

export default class SAMConfigurationCommand extends Command {
    constructor(mode, timeout, irq) {
        super(COMMAND_SAMCONFIGURATION, [mode, timeout, irq]);
    }

    handleResponse(infoframe) {
        return true;
    }
}