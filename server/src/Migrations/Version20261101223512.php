<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261101223512 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE online_queue (id INT AUTO_INCREMENT NOT NULL, created_at DATETIME NOT NULL, user_id INT NOT NULL, room_id INT DEFAULT NULL, UNIQUE INDEX UNIQ_4042B8BEA76ED395 (user_id), INDEX IDX_4042B8BE54177093 (room_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE online_queue ADD CONSTRAINT FK_4042B8BEA76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE online_queue ADD CONSTRAINT FK_4042B8BE54177093 FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE room ADD room_uuid VARCHAR(36) NOT NULL, ADD matchmade TINYINT DEFAULT 0 NOT NULL');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_729F519BB27BBAC2 ON room (room_uuid)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE online_queue DROP FOREIGN KEY FK_4042B8BEA76ED395');
        $this->addSql('ALTER TABLE online_queue DROP FOREIGN KEY FK_4042B8BE54177093');
        $this->addSql('DROP TABLE online_queue');
        $this->addSql('DROP INDEX UNIQ_729F519BB27BBAC2 ON room');
        $this->addSql('ALTER TABLE room DROP room_uuid, DROP matchmade');
    }
}
