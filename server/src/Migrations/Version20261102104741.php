<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261102104741 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create the current application schema';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE online_queue (id INT AUTO_INCREMENT NOT NULL, created_at DATETIME NOT NULL, user_id INT NOT NULL, room_id INT DEFAULT NULL, UNIQUE INDEX UNIQ_4042B8BEA76ED395 (user_id), INDEX IDX_4042B8BE54177093 (room_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE room (id INT AUTO_INCREMENT NOT NULL, room_code INT NOT NULL, room_uuid VARCHAR(36) NOT NULL, matchmade TINYINT DEFAULT 0 NOT NULL, created_at DATETIME NOT NULL, last_move_at DATETIME NOT NULL, expires_at DATETIME NOT NULL, game_state JSON NOT NULL, UNIQUE INDEX UNIQ_729F519BB27BBAC2 (room_uuid), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE room_participant (id INT AUTO_INCREMENT NOT NULL, side VARCHAR(1) NOT NULL, room_id INT NOT NULL, name_id INT NOT NULL, INDEX IDX_C3AAC52E54177093 (room_id), INDEX IDX_C3AAC52E71179CD6 (name_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE user (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(255) NOT NULL, session_token VARCHAR(255) NOT NULL, created_at DATETIME NOT NULL, last_seen_at DATETIME NOT NULL, score INT DEFAULT 0 NOT NULL, active TINYINT DEFAULT 1 NOT NULL, used_token VARCHAR(255) NOT NULL, UNIQUE INDEX UNIQ_8D93D6495E237E06 (name), UNIQUE INDEX UNIQ_8D93D649844A19ED (session_token), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE online_queue ADD CONSTRAINT FK_4042B8BEA76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE online_queue ADD CONSTRAINT FK_4042B8BE54177093 FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE room_participant ADD CONSTRAINT FK_C3AAC52E54177093 FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE room_participant ADD CONSTRAINT FK_C3AAC52E71179CD6 FOREIGN KEY (name_id) REFERENCES user (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE online_queue DROP FOREIGN KEY FK_4042B8BEA76ED395');
        $this->addSql('ALTER TABLE online_queue DROP FOREIGN KEY FK_4042B8BE54177093');
        $this->addSql('ALTER TABLE room_participant DROP FOREIGN KEY FK_C3AAC52E54177093');
        $this->addSql('ALTER TABLE room_participant DROP FOREIGN KEY FK_C3AAC52E71179CD6');
        $this->addSql('DROP TABLE online_queue');
        $this->addSql('DROP TABLE room_participant');
        $this->addSql('DROP TABLE room');
        $this->addSql('DROP TABLE user');
    }
}
