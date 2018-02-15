class ProjectManager {
    constructor(socket) {
        this.socket = socket;

        this.projectsModal = $('#projectsModal');
        this.createProjectForm = $('#createProjectForm');

        this.currentProject = null;
    }

    addEventListeners() {
        this.socket.on('projectSelected', (projectName) => {
            $('#projectName').text(projectName);
            this.currentProject = projectName;

            this.createProjectForm.find('#projectCreateNameInput').val('');
            this.createProjectForm.find('.createProjectError').empty();
            this.projectsModal.modal('hide');
        });

        this.projectsModal.on('show.bs.modal', () => {
            this.projectsModal.find('.tableContent').empty().append('<div class="text-center"><i class="fa fa-circle-o-notch fa-spin fa-3x fa-fw"></i></div>');
            this.socket.emit('getProjects');
        });

        this.socket.on('projectList', (names) => {

            let table = $('<table class="table table-hover table-bordered"><tbody></tbody></table>');
            names.forEach((name) => {
                let active = name === this.currentProject;

                let tr = $('<tr></tr>');
                tr.attr('data-name', name);

                if (active) {
                    tr.addClass('table-primary');
                    tr.append($('<td class="width-100 font-size-125" colspan="2"></td>').append($('<b></b>').text(name)));
                } else {
                    tr.append($('<td class="width-100 font-size-125"></td>').text(name));
                    tr.append('<td><div class="btn-group"><button class="btn btn-primary loadProject"><i class="fa fa-play-circle"></i> Load</button><button class="btn btn-danger deleteProject"><i class="fa fa-trash"></i> Delete</button></div></td>');
                }

                table.find('tbody').append(tr);
            });

            this.projectsModal.find('.tableContent').empty().append(table);
        });

        this.createProjectForm.on('submit', () => {
            this.createProjectForm.find('.createProjectError').empty();
            this.socket.emit('createProject', this.createProjectForm.find('#projectCreateNameInput').val());

            return false;
        });

        this.socket.on('createProjectError', (error) => {
            this.createProjectForm.find('.createProjectError').text(error);
        });

        this.projectsModal.on('click', '.loadProject', (event) => {
            this.socket.emit('loadProject', $(event.target).closest('tr').attr('data-name'));
        });
        this.projectsModal.on('click', '.deleteProject', (event) => {
            if (confirm('Are you sure? This action cannot be undone!')) {
                this.socket.emit('deleteProject', $(event.target).closest('tr').attr('data-name'));
            }
        });
        this.socket.on('projectDeleted', (name) => {
            this.projectsModal.find('tr[data-name="' + name + '"]').remove();
        });
    };
}