class Tag {
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
    readISO14443A(buffer) {
        this.sens_res = (buffer[0] << 8) || buffer[1];
        this.sel_res = buffer[2];

        let id_length = buffer[3];
        this.uid = buffer.subarray(4, 4 + id_length);

        //since we are not using ISO/IEC14443-4 PCD mode there is not ATS data

        return 4 + id_length;
    }

    getUidString() {
        return this.uid.toString("hex");
    }

    equals(tag) {
        return tag.getUidString() === this.getUidString();
    }
}

module.exports = Tag;