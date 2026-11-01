<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261101192000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Remove room UUIDs; active private rooms are addressed by their four-digit room code';
    }

    public function up(Schema $schema): void
    {
        $room = $schema->getTable('room');
        if ($room->hasIndex('UNIQ_ROOM_UUID')) {
            $this->addSql('DROP INDEX UNIQ_ROOM_UUID ON room');
        }
        if ($room->hasColumn('room_uuid')) {
            $this->addSql('ALTER TABLE room DROP room_uuid');
        }
    }

    public function down(Schema $schema): void
    {
        $room = $schema->getTable('room');
        if (!$room->hasColumn('room_uuid')) {
            $this->addSql('ALTER TABLE room ADD room_uuid BINARY(16) DEFAULT NULL');
            $this->addSql("UPDATE room SET room_uuid = UNHEX(REPLACE(UUID(), '-', ''))");
            $this->addSql('ALTER TABLE room MODIFY room_uuid BINARY(16) NOT NULL');
        }
        if (!$room->hasIndex('UNIQ_ROOM_UUID')) {
            $this->addSql('CREATE UNIQUE INDEX UNIQ_ROOM_UUID ON room (room_uuid)');
        }
    }
}
