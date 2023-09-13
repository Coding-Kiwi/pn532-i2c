import PN532 from "../index.js";

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