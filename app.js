const i2c = require('i2c-bus');
const c = require('./constants.js');

class PN532 {
    constructor(address = c.I2C_ADDRESS, bus = 1) {
        this._address = address;
        this._bus = bus;

        this.low_power = true;
    }

    poll() {
        try {
            this._wire = i2c.openSync(this._bus);
        } catch (e) {
            throw new Error('i2c_bus i2c-%d not exist!', this._bus);
        }

        var scanTag = () => {
            let tag = this.scanTag();
            console.log(tag);

            setTimeout(() => scanTag(), 1000);
        };

        scanTag();
    }

    scanTag() {
        var maxNumberOfTargets = 0x01;
        var baudRate = c.CARD_ISO14443A;

        try {
            /* Send command to PN532 to begin listening for a Mifare card. This
       returns true if the command was received succesfully. Note, this does
       not also return the UID of a card! `get_passive_target` must be called
       to read the UID when a card is found. If just looking to see if a card
       is currently present use `read_passive_target` instead.
        */
            if (this.sendCommand(c.COMMAND_IN_LIST_PASSIVE_TARGET, [maxNumberOfTargets, baudRate], 500)) {
                /* Will wait up to timeout seconds and return null if no card is found,
                       otherwise a bytearray with the UID of the found card is returned.
                       `listen_for_passive_target` must have been called first in order to put
                       the PN532 into a listening mode.
               
                       It can be useful to use this when using the IRQ pin. Use the IRQ pin to
                       detect when a card is present and then call this function to read the
                       card's UID. This reduces the amount of time spend checking for a card.
                        */
                let response = this.processResponse(c.COMMAND_IN_LIST_PASSIVE_TARGET, 30, 500);

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

    sendCommand(command, params, timeout) {
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
            this.writeFrame(data);
        } catch (e) {
            return false;
        }

        if (!this.waitReady(timeout)) {
            return false;
        }

        // Verify ACK response and wait to be ready for function response.
        let ret = this.readData(c.ACK.length);
        if (ret.compare(new Buffer.from(c.ACK)) != 0) {
            throw new Error("Did not receive expected ACK from PN532!");
        }

        return true;
    }

    processResponse(command, response_length = 0, timeout = 1000) {
        /* Process the response from the PN532 and expect up to response_length
        bytes back in a response.  Note that less than the expected bytes might
        be returned! Will wait up to timeout seconds for a response and return
        a bytearray of response bytes, or None if no response is available
        within the timeout.
         */
        if (!this.waitReady(timeout)) return null;

        // Read response bytes.
        let response = this.readFrame(response_length + 2);

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

    waitReady(timeout = 1000) {
        // Poll PN532 if status byte is ready, up to `timeout` seconds"""
        let status = Buffer.alloc(1)
        let timestamp = new Date().getTime();
      
        while ((new Date().getTime() - timestamp) < timeout) {
            try {
                this._wire.i2cReadSync(this._address, 1, status);
            } catch (e) {
                continue;
            }
            if (status[0] == 0x01) {
                return true;  // No longer busy
            }
            this.delay_ms(10);  // lets ask again soon!
        }
        // Timed out!
        return false;
    }

    readFrame(length) {
        /* Read a response frame from the PN532 of at most length bytes in size.
                Returns the data inside the frame if found, otherwise raises an exception
                if there is an error parsing the frame.  Note that less than length bytes
                might be returned!
                 */
        // Read frame with expected length of data.
        let response = this.readData(length + 7);

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
        this._wire.i2cWriteSync(this._address, frame.length, frame);
    }

    readData(count) {
        // Read a specified count of bytes from the PN532.
        // Build a read request frame.
        let frame = Buffer.alloc(count + 1);
        this._wire.i2cReadSync(this._address, 1, frame);  // read status byte!
        if (frame[0] != 0x01)  // not ready
            throw new Error('busy !');

        this._wire.i2cReadSync(this._address, count + 1, frame);  // ok get the data, plus statusbyte

        return frame.slice(1);  // don't return the status byte
    }

    wakeup() {
        this.low_power = false;
        this.call(c.COMMAND_SAMCONFIGURATION, 0, [0x01, 0x14, 0x01]);
    }
}

let asd = new PN532();
asd.poll();