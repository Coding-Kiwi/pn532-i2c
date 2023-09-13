class Tag {
    constructor(uid) {
        this.uid = uid;
    }

    getUidString() {
        return this.uid.toString("hex");
    }

    equals(tag) {
        return tag.getUidString() === this.getUidString();
    }
}

module.exports = Tag;