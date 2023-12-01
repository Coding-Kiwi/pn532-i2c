import Frame from "./Frame.js";

/**
 * used for sending more data
 */
export default class ExtendedInformationFrame extends Frame {
    constructor() {
        this.data = [];
    }

    parse(arr) {
        if (arr[0] !== 0x00) throw new Error("Invalid preamble");
        if (arr[1] !== 0x00 || arr[1] !== 0xff) throw new Error("Invalid start of packet code");
        if (arr[2] !== 0xFF || arr[3] !== 0xFF) throw new Error("Invalid fixed packet length");
        if (arr[arr.length - 1] !== 0x00) throw new Error("Invalid postamble");

        let len_m = arr[4];
        let len_l = arr[5];
        let length = len_m * 256 + len_l;

        let len_checksum = arr[6];
        let id = arr[7]; //d4 for out, d5 for in

        this.data = arr.slice(8, 8 + length);
        let data_checksum = arr[8 + length];
    }

    getFrame() {
        let frame = Buffer.alloc(5);

        frame[0] = 0x00; //preamble
        frame[1] = 0x00; //start of packet
        frame[2] = 0xFF; //start of packet
        frame[3] = 0xFF; //fixed length
        frame[4] = 0xFF; //fixed length

        let length = this.data.length;
        frame[5] = Math.floor(length / 255) & 0xFF; //length m
        frame[6] = length % 255; //length l
        frame[7] = (~(frame[5] + frame[6]) + 1) & 0xFF; //length checksum

        frame = Buffer.concat([frame, this.data]);

        let checksum = 0;
        for (let i = 0; i < length; i++) {
            checksum += this.data[i];
        }

        let tail = Buffer.alloc(2);
        tail[0] = ~checksum + 1;
        tail[1] = 0x00;

        frame = Buffer.concat([frame, tail]);

        return frame;
    }
}