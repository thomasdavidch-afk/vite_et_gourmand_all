<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260807103938 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE publie DROP FOREIGN KEY `FK_D2D78B28197E709F`');
        $this->addSql('ALTER TABLE publie DROP FOREIGN KEY `FK_D2D78B28FB88E14F`');
        $this->addSql('DROP TABLE publie');
        $this->addSql('ALTER TABLE utilisateur ADD nom VARCHAR(50) DEFAULT NULL, ADD is_active TINYINT DEFAULT 1 NOT NULL, CHANGE telephone telephone VARCHAR(20) DEFAULT NULL, CHANGE adresse_postale adresse_postale VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE publie (utilisateur_id INT NOT NULL, avis_id INT NOT NULL, INDEX IDX_D2D78B28FB88E14F (utilisateur_id), INDEX IDX_D2D78B28197E709F (avis_id), PRIMARY KEY (utilisateur_id, avis_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_general_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('ALTER TABLE publie ADD CONSTRAINT `FK_D2D78B28197E709F` FOREIGN KEY (avis_id) REFERENCES avis (avis_id)');
        $this->addSql('ALTER TABLE publie ADD CONSTRAINT `FK_D2D78B28FB88E14F` FOREIGN KEY (utilisateur_id) REFERENCES utilisateur (utilisateur_id)');
        $this->addSql('ALTER TABLE utilisateur DROP nom, DROP is_active, CHANGE telephone telephone VARCHAR(50) DEFAULT NULL, CHANGE adresse_postale adresse_postale VARCHAR(50) DEFAULT NULL');
    }
}
