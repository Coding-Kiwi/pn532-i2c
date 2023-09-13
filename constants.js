// Typical PN532 address
export const I2C_ADDRESS = 0x24;

export const ACK = [0x00, 0x00, 0xFF, 0x00, 0xFF, 0x00];

// Section 7 - Commands supported (page 65)
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

// Section 7.3.5 (page 115)
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