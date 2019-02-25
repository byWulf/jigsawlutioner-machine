const socket = io();

let conveyor = new Conveyor(socket);
conveyor.addEventListeners();

let modeService = new ModeService(socket);
modeService.addEventListeners();

let projectManager = new ProjectManager(socket);
projectManager.addEventListeners();

let statistics = new Statistics(socket);
statistics.addEventListeners();

let board = new Board(socket);
board.addEventListeners();

let solver = new Solver(socket);
solver.addEventListeners();

window.services = {
    conveyor: conveyor,
    modeService: modeService,
    projectManager: projectManager,
    statistics: statistics,
    board: board,
    solver: solver
};