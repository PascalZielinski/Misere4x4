<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261101230000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add room UUIDs and persistent online matchmaking queue';
    }

    public function up(Schema $schema): void
    {
        $room = $schema->getTable('room');
        $this->addSql('ALTER TABLE room ADD room_uuid VARCHAR(36) DEFAULT NULL, ADD matchmade TINYINT(1) DEFAULT 0 NOT NULL');
        $this->addSql("UPDATE room SET room_uuid = UUID() WHERE room_uuid IS NULL");
        $this->addSql('ALTER TABLE room MODIFY room_uuid VARCHAR(36) NOT NULL');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_ROOM_UUID ON room (room_uuid)');
        if (!$room->hasIndex('UNIQ_ROOM_CODE')) {
            $this->addSql('CREATE UNIQUE INDEX UNIQ_ROOM_CODE ON room (room_code)');
        }
        if (!$room->hasIndex('IDX_ROOM_EXPIRES_AT')) {
            $this->addSql('CREATE INDEX IDX_ROOM_EXPIRES_AT ON room (expires_at)');
        }
        $participants = $schema->getTable('room_participant');
        if (!$participants->hasIndex('UNIQ_ROOM_PARTICIPANT_SIDE')) {
            $this->addSql('CREATE UNIQUE INDEX UNIQ_ROOM_PARTICIPANT_SIDE ON room_participant (room_id, side)');
        }
        if (!$participants->hasIndex('UNIQ_ROOM_PARTICIPANT_USER')) {
            $this->addSql('CREATE UNIQUE INDEX UNIQ_ROOM_PARTICIPANT_USER ON room_participant (room_id, name_id)');
        }
        $this->addSql('CREATE TABLE online_queue (id INT AUTO_INCREMENT NOT NULL, user_id INT NOT NULL, room_id INT DEFAULT NULL, created_at DATETIME NOT NULL, UNIQUE INDEX UNIQ_ONLINE_QUEUE_USER (user_id), INDEX IDX_ONLINE_QUEUE_WAITING (room_id, created_at), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE online_queue ADD CONSTRAINT FK_ONLINE_QUEUE_USER FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE online_queue ADD CONSTRAINT FK_ONLINE_QUEUE_ROOM FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE online_queue');
        $this->addSql('DROP INDEX UNIQ_ROOM_UUID ON room');
        $participants = $schema->getTable('room_participant');
        if ($participants->hasIndex('UNIQ_ROOM_PARTICIPANT_SIDE')) {
            $this->addSql('DROP INDEX UNIQ_ROOM_PARTICIPANT_SIDE ON room_participant');
        }
        if ($participants->hasIndex('UNIQ_ROOM_PARTICIPANT_USER')) {
            $this->addSql('DROP INDEX UNIQ_ROOM_PARTICIPANT_USER ON room_participant');
        }
        $room = $schema->getTable('room');
        if ($room->hasIndex('UNIQ_ROOM_CODE')) {
            $this->addSql('DROP INDEX UNIQ_ROOM_CODE ON room');
        }
        if ($room->hasIndex('IDX_ROOM_EXPIRES_AT')) {
            $this->addSql('DROP INDEX IDX_ROOM_EXPIRES_AT ON room');
        }
        $this->addSql('ALTER TABLE room DROP room_uuid, DROP matchmade');
    }
}
