import { CARD_ISO14443A, COMMAND_IN_LIST_PASSIVE_TARGET } from "../constants.js";
import ISO14443ATag from "../lib/ISO14443ATag.js";
import Command from "./Command.js";

export default class InListPassiveTargetCommand extends Command {
    constructor(max_targets, baud_rate, init_data = []) {
        super(COMMAND_IN_LIST_PASSIVE_TARGET, [max_targets, baud_rate, ...init_data]);

        this.baud_rate = baud_rate;
        this.max_targets = max_targets;
    }

    handleResponse(infoframe) {
        if (this.baud_rate === CARD_ISO14443A) {
            let target_count = infoframe.data[1];

            let tags = [];

            let tag = new ISO14443ATag();
            let bytes_read = tag.readFromBuffer(infoframe.data.subarray(2));
            tags.push(tag);

            if (target_count > 1 && infoframe.data.length > 3 + bytes_read) {
                let tag2 = new ISO14443ATag();
                tag2.readFromBuffer(infoframe.data.subarray(2 + bytes_read));
                tags.push(tag2);
            }

            return tags;
        }

        return false;
    }
}