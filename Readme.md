# pn532-i2c

Module for working with the PN532 via I2C, for example on a Raspberry Pi.

[npm](https://www.npmjs.com/package/pn532-i2c)

## Limitations

* As the name suggests only i2c is currently supported
* Tag detection, reading and writing only works for mifare classic cards

## Installation

```
npm install pn532-i2c
```

## Features

Check out the examples folder!

### Polling for tags

The PN532 module supports detecting 2 tags at the same time

```js
import PN532 from "pn532-i2c";

(async function () {
    let pn532 = new PN532();

    await pn532.init();

    pn532.poll();

    pn532.events.on("tag", tag => {
        console.log("New tag detected: " + tag.getUidString());
    });

    pn532.events.on("vanish", tag => {
        console.log("Tag " + tag.getUidString() + " has vanished");
    });
})();
```

### Reading tag blocks

```js
await pn532.readBlock(tag, 4);
```

### Writing tag blocks

```js
await writeBlock(tag, 4, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
```

### More information

NXP Docs: https://www.nxp.com/docs/en/user-guide/141520.pdf  
pn532 node red: https://github.com/RAKWireless/node-red-nodes/tree/master/node-red-contrib-pn532-i2c  
pn532 using i2c bundle: https://github.com/techniq/node-pn532/blob/master/src/pn532_i2c.js  