import './controllerConfig.js';
import prompts from "prompts";
import ControllerRequest from "./src/controllerRequest.js";
import fs from 'fs';

(async () => {
    await (new ControllerRequest('pi8', '/reset', {additionalForward: 105})
        .addMotor('motor', 'D')
        .addSensor('sensor', 4)).call();

    let conf = await prompts({
        type: 'confirm',
        name: 'value',
        message: 'Next?',
        initial: true
    });

    let count = 0;
    while (true) {

        await (new ControllerRequest('pi8', '/move-to-next-plate')
            .addMotor('motor', 'D')).call();

        let response = await (new ControllerRequest('pi2', '/take-photo', {
            left: 0.20,
            right: 0.66,
            top: 0.15,
            bottom: 0.80,
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
            left: 0.20,
            right: 0.66,
            top: 0.15,
            bottom: 0.80,
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
