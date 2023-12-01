import Frame from "./Frame.js";

export default class ErrorFrame extends Frame {
    parse(arr) {
        if (arr.compare(this.getFrame()) != 0) {
            throw new Error("Invalid Error Frame");
        }
    }

    getFrame() {
        return Buffer.from([0x00, 0x00, 0xFF, 0x01, 0xFF, 0x7F, 0x81, 0x00]);
    }
}