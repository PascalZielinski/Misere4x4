<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261101173847 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP INDEX IDX_ROOM_EXPIRES_AT ON room');
        $this->addSql('DROP INDEX UNIQ_ROOM_CODE ON room');
        $this->addSql('DROP INDEX UNIQ_ROOM_UUID ON room');
        $this->addSql('DROP INDEX UNIQ_ROOM_PARTICIPANT_SIDE ON room_participant');
        $this->addSql('DROP INDEX UNIQ_ROOM_PARTICIPANT_USER ON room_participant');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE INDEX IDX_ROOM_EXPIRES_AT ON room (expires_at)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_ROOM_CODE ON room (room_code)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_ROOM_UUID ON room (room_uuid)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_ROOM_PARTICIPANT_SIDE ON room_participant (room_id, side)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_ROOM_PARTICIPANT_USER ON room_participant (room_id, name_id)');
    }
}
