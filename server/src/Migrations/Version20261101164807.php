<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261101164807 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE room (id INT AUTO_INCREMENT NOT NULL, room_uuid BINARY(16) NOT NULL, created_at DATETIME NOT NULL, last_move_at DATETIME NOT NULL, expires_at DATETIME NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE room_participant (id INT AUTO_INCREMENT NOT NULL, private_room_id INT NOT NULL, room_id INT DEFAULT NULL, name_id INT DEFAULT NULL, UNIQUE INDEX UNIQ_C3AAC52E71179CD6 (name_id), INDEX IDX_C3AAC52E54177093 (room_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE room_participant ADD CONSTRAINT FK_C3AAC52E54177093 FOREIGN KEY (room_id) REFERENCES room (id)');
        $this->addSql('ALTER TABLE room_participant ADD CONSTRAINT FK_C3AAC52E71179CD6 FOREIGN KEY (name_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE user ADD used_token VARCHAR(255) NOT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE room_participant DROP FOREIGN KEY FK_C3AAC52E54177093');
        $this->addSql('ALTER TABLE room_participant DROP FOREIGN KEY FK_C3AAC52E71179CD6');
        $this->addSql('DROP TABLE room');
        $this->addSql('DROP TABLE room_participant');
        $this->addSql('ALTER TABLE user DROP used_token');
    }
}
