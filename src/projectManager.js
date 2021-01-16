import Logger from "./logger.js";
const logger = new Logger('ProjectManager'.white);
logger.setLevel(Logger.LEVEL_INFO);

import fs from 'fs';
import path from 'path';
import url from 'url';

class ProjectManager {
    constructor() {
        this.folder = path.normalize(path.dirname(url.fileURLToPath(import.meta.url)) + '/../projects/');

        this.lastProjectFile = 'lastProject';

        this.currentProject = null;
    }

    init() {
        if (this.getProjectCount() === 0) {
            this.createProject('Default');
            this.selectProject('Default');
        } else {
            this.selectProject(fs.readFileSync(this.folder + this.lastProjectFile, 'utf-8'));
        }
    }

    isValidName(name) {
        return /^[a-zA-Z0-9_-]+$/.test(name);
    }

    hasProject(name) {
        return this.isValidName(name) && fs.existsSync(this.folder + name);
    }

    getProjectCount() {
        return this.getProjectNames().length;
    }

    getProjectNames() {
        let names = [];
        fs.readdirSync(this.folder).forEach((name) => {
            if (name === '.' || name === '..') {
                return;
            }
            if (fs.lstatSync(this.folder + name).isDirectory()) {
                names.push(name)
            }
        });

        return names;
    }

    createProject(name) {
        if (!this.isValidName(name)) {
            throw new Error('Name must only contain letters, numbers, underscores and dashes.');
        }

        if (this.hasProject(name)) {
            throw new Error('Project "' + name + '" already existing.');
        }

        fs.mkdirSync(this.folder + name);

        process.emit('jigsawlutioner.projectCreated', name);
    }

    selectProject(name) {
        if (!this.hasProject(name)) {
            throw new Error('Project not found.');
        }
        if (this.currentProject === name) {
            throw new Error('Already current project.');
        }

        this.currentProject = name;
        fs.writeFileSync(this.folder + this.lastProjectFile, name);

        process.emit('jigsawlutioner.projectSelected', name);
    }

    deleteProject(name) {
        if (!this.hasProject(name)) {
            throw new Error('Project not found.');
        }
        if (this.currentProject === name) {
            throw new Error('Cannot delete current project.');
        }

        fs.rmdirSync(this.folder + name, { recursive: true });

        process.emit('jigsawlutioner.projectDeleted', name);
    }

    getCurrentProjectFolder() {
        return this.folder + this.currentProject + '/';
    }

    getCurrentProjectName() {
        return this.currentProject;
    }
}

export default new ProjectManager();
