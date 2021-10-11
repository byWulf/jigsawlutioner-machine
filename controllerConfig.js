import ControllerRequest from "./src/controllerRequest.js";
ControllerRequest.port = 3000;
ControllerRequest.pis = {
    'pi1': {
        dns: 'http://pi1',
        bricks: {
            'df': {
                address: 'df9e6ac3514d355934202020ff112718',
            },
            '33': {
                address: '3315F352515035524E4A2020FF062510',
            },
        },
    },
    'pi2': {
        dns: 'http://pi2',
        bricks: {
            'a7': {
                address: 'A778704A514D355934202020FF110722',
            },
            '09': {
                address: '09F95596514D32384E202020FF0F272F',
            },
        },
    },
    'pi3': {
        dns: 'http://pi3',
        bricks: {
        },
    },
};
