import { DIRECTION_HOST_TO_PN532 } from "../constants.js";
import Frame from "./Frame.js";

export default class InformationFrame extends Frame {
    constructor() {
        super();
        this.data = [];
    }

    read(buff) {
        if (buff[5] === 0x7F) throw new Error("Application Level Error");

        let length = buff[4];

        this.data = buff.subarray(6, 6 + length - 1);

        //TODO validate
        let data_checksum = buff[6 + length];
    }

    buildFrame() {
        if (this.data.length >= 255) throw new Error("too much data, use extended frame");

        let frame = Buffer.alloc(5);

        frame[0] = 0x00; //preamble
        frame[1] = 0x00; //start of packet
        frame[2] = 0xFF; //start of packet

        let length = this.data.length + 1;
        frame[3] = length & 0xFF; //length
        frame[4] = (~length + 1) & 0xFF; //length checksum

        let data = Buffer.from([DIRECTION_HOST_TO_PN532, ...this.data]);

        frame = Buffer.concat([frame, data]);

        let checksum = 0;
        for (let i = 0; i < length; i++) {
            checksum += data[i];
        }

        let tail = Buffer.alloc(2);
        tail[0] = ~checksum + 1;
        tail[1] = 0x00;

        frame = Buffer.concat([frame, tail]);

        return frame;
    }
}