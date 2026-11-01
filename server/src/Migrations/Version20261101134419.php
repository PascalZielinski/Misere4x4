<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261101134419 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add an active flag to users';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user ADD active TINYINT(1) DEFAULT 1 NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user DROP active');
    }
}
