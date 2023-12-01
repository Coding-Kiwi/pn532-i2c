// Typical PN532 address
export const I2C_ADDRESS = 0x24;

// Miscellaneous
export const COMMAND_DIAGNOSE = 0x00;
export const COMMAND_GET_FIRMWARE_VERSION = 0x02;
export const COMMAND_GET_GENERAL_STATUS = 0x04;
export const COMMAND_READ_REGISTER = 0x06;
export const COMMAND_WRITE_REGISTER = 0x08;
export const COMMAND_READ_GPIO = 0x0C;
export const COMMAND_WRITE_GPIO = 0x0E;
export const COMMAND_SET_SERIAL_BAUD_RATE = 0x10;
export const COMMAND_SET_PARAMETERS = 0x12;
export const COMMAND_SAMCONFIGURATION = 0x14;
export const COMMAND_POWER_DOWN = 0x16;

// RF Communicaions
export const COMMAND_RF_CONFIGUATION = 0x32;
export const COMMAND_RF_REGULATION_TEST = 0x58;

// Initiator
export const COMMAND_IN_JUMP_FOR_DEP = 0x56;
export const COMMAND_IN_JUMP_FOR_PSL = 0x46;
export const COMMAND_IN_LIST_PASSIVE_TARGET = 0x4A;
export const COMMAND_IN_ATR = 0x50;
export const COMMAND_IN_PSL = 0x4E;
export const COMMAND_IN_DATA_EXCHANGE = 0x40;
export const COMMAND_IN_COMMUNICATE_THRU = 0x42;
export const COMMAND_IN_DESELECT = 0x44;
export const COMMAND_IN_RELEASE = 0x52;
export const COMMAND_IN_SELECT = 0x54;
export const COMMAND_IN_AUTO_POLL = 0x60;

// Target
export const TG_INIT_AS_TARGET = 0x8C;
export const TG_SET_GENERAL_BYTES = 0x92;
export const TG_GET_DATA = 0x86;
export const TG_SET_DATA = 0x8E;
export const TG_SET_META_DATA = 0x94;
export const TG_GET_INITIATOR_COMMAND = 0x88;
export const TG_RESPONSE_TO_INITIATOR = 0x90;
export const TG_GET_TARGET_STATUS = 0x8A;

// Frame Identifiers (TFI)
export const DIRECTION_HOST_TO_PN532 = 0xD4;
export const DIRECTION_PN532_TO_HOST = 0xD5;

// Values for PN532's SAMCONFIGURATION function.
export const SAMCONFIGURATION_MODE_NORMAL = 0x01;
export const SAMCONFIGURATION_MODE_VIRTUAL_CARD = 0x02;
export const SAMCONFIGURATION_MODE_WIRED_CARD = 0x03;
export const SAMCONFIGURATION_MODE_DUAL_CARD = 0X04;
export const SAMCONFIGURATION_TIMEOUT_50MS = 0x01;
export const SAMCONFIGURATION_IRQ_OFF = 0x00;
export const SAMCONFIGURATION_IRQ_ON = 0x01;

// Values for the PN532's RFCONFIGURATION function.
export const RFCONFIGURATION_CFGITEM_MAXRETRIES = 0x05;

export const CARD_ISO14443A = 0x00; // 106 kbps type A (ISO/IEC14443 Type A)
export const CARD_FELICA212 = 0x01; // 212 kbps (FeliCa polling)
export const CARD_FELICA414 = 0x02; // 424 kbps (FeliCa polling)
export const CARD_ISO14443B = 0x03; // 106 kbps type B (ISO/IEC14443-3B)
export const CARD_JEWEL = 0x04; // 106 kbps Innovision Jewel tag

export const MIFARE_COMMAND_AUTH_A = 0x60;
export const MIFARE_COMMAND_AUTH_B = 0x61;
export const MIFARE_COMMAND_READ = 0x30;
export const MIFARE_COMMAND_WRITE_4 = 0xA2;
export const MIFARE_COMMAND_WRITE_16 = 0xA0;

export const TAG_MEM_NULL_TLV = 0x00;
export const TAG_MEM_LOCK_TLV = 0x01;
export const TAG_MEM_MEMCONTROL_TLV = 0x02;
export const TAG_MEM_NDEF_TLV = 0x03;
export const TAG_MEM_PROPRIETARY_TLV = 0xFD;
export const TAG_MEM_TERMINATOR_TLV = 0xFE;

export const ERRORS = {
    0x01: "Time Out, the target has not answered",
    0x02: "A CRC error has been detected by the contactless UART",
    0x03: "A Parity error has been detected by the contactless UART",
    0x04: "During a MIFARE anticollision/select operation, an erroneous Bit Count has been detected",
    0x05: "Framing error during MIFARE operation",
    0x06: "An abnormal bit-collision has been detected during bit wise anticollision at 106 kbps",
    0x07: "Communication buffer size insufficient",
    0x09: "RF Buffer overflow has been detected by the contactless UART (bit BufferOvfl of the register CL_ERROR)",
    0x0A: "In active communication mode, the RF field has not been switched on in time by the counterpart (as defined in NFCIP-1 standard)",
    0x0B: "RF Protocol error (cf. reference [4], description of the CL_ERROR register)",
    0x0D: "Temperature error: the internal temperature sensor has detected overheating, and therefore has automatically switched off the antenna drivers",
    0x0E: "Internal buffer overflow",
    0x10: "Invalid parameter (range, format, ...)",
    0x12: "DEP Protocol: The the PN532 configured in target mode does not support the command received from the initiator (the command received is not one of the following: ATR REQ, WUP_REQ, PSL_REQ, DEP_REQ, DSL_REQ, RLS REQ",
    0x13: "DEP Protocol / Mifare / ISO/IEC 14443-4: The data format does not match to the specification. Depending on the RF protocol used, it can be: Bad length of RF received frame, Incorrect value of PCB or PFB, Invalid or unexpected RF received frame, NAD or DID incoherence.",
    0x14: "Mifare: Authentication error",
    0x23: "ISO/IEC 14443-3: UID Check byte is wrong",
    0x25: "DEP Protocol: Invalid device State, the system is in a state which does not allow the operation",
    0x26: "Operation not allowed in this configuration (host controller interface)",
    0x27: "This command is not acceptable due to the current context of the the PN532 (Initiator vs. Target, unknown target number, Target not in the good State, ...)",
    0x29: "The the PN532 configured as target has been released by its initiator",
    0x2A: "The PN5321 and ISO/IEC 14443-38 only: the ID of the card does not match, meaning that the expected card has been exchanged With another one.",
    0x2B: "The PN5321 and ISO/IEC 14443-3B only: the card previously activated has disappeared.",
    0x2C: "Mismatch between the NFClD3 initiator and the NFClD3 target in DEP 212/424 kbps passive.",
    0x2D: "An over-current event has been detected",
    0x2E: "NAD missing in DEP frame",
}