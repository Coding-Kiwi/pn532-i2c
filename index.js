import debug from 'debug';
import EventEmitter from 'events';

import I2CConnection from "./src/i2c/I2CConnection.js";
import { CARD_ISO14443A } from "./src/i2c/constants.js";
import InReleaseCommand from './src/i2c/commands/InReleaseCommand.js';
import InListPassiveTargetCommand from './src/i2c/commands/InListPassiveTargetCommand.js';

export default class PN532 {
    constructor(options = {}) {
        this.options = Object.assign({
            i2c: {},
            max_targets: 1,
            baud_rate: CARD_ISO14443A
        }, options);

        this.connection = new I2CConnection(this.options.i2c);

        this.events = new EventEmitter();

        this.poll_interval = null;
        this.poll_timeout = null;

        this.current_cards = new Map();

        this.debug = debug("pn532:main");
    }

    async init() {
        await this.connection.init();
    }

    async poll(interval = 1000) {
        if (!this.connection._wire) throw new Error("not initialized");
        if (this.poll_timeout !== null) throw new Error("already polling");

        this.poll_interval = interval;
        this.poll_timeout = true;

        var scanTag = async () => {
            let start = Date.now();

            try {
                let tags = await this.scanTag(interval);

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
            } catch (error) {
                this.debug("Failed scanning in poll %o", error);
            }

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
            this.poll_timeout = null;
        }

        this.poll_interval = null;
    }

    async scanTag(timeout) {
        let start = Date.now();

        let in_release = await this.connection.sendCommand(new InReleaseCommand(0x00), 500);
        if (!in_release) throw new Error("Failed to release previous targets");

        timeout -= (Date.now() - start);

        this.debug("Waiting %d ms for a tag", timeout);

        try {
            let tags = await this.connection.sendCommand(new InListPassiveTargetCommand(
                this.options.max_targets,
                this.options.baud_rate
            ), timeout);

            if (tags === false) throw new Error("sending list passive command failed");

            return tags;
        } catch (err) {
            if (err.message === "Timed out") {
                this.debug("Timed out, no card present");
                //timed out, this means there was no tag to read
                //but it can also happen that there are 2 cards and reading took too long
                return [];
            }

            this.debug(err);
        }

        return [];
    }
}