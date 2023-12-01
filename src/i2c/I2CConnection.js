import i2c from 'i2c-bus';
import debug from 'debug';

import { I2C_ADDRESS, SAMCONFIGURATION_MODE_NORMAL } from './constants.js';

import InformationFrame from './frames/InformationFrame.js';
import AckFrame from './frames/AckFrame.js';
import NackFrame from './frames/NackFrame.js';

import SAMConfigurationCommand from './commands/SAMConfigurationCommand.js';

export default class I2CConnection {
    constructor(options = {}) {
        this.options = Object.assign({
            address: I2C_ADDRESS,
            bus: 1
        }, options);

        this.low_power = true;
        this.debug = debug("pn532:con");
    }

    /**
     * command frame from host to pn532
     * then ack frame back and response frame
     * 
     * in non handshake mode use poll frequency lower than 100hz
     */

    async init() {
        try {
            this._wire = await i2c.openPromisified(this.options.bus);
            this.debug("Connected to i2c bus " + this.options.bus);
        } catch (e) {
            this.debug(e);
            throw new Error('Failed to open i2c-' + this.options.bus + ' ');
        }
    }

    /**
     * set the SAM mode to normal = 1
     * timeout is 0 because it is only used in other modes
     * the last byte is for the IRQ pin
     */
    async wakeup() {
        this.debug("Sending sam configuration for wakeup");
        this.low_power = false;

        let sam = await this.sendCommand(new SAMConfigurationCommand(
            SAMCONFIGURATION_MODE_NORMAL,
            0x14, //why timeout when in normal
            0x01 //why irq pin
        ));

        if (!sam) throw Error("SAMConfigurationCommand failed");
    }

    /**
     * When the host controller wants to read data from the PN532,
     * it has to read first the status byte and as long as the RDY bit is not equal to 1, it has to retry
     */

    /**
     * Poll PN532 if status byte is ready, up to "timeout" ms
     * @param {Number} timeout 
     * @returns 
     */
    waitForReady(timeout = 1000) {
        this.debug("Waiting for ready byte");

        return new Promise((resolve, reject) => {
            let status = Buffer.alloc(1);
            let start = Date.now();

            const nextPoll = () => {
                this._wire.i2cRead(this.options.address, 1, status).catch(e => {
                    //we do not care about errors here
                    this.debug(e);
                }).then(() => {
                    // If we are no longer busy return
                    if (status[0] == 0x01) return resolve();

                    //if timeout reached, return
                    if ((Date.now() - start) >= timeout) return reject(new Error("Timed out"));

                    setTimeout(nextPoll, 10); //max 100hz = 10ms
                });
            }

            return nextPoll();
        });
    }

    async readFrame(timeout = 1000) {
        this.debug("Reading frame");

        await this.waitForReady(timeout);

        let read_size = 255;
        this.debug("Reading up to %d bytes", read_size);

        let buff = Buffer.alloc(read_size);
        await this._wire.i2cRead(this.options.address, read_size, buff);

        this.debug("Read %o", buff);

        if (buff[0] !== 0x01) throw new Error('Not read to read');

        buff = buff.subarray(1);

        if (buff[0] !== 0x00) throw new Error("Invalid preamble");
        if (buff[1] !== 0x00) throw new Error("Invalid byte 1 (start of packet)");
        if (buff[2] !== 0xFF) throw new Error("Invalid byte 2 (start of packet)");

        if (buff[3] === 0x00 && buff[4] === 0xFF) {
            this.debug("Got ACK");
            let frame = new AckFrame();
            frame.read(buff);
            return frame;
        }

        if (buff[3] === 0xFF && buff[4] === 0x00) {
            this.debug("Got NACK");
            let frame = new NackFrame();
            frame.read(buff);
            return frame;
        }

        this.debug("Got INFO");

        let frame = new InformationFrame();
        frame.read(buff);
        return frame;
    }


    // ==== commands ===

    async sendCommand(command, timeout = 1000) {
        if (this.low_power) await this.wakeup();

        this.debug("Sending command %o with params %o", Buffer.from([command.cmd]), Buffer.from(command.params));

        let frame = new InformationFrame();
        frame.data = [command.cmd & 0xFF, ...command.params];
        let framebuffer = frame.buildFrame();

        this.debug("Frame is %o", framebuffer);

        //send the frame

        try {
            await this._wire.i2cWrite(this.options.address, framebuffer.length, framebuffer);
        } catch (e) {
            this.debug(e);
            return false;
        }

        this.debug("Sent, waiting for response");

        let ack_frame = await this.readFrame(timeout);

        if (!(ack_frame instanceof AckFrame)) {
            this.debug("Did not receive ack %o", ack_frame);
            return false;
        }

        let response_frame = await this.readFrame(timeout);

        if (!(response_frame instanceof InformationFrame)) {
            this.debug("Did not receive ackinfo %o", response_frame);
            return false;
        }

        if (response_frame.data[0] !== command.cmd + 1) throw new Error("Invalid info package");

        return command.handleResponse(response_frame);
    }
}