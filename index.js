import i2c from 'i2c-bus';
import debug from 'debug';
import EventEmitter from 'events';

import * as constants from './constants.js';

import Tag from './tag.js';

export default class PN532 {
    constructor(address = constants.I2C_ADDRESS, bus = 1) {
        this._address = address;
        this._bus = bus;

        this.low_power = true;
        this.debug = debug("pn532");

        this.poll_interval = null;
        this.poll_timeout = null;

        this.events = new EventEmitter();

        this.current_cards = new Map();
    }

    async init() {
        try {
            this._wire = await i2c.openPromisified(this._bus);
            this.debug("Connected to i2c bus " + this._bus);
        } catch (e) {
            this.debug(e);
            throw new Error('Failed to open i2c-' + this._bus + ' ');
        }
    }

    poll(interval = 1000) {
        if (!this._wire) throw new Error("not initialized");
        if (this.poll_timeout !== null) throw new Error("already polling");

        this.poll_interval = interval;
        this.poll_timeout = true;

        var scanTag = async () => {
            let start = Date.now();
            let tags = await this.scanTag();

            let current_uids = new Set();

            tags.forEach(tag => {
                let uid = tag.getUidString();
                current_uids.add(uid);

                if (this.current_cards.has(uid)) {
                    //update the num
                    this.current_cards.get(uid).num = tag.num;
                    return;
                }

                //seems to be a new one
                this.current_cards.set(uid, tag);
                this.events.emit("tag", tag);
            });

            this.current_cards.forEach(t => {
                if (!current_uids.has(t.getUidString())) {
                    //tag is no longer there
                    this.events.emit("vanish", t);
                    this.current_cards.delete(t.getUidString());
                }
            });

            //the scan can take between 0 and interval ms because it resolves instantly if a card is present
            let passed = Date.now() - start;
            let remaining = Math.max(0, interval - passed);

            //if polling has not been stopped
            if (this.poll_interval !== null) {
                this.poll_timeout = setTimeout(() => scanTag(), remaining);
            }
        };

        scanTag();
    }

    stopPoll() {
        if (this.poll_timeout !== null) {
            clearTimeout(this.poll_timeout);
        }

        this.poll_interval = null;
    }

    async getFirmwareVersion() {
        let data = await this.call(constants.COMMAND_GET_FIRMWARE_VERSION, 4, [], 500);

        return {
            ic_version: data[0],
            version: data[1],
            rev: data[2],
            support: {
                iso14443A: !!(data[3] & 0x1),
                iso14443B: !!(data[3] & 0x2),
                iso18092: !!(data[3] & 0x4)
            }
        }
    }

    async scanTag() {
        var maxNumberOfTargets = 0x02;
        var baudRate = constants.CARD_ISO14443A;

        let start = Date.now();

        try {
            if (this.current_cards.size) {
                this.debug("Releasing all targets");
                await this.sendCommand(constants.COMMAND_IN_RELEASE, [0x00], 500);
            }

            this.debug("Listening for targets passively");
            if (await this.sendCommand(constants.COMMAND_IN_LIST_PASSIVE_TARGET, [maxNumberOfTargets, baudRate], this.poll_interval)) {
                let timeout = this.poll_interval - (Date.now() - start);
                this.debug("Listen command sent, waiting " + timeout + "ms if there is something to read");

                let response = await this.processResponse(constants.COMMAND_IN_LIST_PASSIVE_TARGET, 30, timeout);

                // Check only 1 card with up to a 7 byte UID is present.
                if (response[0] > maxNumberOfTargets) throw new Error("Card count mismatch")

                let res = [];

                let tag = new Tag();
                let offset = tag.readISO14443A(response.subarray(1));
                if (tag.uid.length !== 4) throw new Error("Expected 4 byte uid");

                res.push(tag);

                if (maxNumberOfTargets > 1 && response.length > 2 + offset) {
                    let tag = new Tag();
                    tag.readISO14443A(response.subarray(1 + offset));
                    if (tag.uid.length !== 4) throw new Error("Expected 4 byte uid");
                    res.push(tag);
                }

                this.debug("Read tags %o", res);

                return res;
            }
        } catch (err) {
            if (err.message === "Timed out") {
                this.debug("Timed out, no card present");
                //timed out, this means there was no tag to read
                return [];
            }

            this.debug(err);
        }

        throw new Error("Failed to scan");
    }

    async sendCommand(command, params, timeout) {
        this.debug("Sending command %o", [command, ...params]);

        if (this.low_power) await this.wakeup();

        // Build frame data with command and parameters.
        let data = Buffer.alloc(2 + params.length);
        data[0] = constants.DIRECTION_HOST_TO_PN532;
        data[1] = command & 0xFF;

        for (let i = 0; i < params.length; i++) {
            data[2 + i] = params[i];
        }

        // Send frame and wait for response.
        try {
            await this.writeFrame(data);
        } catch (e) {
            this.debug(e);
            return false;
        }

        await this.waitForReady(timeout);

        this.debug("Reading ACK");

        // Verify ACK response and wait to be ready for function response.
        let ret = await this.readData(constants.ACK.length);
        if (ret.compare(new Buffer.from(constants.ACK)) != 0) {
            throw new Error("Did not receive expected ACK from PN532!");
        }

        return true;
    }

    async processResponse(command, response_length = 0, timeout = 1000) {
        /* Process the response from the PN532 and expect up to response_length
        bytes back in a response.  Note that less than the expected bytes might
        be returned! Will wait up to timeout seconds for a response and return
        a bytearray of response bytes, or None if no response is available
        within the timeout.
         */
        await this.waitForReady(timeout);

        // Read response bytes.
        let response = await this.readFrame(response_length + 2);

        // Check that response is for the called function.
        if (!(response[0] == constants.DIRECTION_PN532_TO_HOST && response[1] == (command + 1)))
            throw new Error("Received unexpected command response!")

        // Return response data.
        this.debug("Read %o", response);
        return response.subarray(2);
    }

    async call(command, response_length = 0, params = [], timeout = 1000) {
        if (!await this.sendCommand(command, params, timeout)) {
            return null;
        }

        return await this.processResponse(command, response_length, timeout)
    }

    delay_ms(milliseconds) {
        var start = new Date().getTime();
        for (var i = 0; i < 1e7; i++) {
            if (new Date().getTime() - start > milliseconds) {
                break;
            }
        }
    }

    /**
     * Poll PN532 if status byte is ready, up to "timeout" seconds
     * @param {Number} timeout 
     * @returns 
     */
    waitForReady(timeout = 1000) {
        return new Promise((resolve, reject) => {
            let status = Buffer.alloc(1);
            let start = Date.now();

            const nextPoll = () => {
                this._wire.i2cRead(this._address, 1, status).catch(e => {
                    //we do not care about errors here
                    this.debug(e);
                }).then(() => {
                    // If we are no longer busy return
                    if (status[0] == 0x01) return resolve();

                    //if timeout reached, return
                    if ((Date.now() - start) >= timeout) return reject(new Error("Timed out"));

                    setTimeout(nextPoll, 10);
                });
            }

            return nextPoll();
        });
    }

    async readFrame(length) {
        /* Read a response frame from the PN532 of at most length bytes in size.
                Returns the data inside the frame if found, otherwise raises an exception
                if there is an error parsing the frame.  Note that less than length bytes
                might be returned!
                 */
        // Read frame with expected length of data.
        let response = await this.readData(length + 7);

        // Swallow all the 0x00 values that preceed 0xFF.
        let offset = 0
        while (response[offset] == 0x00) {
            offset += 1;
            if (offset >= response.length)
                throw new Error("Response frame preamble does not contain 0x00FF!");
        }

        if (response[offset] != 0xFF)
            throw new Error("Response frame preamble does not contain 0x00FF!");
        offset += 1
        if (offset >= response.length)
            throw new Error("Response contains no data!");

        //Check length & length checksum match.
        let frame_len = response[offset];
        if ((frame_len + response[offset + 1]) & 0xFF != 0)
            throw new Error("Response length checksum did not match length!");

        // Check frame checksum value matches bytes.
        let checksum = 0;
        for (let i = 0; i < frame_len + 1; i++) {
            checksum += response[offset + 2 + i];
        }
        checksum = checksum & 0xFF;
        if (checksum != 0)
            throw new Error(
                "Response checksum did not match expected value: ", checksum
            )

        // Return frame data.
        return response.slice(offset + 2, offset + 2 + frame_len);
    }

    writeFrame(data) {
        /* Write a frame to the PN532 with the specified data bytearray. */
        if (data && data.length && data.length >= 255 || data.length <= 1) {
            throw new Error("Data must be array of 1 to 255 bytes.");
        }
        // Build frame to send as:
        // - Preamble (0x00)
        // - Start code  (0x00, 0xFF)
        // - Command length (1 byte)
        // - Command length checksum
        // - Command bytes
        // - Checksum
        // - Postamble (0x00)
        let frame = Buffer.alloc(5);
        frame[0] = 0x00;
        frame[1] = 0x00;
        frame[2] = 0xFF;
        let length = data.length;
        frame[3] = length & 0xFF;
        frame[4] = (~length + 1) & 0xFF;

        frame = Buffer.concat([frame, data]);

        let checksum = 0;
        for (let i = 0; i < length; i++) {
            checksum += data[i];
        }

        let tail = Buffer.alloc(2);
        tail[0] = ~checksum + 1;
        tail[1] = 0x00;

        frame = Buffer.concat([frame, tail]);

        // Send frame.
        this.debug("Writing to " + this._address + " %o", frame);
        return this._wire.i2cWrite(this._address, frame.length, frame);
    }

    async readData(count) {
        // Read a specified count of bytes from the PN532.
        // Build a read request frame.
        let frame = Buffer.alloc(count + 1);

        this.debug("Requesting read status");

        await this._wire.i2cRead(this._address, 1, frame);  // read status byte!

        if (frame[0] != 0x01) throw new Error('Not read to read');

        this.debug("Reading " + count + " from " + this._address);
        await this._wire.i2cRead(this._address, count + 1, frame);  // ok get the data, plus statusbyte

        return frame.subarray(1);  // don't return the status byte
    }

    /**
     * set the SAM mode to normal = 1
     * timeout is 0 because it is only used in other modes
     * the last byte is for the IRQ pin
     */
    async wakeup() {
        this.debug("sending sam configuration for wakeup");
        this.low_power = false;
        await this.call(constants.COMMAND_SAMCONFIGURATION, 0, [0x01, 0x14, 0x01]);
    }

    async powerdown() {
        this.debug("sending powerdown");
        //Enable wakeup on I2C, SPI, UART
        let resp = await this.call(constants.COMMAND_POWER_DOWN, 0, [0xB0, 0x00]);

        //if 0, success
        this.low_power = resp[0] === 0;
    }

    async readBlock(tag, blockAddress, authKey, authType = constants.MIFARE_COMMAND_AUTH_A) {
        //try to read mifare classic card

        await this.authenticateBlock(tag, blockAddress, authKey, authType);

        let resp = await this.call(constants.COMMAND_IN_DATA_EXCHANGE, 17, [
            tag.num, //number of the card
            constants.MIFARE_COMMAND_READ,
            blockAddress & 0xFF //block address,
        ]);

        if (resp[0] !== 0) throw new Error("Failed to read block " + blockAddress + " " + resp[0]);

        return resp.subarray(1);
    }

    async writeBlock(tag, blockAddress, data, authKey, authType = constants.MIFARE_COMMAND_AUTH_A) {
        if (!data || data.length != 16) {
            throw new Error("Data must be an array of 16 bytes!");
        }

        await this.authenticateBlock(tag, blockAddress, authKey, authType);

        let resp = await this.call(constants.COMMAND_IN_DATA_EXCHANGE, 1, [
            tag.num, //number of the card
            constants.MIFARE_COMMAND_WRITE_16,
            blockAddress & 0xFF, //block address
            ...data
        ]);

        if (resp[0] !== 0) throw new Error("Failed to write block " + blockAddress + " " + resp[0]);
    }

    async authenticateBlock(tag, blockAddress, authKey, authType = constants.MIFARE_COMMAND_AUTH_A) {
        //try to read mifare classic card

        //fallback to factory default KeyA
        if (!authKey) authKey = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff];

        let params = [
            tag.num, //number of the card
            authType & 0xFF, //Auth type A or B
            blockAddress & 0xFF, //block address,
            ...authKey,
            ...tag.uid
        ];

        let resp = await this.call(constants.COMMAND_IN_DATA_EXCHANGE, 1, params);

        if (resp[0] !== 0) throw new Error("Failed to authenticate block " + blockAddress + " " + resp[0])
    }
}