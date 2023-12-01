import { COMMAND_IN_RELEASE, ERRORS } from "../constants.js";
import Command from "./Command.js";

export default class InReleaseCommand extends Command {
    constructor(targets) {
        super(COMMAND_IN_RELEASE, [targets]);
    }

    handleResponse(infoframe) {
        let status = infoframe.data[1];
        if (status !== 0x00) throw new Error(ERRORS[status]);

        return true;
    }
}