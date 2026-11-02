<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261101173018 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add private room game fields and participant sides';
    }

    public function up(Schema $schema): void
    {
        $room = $schema->getTable('room');
        if (!$room->hasColumn('room_code')) {
            $this->addSql('ALTER TABLE room ADD room_code INT NOT NULL');
        }
        if (!$room->hasColumn('game_state')) {
            $this->addSql('ALTER TABLE room ADD game_state JSON NOT NULL');
        }

        $participants = $schema->getTable('room_participant');
        if ($participants->hasIndex('UNIQ_C3AAC52E71179CD6')) {
            $this->addSql('DROP INDEX UNIQ_C3AAC52E71179CD6 ON room_participant');
        }
        if (!$participants->hasIndex('IDX_C3AAC52E71179CD6')) {
            $this->addSql('CREATE INDEX IDX_C3AAC52E71179CD6 ON room_participant (name_id)');
        }

        foreach (['FK_C3AAC52E54177093', 'FK_C3AAC52E71179CD6'] as $foreignKey) {
            if ($participants->hasForeignKey($foreignKey)) {
                $this->addSql(sprintf('ALTER TABLE room_participant DROP FOREIGN KEY `%s`', $foreignKey));
            }
        }
        if (!$participants->hasColumn('side')) {
            $this->addSql('ALTER TABLE room_participant ADD side VARCHAR(1) NOT NULL DEFAULT \'A\'');
        }
        if ($participants->hasColumn('private_room_id')) {
            $this->addSql('ALTER TABLE room_participant DROP private_room_id');
        }

        $changes = [];
        if (!$participants->getColumn('room_id')->getNotnull()) {
            $changes[] = 'CHANGE room_id room_id INT NOT NULL';
        }
        if (!$participants->getColumn('name_id')->getNotnull()) {
            $changes[] = 'CHANGE name_id name_id INT NOT NULL';
        }
        if ([] !== $changes) {
            $this->addSql('ALTER TABLE room_participant '.implode(', ', $changes));
        }

        $this->addSql('ALTER TABLE room_participant ADD CONSTRAINT FK_C3AAC52E54177093 FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE room_participant ADD CONSTRAINT FK_C3AAC52E71179CD6 FOREIGN KEY (name_id) REFERENCES user (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $room = $schema->getTable('room');
        if ($room->hasColumn('room_code') && !$room->hasIndex('UNIQ_ROOM_CODE')) {
            $this->addSql('ALTER TABLE room DROP room_code');
        }
        if ($room->hasColumn('game_state')) {
            $this->addSql('ALTER TABLE room DROP game_state');
        }

        $participants = $schema->getTable('room_participant');
        foreach (['FK_C3AAC52E54177093', 'FK_C3AAC52E71179CD6'] as $foreignKey) {
            if ($participants->hasForeignKey($foreignKey)) {
                $this->addSql(sprintf('ALTER TABLE room_participant DROP FOREIGN KEY `%s`', $foreignKey));
            }
        }
        if ($participants->hasIndex('IDX_C3AAC52E71179CD6')) {
            $this->addSql('DROP INDEX IDX_C3AAC52E71179CD6 ON room_participant');
        }
        if ($participants->hasColumn('side')) {
            $this->addSql('ALTER TABLE room_participant DROP side');
        }
        if (!$participants->hasColumn('private_room_id')) {
            $this->addSql('ALTER TABLE room_participant ADD private_room_id INT NOT NULL DEFAULT 0');
        }

        $changes = [];
        if ($participants->getColumn('room_id')->getNotnull()) {
            $changes[] = 'CHANGE room_id room_id INT DEFAULT NULL';
        }
        if ($participants->getColumn('name_id')->getNotnull()) {
            $changes[] = 'CHANGE name_id name_id INT DEFAULT NULL';
        }
        if ([] !== $changes) {
            $this->addSql('ALTER TABLE room_participant '.implode(', ', $changes));
        }
        if (!$participants->hasIndex('UNIQ_C3AAC52E71179CD6')) {
            $this->addSql('CREATE UNIQUE INDEX UNIQ_C3AAC52E71179CD6 ON room_participant (name_id)');
        }
        if (!$participants->hasForeignKey('FK_C3AAC52E54177093')) {
            $this->addSql('ALTER TABLE room_participant ADD CONSTRAINT FK_C3AAC52E54177093 FOREIGN KEY (room_id) REFERENCES room (id)');
        }
        if (!$participants->hasForeignKey('FK_C3AAC52E71179CD6')) {
            $this->addSql('ALTER TABLE room_participant ADD CONSTRAINT FK_C3AAC52E71179CD6 FOREIGN KEY (name_id) REFERENCES user (id)');
        }
    }
}
