import { MIFARE_COMMAND_AUTH_A } from "../constants.js";
import InDataExchangeCommand from "./InDataExchangeCommand.js";

export default class MifareAuthenticateCommand extends InDataExchangeCommand {
    constructor(tag, block_address, auth_key = null, auth_type = MIFARE_COMMAND_AUTH_A) {
        //fallback to factory default KeyA
        if (!auth_key) auth_key = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff];

        super(tag, [
            auth_type & 0xFF, //Auth type A or B
            block_address & 0xFF, //block address,
            ...auth_key,
            ...tag.uid
        ]);
    }
}