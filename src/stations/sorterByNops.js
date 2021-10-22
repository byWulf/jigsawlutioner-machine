import Sorter from "./sorter.js";
import ControllerRequest from "../controllerRequest.js";

export default class SorterByNops extends Sorter {
    async getBox(piece) {
        let straight = 0;
        let nops = 0;

        for (let i = 0; i < piece.sides.length; i++) {
            let side = piece.sides[i];

            if (side.direction === 'in') {
                nops++;
            }
            if (side.direction === 'straight') {
                straight++;
            }
        }

        if (straight > 0) {
            return 0;
        }

        if (nops === 0) {
            return 1;
        }

        if (nops === 4) {
            return 2;
        }

        return 3;
    }
}
