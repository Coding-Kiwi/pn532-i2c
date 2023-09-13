const i2c = require('i2c-bus');
const c = require('./constants.js');
const debug = require('debug');

class PN532 {
    constructor(address = c.I2C_ADDRESS, bus = 1) {
        this._address = address;
        this._bus = bus;

        this.low_power = true;
        this.debug = debug("pn532");
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

    poll() {
        if (!this._wire) throw new Error("not initialized");

        var scanTag = async () => {
            let tag = await this.scanTag();
            console.log(tag);

            setTimeout(() => scanTag(), 1000);
        };

        scanTag();
    }

    async getFirmwareVersion() {
        let data = await this.call(c.COMMAND_GET_FIRMWARE_VERSION, 4, [], 500);

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
        var maxNumberOfTargets = 0x01;
        var baudRate = c.CARD_ISO14443A;

        try {
            this.debug("Listening for targets passively");
            if (await this.sendCommand(c.COMMAND_IN_LIST_PASSIVE_TARGET, [maxNumberOfTargets, baudRate], 1000)) {
                let response = await this.processResponse(c.COMMAND_IN_LIST_PASSIVE_TARGET, 30, 1000);

                // If no response is available return null to indicate no card is present.
                if (!response) return null;
                // Check only 1 card with up to a 7 byte UID is present.
                if (response[0] != 0x01)
                    throw new Error("More than one card detected!")

                if (response[5] > 7)
                    throw new Error("Found card with unexpectedly long UID!")

                // Return UID of card.
                return response.slice(6, 6 + response[5]);
            }
        } catch (err) {
            console.error(err);
        }

        return false;
    }

    async sendCommand(command, params, timeout) {
        this.debug("Sending command %o", [command, ...params]);

        if (this.low_power) this.wakeup();

        // Build frame data with command and parameters.
        let data = Buffer.alloc(2 + params.length);
        data[0] = c.DIRECTION_HOST_TO_PN532;
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

        // Verify ACK response and wait to be ready for function response.
        let ret = await this.readData(c.ACK.length);
        if (ret.compare(new Buffer.from(c.ACK)) != 0) {
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
        if (!(response[0] == c.DIRECTION_PN532_TO_HOST && response[1] == (command + 1)))
            throw new Error("Received unexpected command response!")

        // Return response data.
        return response.slice(2);
    }

    call(command, response_length = 0, params = [], timeout = 1000) {
        if (!this.sendCommand(command, params, timeout)) {
            return null;
        }

        return this.processResponse(command, response_length, timeout)
    }

    delay_ms(milliseconds) {
        var start = new Date().getTime();
        for (var i = 0; i < 1e7; i++) {
            if (new Date().getTime() - start > milliseconds) {
                break;
            }
        }
    }

    waitForReady(timeout = 1000) {
        return new Promise((resolve, reject) => {
            // Poll PN532 if status byte is ready, up to "timeout" seconds
            let status = Buffer.alloc(1);
            let start = Date.now();

            const nextPoll = () => {
                this.debug("polling");

                this._wire.i2cRead(this._address, 1, status).then(data => {
                    this.debug(data);
                }).catch(e => {
                    this.debug(e);
                }).then(() => {
                    this.debug("polled, status is " + status[0])
                    // If we are no longer busy return
                    if (status[0] == 0x01) return resolve();

                    //if timeout reached, return
                    if ((Date.now() - start) >= timeout) return reject("Timed out");

                    setTimeout(nextPoll, 10);
                })
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

        return frame.slice(1);  // don't return the status byte
    }

    /**
     * set the SAM mode to normal = 1
     * timeout is 0 because it is only used in other modes
     * the last byte is for the IRQ pin
     */
    async wakeup() {
        this.debug("sending sam configuration for wakeup");
        this.low_power = false;
        await this.call(c.COMMAND_SAMCONFIGURATION, 0, [0x01, 0x14, 0x01]);
    }
}

(async function () {
    let asd = new PN532();
    await asd.init();
    asd.poll();
})();