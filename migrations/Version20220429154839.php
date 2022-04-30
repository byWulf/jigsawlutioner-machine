<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20220429154839 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add images to piece';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE piece ADD images JSON NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE piece DROP images');
    }
}
