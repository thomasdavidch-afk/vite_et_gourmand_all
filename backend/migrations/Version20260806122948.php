<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260806122948 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE allergene (allergene_id INT AUTO_INCREMENT NOT NULL, libelle VARCHAR(50) DEFAULT NULL, PRIMARY KEY (allergene_id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE avis (avis_id INT AUTO_INCREMENT NOT NULL, note VARCHAR(50) DEFAULT NULL, description VARCHAR(50) DEFAULT NULL, statut VARCHAR(50) DEFAULT NULL, PRIMARY KEY (avis_id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE commande (numero_commande VARCHAR(50) NOT NULL, date_commande DATE DEFAULT NULL, date_prestation DATE DEFAULT NULL, heure_livraison VARCHAR(50) DEFAULT NULL, prix_menu DOUBLE PRECISION DEFAULT NULL, nombre_personne INT DEFAULT NULL, prix_livraison DOUBLE PRECISION DEFAULT NULL, statut VARCHAR(50) DEFAULT NULL, pret_materiel TINYINT DEFAULT NULL, restitution_materiel TINYINT DEFAULT NULL, menu_id INT DEFAULT NULL, utilisateur_id INT DEFAULT NULL, INDEX IDX_6EEAA67DCCD7E912 (menu_id), INDEX IDX_6EEAA67DFB88E14F (utilisateur_id), PRIMARY KEY (numero_commande)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE horaire (horaire_id INT AUTO_INCREMENT NOT NULL, jour VARCHAR(50) DEFAULT NULL, heure_ouverture VARCHAR(50) DEFAULT NULL, heure_fermeture VARCHAR(50) DEFAULT NULL, PRIMARY KEY (horaire_id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE menu (menu_id INT AUTO_INCREMENT NOT NULL, titre VARCHAR(50) DEFAULT NULL, nombre_personne_minimum INT DEFAULT NULL, prix_par_personne DOUBLE PRECISION DEFAULT NULL, regime VARCHAR(50) DEFAULT NULL, description VARCHAR(50) DEFAULT NULL, quantite_restante INT DEFAULT NULL, PRIMARY KEY (menu_id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE adapte (menu_id INT NOT NULL, regime_id INT NOT NULL, INDEX IDX_BF387DC2CCD7E912 (menu_id), INDEX IDX_BF387DC235E7D534 (regime_id), PRIMARY KEY (menu_id, regime_id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE propose (menu_id INT NOT NULL, theme_id INT NOT NULL, INDEX IDX_3DF2D060CCD7E912 (menu_id), INDEX IDX_3DF2D06059027487 (theme_id), PRIMARY KEY (menu_id, theme_id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE propose_plat (menu_id INT NOT NULL, plat_id INT NOT NULL, INDEX IDX_1ED3F3C8CCD7E912 (menu_id), INDEX IDX_1ED3F3C8D73DB560 (plat_id), PRIMARY KEY (menu_id, plat_id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE plat (plat_id INT AUTO_INCREMENT NOT NULL, titre_plat VARCHAR(50) DEFAULT NULL, photo LONGBLOB DEFAULT NULL, PRIMARY KEY (plat_id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE contient (plat_id INT NOT NULL, allergene_id INT NOT NULL, INDEX IDX_DC302E56D73DB560 (plat_id), INDEX IDX_DC302E564646AB2 (allergene_id), PRIMARY KEY (plat_id, allergene_id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE regime (regime_id INT AUTO_INCREMENT NOT NULL, libelle VARCHAR(50) DEFAULT NULL, PRIMARY KEY (regime_id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE role (role_id INT AUTO_INCREMENT NOT NULL, libelle VARCHAR(50) DEFAULT NULL, PRIMARY KEY (role_id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE theme (theme_id INT AUTO_INCREMENT NOT NULL, libelle VARCHAR(50) DEFAULT NULL, PRIMARY KEY (theme_id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE utilisateur (utilisateur_id INT AUTO_INCREMENT NOT NULL, email VARCHAR(50) DEFAULT NULL, password VARCHAR(50) DEFAULT NULL, prenom VARCHAR(50) DEFAULT NULL, telephone VARCHAR(50) DEFAULT NULL, ville VARCHAR(50) DEFAULT NULL, pays VARCHAR(50) DEFAULT NULL, adresse_postale VARCHAR(50) DEFAULT NULL, PRIMARY KEY (utilisateur_id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE possede (utilisateur_id INT NOT NULL, role_id INT NOT NULL, INDEX IDX_3D0B1508FB88E14F (utilisateur_id), INDEX IDX_3D0B1508D60322AC (role_id), PRIMARY KEY (utilisateur_id, role_id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE publie (utilisateur_id INT NOT NULL, avis_id INT NOT NULL, INDEX IDX_D2D78B28FB88E14F (utilisateur_id), INDEX IDX_D2D78B28197E709F (avis_id), PRIMARY KEY (utilisateur_id, avis_id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE commande ADD CONSTRAINT FK_6EEAA67DCCD7E912 FOREIGN KEY (menu_id) REFERENCES menu (menu_id)');
        $this->addSql('ALTER TABLE commande ADD CONSTRAINT FK_6EEAA67DFB88E14F FOREIGN KEY (utilisateur_id) REFERENCES utilisateur (utilisateur_id)');
        $this->addSql('ALTER TABLE adapte ADD CONSTRAINT FK_BF387DC2CCD7E912 FOREIGN KEY (menu_id) REFERENCES menu (menu_id)');
        $this->addSql('ALTER TABLE adapte ADD CONSTRAINT FK_BF387DC235E7D534 FOREIGN KEY (regime_id) REFERENCES regime (regime_id)');
        $this->addSql('ALTER TABLE propose ADD CONSTRAINT FK_3DF2D060CCD7E912 FOREIGN KEY (menu_id) REFERENCES menu (menu_id)');
        $this->addSql('ALTER TABLE propose ADD CONSTRAINT FK_3DF2D06059027487 FOREIGN KEY (theme_id) REFERENCES theme (theme_id)');
        $this->addSql('ALTER TABLE propose_plat ADD CONSTRAINT FK_1ED3F3C8CCD7E912 FOREIGN KEY (menu_id) REFERENCES menu (menu_id)');
        $this->addSql('ALTER TABLE propose_plat ADD CONSTRAINT FK_1ED3F3C8D73DB560 FOREIGN KEY (plat_id) REFERENCES plat (plat_id)');
        $this->addSql('ALTER TABLE contient ADD CONSTRAINT FK_DC302E56D73DB560 FOREIGN KEY (plat_id) REFERENCES plat (plat_id)');
        $this->addSql('ALTER TABLE contient ADD CONSTRAINT FK_DC302E564646AB2 FOREIGN KEY (allergene_id) REFERENCES allergene (allergene_id)');
        $this->addSql('ALTER TABLE possede ADD CONSTRAINT FK_3D0B1508FB88E14F FOREIGN KEY (utilisateur_id) REFERENCES utilisateur (utilisateur_id)');
        $this->addSql('ALTER TABLE possede ADD CONSTRAINT FK_3D0B1508D60322AC FOREIGN KEY (role_id) REFERENCES role (role_id)');
        $this->addSql('ALTER TABLE publie ADD CONSTRAINT FK_D2D78B28FB88E14F FOREIGN KEY (utilisateur_id) REFERENCES utilisateur (utilisateur_id)');
        $this->addSql('ALTER TABLE publie ADD CONSTRAINT FK_D2D78B28197E709F FOREIGN KEY (avis_id) REFERENCES avis (avis_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE commande DROP FOREIGN KEY FK_6EEAA67DCCD7E912');
        $this->addSql('ALTER TABLE commande DROP FOREIGN KEY FK_6EEAA67DFB88E14F');
        $this->addSql('ALTER TABLE adapte DROP FOREIGN KEY FK_BF387DC2CCD7E912');
        $this->addSql('ALTER TABLE adapte DROP FOREIGN KEY FK_BF387DC235E7D534');
        $this->addSql('ALTER TABLE propose DROP FOREIGN KEY FK_3DF2D060CCD7E912');
        $this->addSql('ALTER TABLE propose DROP FOREIGN KEY FK_3DF2D06059027487');
        $this->addSql('ALTER TABLE propose_plat DROP FOREIGN KEY FK_1ED3F3C8CCD7E912');
        $this->addSql('ALTER TABLE propose_plat DROP FOREIGN KEY FK_1ED3F3C8D73DB560');
        $this->addSql('ALTER TABLE contient DROP FOREIGN KEY FK_DC302E56D73DB560');
        $this->addSql('ALTER TABLE contient DROP FOREIGN KEY FK_DC302E564646AB2');
        $this->addSql('ALTER TABLE possede DROP FOREIGN KEY FK_3D0B1508FB88E14F');
        $this->addSql('ALTER TABLE possede DROP FOREIGN KEY FK_3D0B1508D60322AC');
        $this->addSql('ALTER TABLE publie DROP FOREIGN KEY FK_D2D78B28FB88E14F');
        $this->addSql('ALTER TABLE publie DROP FOREIGN KEY FK_D2D78B28197E709F');
        $this->addSql('DROP TABLE allergene');
        $this->addSql('DROP TABLE avis');
        $this->addSql('DROP TABLE commande');
        $this->addSql('DROP TABLE horaire');
        $this->addSql('DROP TABLE menu');
        $this->addSql('DROP TABLE adapte');
        $this->addSql('DROP TABLE propose');
        $this->addSql('DROP TABLE propose_plat');
        $this->addSql('DROP TABLE plat');
        $this->addSql('DROP TABLE contient');
        $this->addSql('DROP TABLE regime');
        $this->addSql('DROP TABLE role');
        $this->addSql('DROP TABLE theme');
        $this->addSql('DROP TABLE utilisateur');
        $this->addSql('DROP TABLE possede');
        $this->addSql('DROP TABLE publie');
    }
}
