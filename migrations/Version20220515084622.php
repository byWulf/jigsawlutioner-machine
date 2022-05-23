<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20220515084622 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add box to piece';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE piece ADD box INT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE piece DROP box');
    }
}
