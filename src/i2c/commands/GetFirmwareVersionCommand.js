import { COMMAND_GET_FIRMWARE_VERSION } from "../constants.js";
import Command from "./Command.js";

export default class GetFirmwareVersionCommand extends Command {
    constructor() {
        super(COMMAND_GET_FIRMWARE_VERSION);
    }

    handleResponse(infoframe) {
        let data = infoframe.data.subarray(1);

        return {
            ic_version: data[0],
            version: data[1],
            rev: data[2],
            support: {
                iso14443A: !!(data[3] & 0x1),
                iso14443B: !!(data[3] & 0x2),
                iso18092: !!(data[3] & 0x4)
            }
        };
    }
}