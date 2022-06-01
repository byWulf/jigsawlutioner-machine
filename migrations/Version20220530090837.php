<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20220530090837 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add solving_status column to projects';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE project ADD solving_status LONGTEXT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE project DROP solving_status');
    }
}
