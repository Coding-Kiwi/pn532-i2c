import { COMMAND_POWER_DOWN } from "../constants.js";
import Command from "./Command.js";

export default class PowerDownCommand extends Command {
    /**
     * 
     * @param {*} wakeup_enable bitfield, [i2c, gpio, spi, hsu, rf level detector, rfu (must be 0), int1, int 0]
     * @param {*} generate_irq 
     */
    constructor(wakeup_enable = 0xB0, generate_irq = 0x00) {
        super(COMMAND_POWER_DOWN, [wakeup_enable, generate_irq]);
    }
}