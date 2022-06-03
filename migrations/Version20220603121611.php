<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20220603121611 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add classification to pieces';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE piece ADD classification VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE piece DROP classification');
    }
}
