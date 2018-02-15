class ProjectManager {
    constructor(socket) {
        this.socket = socket;
    }

    addEventListeners() {
        this.socket.on('projectSelected', (projectName) => {
            $('#projectName').text(projectName);
        });
    };
}