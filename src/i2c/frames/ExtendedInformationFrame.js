import Frame from "./Frame.js";

/**
 * used for sending more data
 */
export default class ExtendedInformationFrame extends Frame {
    constructor() {
        this.data = [];
    }

    read(buff) {
        if (buff[5] === 0x7F) throw new Error("Application Level Error");

        let len_m = arr[4];
        let len_l = arr[5];
        let length = len_m * 256 + len_l;

        let len_checksum = arr[6];

        this.data = buff.subarray(8, 8 + length - 1);

        //TODO validate
        let data_checksum = buff[6 + length];
    }

    buildFrame() {
        let frame = Buffer.alloc(5);

        frame[0] = 0x00; //preamble
        frame[1] = 0x00; //start of packet
        frame[2] = 0xFF; //start of packet
        frame[3] = 0xFF; //fixed length
        frame[4] = 0xFF; //fixed length

        let length = this.data.length + 1;
        frame[5] = Math.floor(length / 255) & 0xFF; //length m
        frame[6] = length % 255; //length l
        frame[7] = (~(frame[5] + frame[6]) + 1) & 0xFF; //length checksum

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