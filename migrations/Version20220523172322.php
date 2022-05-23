<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20220523172322 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add solved flag to projects for asynchronous solving';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE project ADD solved TINYINT(1) NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE project DROP solved');
    }
}
