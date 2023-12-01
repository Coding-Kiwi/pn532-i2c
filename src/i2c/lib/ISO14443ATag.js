export default class ISO14443ATag {
    constructor() {
        this.uid = null;
    }

    /**
     * for ISO14443A 106 kbps the buffer is:
     * 0 target number
     * 1,2 sensed response, two bytes
     * 3 select response, might be the sak byte, dep picc?
     * 4 NFCIDLength
     * x NFCID bytes 
     * 4 + x + 1 ats length answer to select
     * y ats bytes
     * @param {Buffer} buffer 
     * @returns {Number} amount of read bytes
     */
    readFromBuffer(buffer) {
        this.num = buffer[0];
        this.sens_res = (buffer[1] << 8) || buffer[2];
        this.sel_res = buffer[3];

        let id_length = buffer[4];
        this.uid = buffer.subarray(5, 5 + id_length);

        //since we are not using ISO/IEC14443-4 PCD mode there is not ATS data

        return 5 + id_length;
    }

    getUidString() {
        return this.uid.toString("hex");
    }

    equals(tag) {
        return tag.getUidString() === this.getUidString();
    }
}