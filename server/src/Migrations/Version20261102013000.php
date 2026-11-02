<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;
use Doctrine\Migrations\Exception\IrreversibleMigration;

final class Version20261102013000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Hash existing user session tokens at rest';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('UPDATE `user` SET session_token = SHA2(session_token, 256)');
        $this->addSql("UPDATE `user` SET used_token = SHA2(used_token, 256) WHERE used_token <> ''");
    }

    public function down(Schema $schema): void
    {
        throw new IrreversibleMigration('Hashed user tokens cannot be restored to their original values.');
    }
}
