<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20220601104206 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add groups and biggest group counts to project for showing a progress bar in frontend';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE project ADD solved_groups INT NOT NULL, ADD biggest_group INT NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE project DROP solved_groups, DROP biggest_group');
    }
}
