# Setup on raspberry pi

## Preparation on the pi

- Enable the I2C interface on the pi using `raspi config`
- Install `apt install i2c-tools`

## Connecting

Configure the nfc module to use the I2C switches and connect the module to the GPIO pins on the pi

```
# NFC module pin -> Pi GPIO physical pin #
GND -> 6
VCC -> 4
SDA -> 3
SCL -> 5
```

Probe for I2C devices using `i2cdetect -y 1`. In my case a device with address `0x24` shows up, if this is different for you, you have to supply a different address via the options.

## Testing the module

Install some tools

`sudo apt install libnfc5 libnfc-bin libnfc-examples`

Try to scan for devices using `nfc-list -v` and `nfc-scan-device -v`
If there are problems let libnfc know the device of the address in `/etc/nfc/libnfc.conf`

```
device.name = "PN532 over I2C"
device.connstring = "pn532_i2c:/dev/i2c-1"
```

You can test scanning a nfc tag using `nfc-poll`