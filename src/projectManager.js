require('colors');

class ProjectManager {
    constructor() {
        this.logger = require('./logger').getInstance('ProjectManager'.white);
        this.logger.setLevel(this.logger.LEVEL_INFO);

        this.fs = require('fs');
        this.events = require('./events');

        this.folder = __dirname + '/../projects/';
        this.lastProjectFile = 'lastProject';

        this.currentProject = null;
    }

    init() {
        if (this.getProjectCount() === 0) {
            this.createProject('Default');
            this.selectProject('Default');
        } else {
            this.selectProject(this.fs.readFileSync(this.folder + this.lastProjectFile, 'utf-8'));
        }
    }

    isValidName(name) {
        return /^[a-zA-Z0-9_-]+$/.test(name);
    }

    hasProject(name) {
        return this.isValidName(name) && this.fs.existsSync(this.folder + name);
    }

    getProjectCount() {
        let count = 0;
        this.fs.readdirSync(this.folder).forEach((name) => {
            if (name === '.' || name === '..') {
                return;
            }
            if (this.fs.lstatSync(this.folder + name).isDirectory()) {
                count++;
            }
        });

        return count;
    }

    createProject(name) {
        if (!this.isValidName(name)) {
            throw new Error('Name must only contain letters, numbers, underscores and dashes.');
        }

        if (this.hasProject(name)) {
            throw new Error('Project "' + name + '" already existing.');
        }

        this.fs.mkdirSync(this.folder + name);

        this.events.dispatch('projectCreated', name);
    }

    selectProject(name) {
        if (!this.hasProject(name)) {
            throw new Error('Project not found.');
        }
        if (this.currentProject === name) {
            throw new Error('Already current project.');
        }

        this.currentProject = name;
        this.fs.writeFileSync(this.folder + this.lastProjectFile, name);

        this.events.dispatch('projectSelected', name);
    }

    deleteProject(name) {
        if (!this.hasProject(name)) {
            throw new Error('Project not found.');
        }
        if (this.currentProject === name) {
            throw new Error('Cannot delete current project.');
        }

        this.fs.rmdirSync(this.folder + name);

        this.events.dispatch('projectDeleted', name);
    }

    getCurrentProjectFolder() {
        return this.folder + this.currentProject + '/';
    }

    getCurrentProjectName() {
        return this.currentProject;
    }
}

module.exports = new ProjectManager();