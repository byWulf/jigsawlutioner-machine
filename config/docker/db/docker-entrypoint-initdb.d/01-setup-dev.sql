CREATE DATABASE jigsawlutioner_machine DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci;

CREATE USER 'jigsawlutioner_machine'@'%' IDENTIFIED BY 'changeme';

GRANT ALL PRIVILEGES ON jigsawlutioner_machine.* TO 'jigsawlutioner_machine'@'%';

FLUSH PRIVILEGES;
