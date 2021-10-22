import './controllerConfig.js';

import ControllerRequest from "./src/controllerRequest.js";

import prompts from "prompts";

(async() => {
    const pis = Object.keys(ControllerRequest.pis).map(key => ({ title: key, value: key }));
    pis.push({title: 'Exit', value: null});

    let piResponse = null;
    while (true) {
        piResponse = await prompts({
            type: 'select',
            name: 'value',
            message: 'What pi?',
            choices: pis,
            initial: piResponse !== null ? pis.findIndex((element) => element.value === piResponse.value) : null
        });
        if (piResponse.value === null) {
            break;
        }

        const bricks = Object.keys(ControllerRequest.pis[piResponse.value].bricks).map(key => ({ title: key, value: key }));
        bricks.push({title: 'Back to Pi selection', value: null});

        let brickResponse = null;
        while (true) {
            brickResponse = await prompts({
                type: 'select',
                name: 'value',
                message: 'What brick of ' + piResponse.value + '?',
                choices: bricks,
                default: brickResponse !== null ? bricks.findIndex((element) => element.value === brickResponse.value) : null
            });
            if (brickResponse.value === null) {
                break;
            }

            const motors = [
                {title: 'A', value: 'A'},
                {title: 'B', value: 'B'},
                {title: 'C', value: 'C'},
                {title: 'D', value: 'D'},
                {title: 'Back to Brick selection', value: null},
            ];

            let motorResponse = null;
            while (true) {
                motorResponse = await prompts({
                    type: 'select',
                    name: 'value',
                    message: 'What motor of ' + piResponse.value + '/' + brickResponse.value + '?',
                    choices: motors,
                    default: motorResponse !== null ? motors.findIndex((element) => element.value === motorResponse.value) : null
                });
                if (motorResponse.value === null) {
                    break;
                }

                const motorChoices = [
                    {title: 'Reset forward', value: 'resetForward'},
                    {title: 'Reset backward', value: 'resetBackward'},
                    {title: 'Set position', value: 'setPosition'},
                    {title: 'Back to motor selection', value: null},
                ]

                let choiceResponse = null;
                let lastPower = 50;
                let lastPosition = 0;
                while (true) {
                    choiceResponse = await prompts({
                        type: 'select',
                        name: 'value',
                        message: 'What should motor ' + motorResponse.value + ' of ' + piResponse.value + '/' + brickResponse.value + ' do?',
                        choices: motorChoices,
                        default: choiceResponse !== null ? motorChoices.findIndex((element) => element.value === choiceResponse.value) : null
                    });
                    if (choiceResponse.value === null) {
                        break;
                    }

                    if (choiceResponse.value === 'setPosition') {
                        let positionResponse =  await prompts({
                            type: 'number',
                            name: 'value',
                            message: 'To what position?',
                            initial: lastPosition,
                        });
                        lastPosition = positionResponse.value;

                        const request = new ControllerRequest(piResponse.value, '/motor/position')
                            .addMotor('motor', motorResponse.value)
                            .setParameter('power', 100)
                            .setParameter('position', lastPosition)
                        ;

                        await request.call();
                    } else {
                        let powerResponse =  await prompts({
                            type: 'number',
                            name: 'value',
                            message: 'How much power?',
                            initial: lastPower,
                            min: 1,
                            max: 100
                        });
                        lastPower = powerResponse.value;

                        const request = new ControllerRequest(piResponse.value, '/motor/reset')
                            .addMotor('motor', motorResponse.value)
                            .setParameter('power', lastPower)
                            .setParameter('direction', choiceResponse.value === 'resetForward' ? 'forward' : 'backward')
                        ;

                        await request.call();
                    }
                }
            }

        }

    }
})();
