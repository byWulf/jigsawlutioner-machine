import './controllerConfig.js';
import prompts from "prompts";
import ControllerRequest from "./src/controllerRequest.js";
import fs from 'fs';

(async () => {
    await (new ControllerRequest('pi8', '/reset', {additionalForward: 105})
        .addMotor('motor', 'D')
        .addSensor('sensor', 4)).call();

    let count = 0;
    while (true) {

        let conf = await prompts({
            type: 'confirm',
            name: 'value',
            message: 'Next?',
            initial: true
        });
        if (!conf.value) {
            break;
        }

        await (new ControllerRequest('pi8', '/move-to-next-plate')
            .addMotor('motor', 'D')).call();

        let response = await (new ControllerRequest('pi2', '/take-photo', {
            left: 0.24,
            right: 0.70,
            top: 0.16,
            bottom: 0.81,
            width: 1000,
            'light[pin]': 4,
            'light[position]': 'top'
        }, {
            responseType: 'buffer'
        })).call();

        const imageBuffer = response.body;

        count++;
        fs.writeFileSync('images/piece' + count + '_color.jpg', imageBuffer);

        let response2 = await (new ControllerRequest('pi2', '/take-photo', {
            left: 0.24,
            right: 0.70,
            top: 0.16,
            bottom: 0.81,
            width: 1000,
            'light[pin]': 4,
            'light[position]': 'bottom',
            'light[positionAfter]': 'top'
        }, {
            responseType: 'buffer'
        })).call();

        const imageBuffer2 = response2.body;

        fs.writeFileSync('images/piece' + count + '.jpg', imageBuffer2);
    }
})();
