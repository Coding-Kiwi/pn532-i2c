import { COMMAND_IN_DATA_EXCHANGE, ERRORS, MIFARE_COMMAND_AUTH_A } from "../constants.js";
import Command from "./Command.js";

export default class InDataExchangeCommand extends Command {
    constructor(tag, params = []) {
        super(COMMAND_IN_DATA_EXCHANGE, [tag.num, ...params]);
    }

    handleResponse(infoframe) {
        let status = infoframe.data[1];
        if (status !== 0x00) throw new Error(status + " " + ERRORS[status]);

        return infoframe.data.subarray(2, 18);
    }
}