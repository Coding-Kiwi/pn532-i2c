import Frame from "./Frame.js";

export default class NackFrame extends Frame {
    read(buff) {
        let expected = this.getFrame();
        if (!expected.compare(buff.subarray(expected.length))) throw new Error("Invalid NACK");
    }

    getFrame() {
        return Buffer.from([0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00]);
    }
}