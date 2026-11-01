<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261101181000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add uniqueness and expiry indexes to the existing private room schema';
    }

    public function up(Schema $schema): void
    {
        $room = $schema->getTable('room');
        if (!$room->hasIndex('UNIQ_ROOM_UUID')) {
            $this->addSql('CREATE UNIQUE INDEX UNIQ_ROOM_UUID ON room (room_uuid)');
        }
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
    }

    public function down(Schema $schema): void
    {
        $room = $schema->getTable('room');
        if ($room->hasIndex('UNIQ_ROOM_UUID')) {
            $this->addSql('DROP INDEX UNIQ_ROOM_UUID ON room');
        }
        if ($room->hasIndex('UNIQ_ROOM_CODE')) {
            $this->addSql('DROP INDEX UNIQ_ROOM_CODE ON room');
        }
        if ($room->hasIndex('IDX_ROOM_EXPIRES_AT')) {
            $this->addSql('DROP INDEX IDX_ROOM_EXPIRES_AT ON room');
        }

        $participants = $schema->getTable('room_participant');
        if ($participants->hasIndex('UNIQ_ROOM_PARTICIPANT_SIDE')) {
            $this->addSql('DROP INDEX UNIQ_ROOM_PARTICIPANT_SIDE ON room_participant');
        }
        if ($participants->hasIndex('UNIQ_ROOM_PARTICIPANT_USER')) {
            $this->addSql('DROP INDEX UNIQ_ROOM_PARTICIPANT_USER ON room_participant');
        }
    }
}
