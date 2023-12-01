import PN532 from "../index.js";

(async function () {
    let pn532 = new PN532();

    await pn532.init();

    pn532.poll();

    pn532.events.on("tag", async tag => {
        console.log("Tag detected: " + tag.getUidString());

        //stop polling, because there cannot be multiple writes at the same time
        pn532.stopPoll();

        // Start with block 4 (the first block of sector 1) since sector 0
        // contains the manufacturer data and it's probably better just
        // to leave it alone unless you know what you're doing
        console.log(await pn532.readMifareUltralight(tag, 4));
    });
})();