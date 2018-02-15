const socket = io();

let conveyor = new Conveyor(socket);
conveyor.addEventListeners();