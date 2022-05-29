<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20220430083423 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add setup';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE setup (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(255) NOT NULL, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE setup_controller (id INT AUTO_INCREMENT NOT NULL, setup_id INT NOT NULL, controller_id INT NOT NULL, position INT NOT NULL, strategy VARCHAR(255) NOT NULL, INDEX IDX_5FC0E2E5CDCDB68E (setup_id), INDEX IDX_5FC0E2E5F6D1A74B (controller_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE setup_controller ADD CONSTRAINT FK_5FC0E2E5CDCDB68E FOREIGN KEY (setup_id) REFERENCES setup (id)');
        $this->addSql('ALTER TABLE setup_controller ADD CONSTRAINT FK_5FC0E2E5F6D1A74B FOREIGN KEY (controller_id) REFERENCES controller (id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE setup_controller DROP FOREIGN KEY FK_5FC0E2E5CDCDB68E');
        $this->addSql('DROP TABLE setup');
        $this->addSql('DROP TABLE setup_controller');
    }
}
