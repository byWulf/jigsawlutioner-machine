<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20220530082400 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Allow stations without controllers';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE station CHANGE controller_id controller_id INT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE station CHANGE controller_id controller_id INT NOT NULL');
    }
}
