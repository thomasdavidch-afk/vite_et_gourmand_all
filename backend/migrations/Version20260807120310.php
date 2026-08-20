<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260807120310 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE image (image_id INT AUTO_INCREMENT NOT NULL, path VARCHAR(255) NOT NULL, menu_id INT DEFAULT NULL, INDEX IDX_C53D045FCCD7E912 (menu_id), PRIMARY KEY (image_id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE image ADD CONSTRAINT FK_C53D045FCCD7E912 FOREIGN KEY (menu_id) REFERENCES menu (menu_id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE menu DROP regime, CHANGE titre titre VARCHAR(150) NOT NULL, CHANGE nombre_personne_minimum nombre_personne_minimum INT NOT NULL, CHANGE prix_par_personne prix_par_personne NUMERIC(10, 2) NOT NULL, CHANGE description description LONGTEXT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE image DROP FOREIGN KEY FK_C53D045FCCD7E912');
        $this->addSql('DROP TABLE image');
        $this->addSql('ALTER TABLE menu ADD regime VARCHAR(50) DEFAULT NULL, CHANGE titre titre VARCHAR(50) DEFAULT NULL, CHANGE nombre_personne_minimum nombre_personne_minimum INT DEFAULT NULL, CHANGE prix_par_personne prix_par_personne DOUBLE PRECISION DEFAULT NULL, CHANGE description description VARCHAR(50) DEFAULT NULL');
    }
}
