<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20220523135110 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Change data field of piece to string (serialized dto)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE piece CHANGE data data LONGTEXT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE piece CHANGE data data JSON DEFAULT NULL');
    }
}
