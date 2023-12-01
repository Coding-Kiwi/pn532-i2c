import { ERRORS } from "../constants";

export default class Command {
    constructor(cmd, params = []) {
        this.cmd = cmd;
        this.params = params;
    }

    handleResponse(infoframe) {
        let status = infoframe.data[1];
        if (status !== 0x00) throw new Error(ERRORS[status]);

        return true;
    }
}