import Sorter from "./sorter.js";

import sharp from "sharp";

export default class SorterByColor extends Sorter {
    async getBox(piece) {
        const buffer = Buffer.from(piece.images.transparent.buffer, piece.images.transparent.encoding);
        const stats = await sharp(buffer).stats();
        const red = stats.channels[0].mean;
        const green = stats.channels[1].mean;
        const blue = stats.channels[1].mean;

        if (red > green * 1.1) {
            return 0;
        }

        if (green > blue * 1.1) {
            return 1;
        }

        if (blue > red * 1.1) {
            return 2;
        }

        return 3;
    }
}
