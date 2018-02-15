const socket = io();

let conveyor = new Conveyor(socket);
conveyor.addEventListeners();

let modeService = new ModeService(socket);
modeService.addEventListeners();