package cc.uconnect.service;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ActivityCatalogSeeder implements ApplicationRunner {

    private final ActivityCatalogService catalogService;

    @Override
    public void run(ApplicationArguments args) {
        SeedDomain[] domains = {
                new SeedDomain("Sport", "Activites sportives et bien-etre"),
                new SeedDomain("Culture", "Sorties culturelles et artistiques"),
                new SeedDomain("Etudes", "Revision, entraide et apprentissage"),
                new SeedDomain("Tech", "Numerique, projets et innovation"),
                new SeedDomain("Jeux", "Jeux de societe, e-sport et loisirs"),
                new SeedDomain("Vie campus", "Evenements et vie associative"),
                new SeedDomain("Carriere", "Orientation, stage et emploi"),
                new SeedDomain("Solidarite", "Benevolat et entraide"),
                new SeedDomain("Voyage", "Sorties, visites et decouvertes"),
                new SeedDomain("Sante", "Prevention, sport doux et equilibre")
        };

        for (SeedDomain domain : domains) {
            catalogService.ensureDomain(domain.name(), domain.description());
        }

        for (SeedActivity activity : activities()) {
            catalogService.ensureSeedActivity(activity.title(), activity.domain());
        }
    }

    private SeedActivity[] activities() {
        return new SeedActivity[] {
                new SeedActivity("Randonnee", "Sport"),
                new SeedActivity("Course a pied", "Sport"),
                new SeedActivity("Football campus", "Sport"),
                new SeedActivity("Basket entre etudiants", "Sport"),
                new SeedActivity("Volley-ball", "Sport"),
                new SeedActivity("Badminton", "Sport"),
                new SeedActivity("Natation", "Sport"),
                new SeedActivity("Yoga debutant", "Sante"),
                new SeedActivity("Meditation guidee", "Sante"),
                new SeedActivity("Atelier nutrition", "Sante"),
                new SeedActivity("Marche active", "Sante"),
                new SeedActivity("Sortie musee", "Culture"),
                new SeedActivity("Cinema debat", "Culture"),
                new SeedActivity("Club lecture", "Culture"),
                new SeedActivity("Atelier photo", "Culture"),
                new SeedActivity("Theatre etudiant", "Culture"),
                new SeedActivity("Concert campus", "Culture"),
                new SeedActivity("Exposition locale", "Culture"),
                new SeedActivity("Atelier dessin", "Culture"),
                new SeedActivity("Groupe revisions mathematique", "Etudes"),
                new SeedActivity("Revision algorithmique", "Etudes"),
                new SeedActivity("Revision droit", "Etudes"),
                new SeedActivity("Revision economie", "Etudes"),
                new SeedActivity("Revision anglais", "Etudes"),
                new SeedActivity("Revision statistiques", "Etudes"),
                new SeedActivity("Tutorat programmation", "Etudes"),
                new SeedActivity("Preparation partiels", "Etudes"),
                new SeedActivity("Groupe memoire", "Etudes"),
                new SeedActivity("Atelier prise de notes", "Etudes"),
                new SeedActivity("Session bibliotheque", "Etudes"),
                new SeedActivity("Hackathon", "Tech"),
                new SeedActivity("Atelier IA", "Tech"),
                new SeedActivity("Projet open source", "Tech"),
                new SeedActivity("Coding dojo", "Tech"),
                new SeedActivity("Atelier cybersecurite", "Tech"),
                new SeedActivity("Initiation cloud", "Tech"),
                new SeedActivity("Atelier data science", "Tech"),
                new SeedActivity("Build night", "Tech"),
                new SeedActivity("Demo startup", "Tech"),
                new SeedActivity("Jeux d'echecs", "Jeux"),
                new SeedActivity("Soiree jeux de societe", "Jeux"),
                new SeedActivity("Tournoi FIFA", "Jeux"),
                new SeedActivity("Tournoi Mario Kart", "Jeux"),
                new SeedActivity("Escape game", "Jeux"),
                new SeedActivity("Quiz culture generale", "Jeux"),
                new SeedActivity("Jeu de role", "Jeux"),
                new SeedActivity("Loup-garou", "Jeux"),
                new SeedActivity("Poker amical", "Jeux"),
                new SeedActivity("Accueil nouveaux etudiants", "Vie campus"),
                new SeedActivity("Afterwork campus", "Vie campus"),
                new SeedActivity("Petit-dejeuner associatif", "Vie campus"),
                new SeedActivity("Forum associations", "Vie campus"),
                new SeedActivity("Soiree internationale", "Vie campus"),
                new SeedActivity("Pique-nique campus", "Vie campus"),
                new SeedActivity("Visite du campus", "Vie campus"),
                new SeedActivity("Atelier cuisine", "Vie campus"),
                new SeedActivity("Bourse aux livres", "Vie campus"),
                new SeedActivity("Conference metier", "Carriere"),
                new SeedActivity("Simulation entretien", "Carriere"),
                new SeedActivity("Atelier CV", "Carriere"),
                new SeedActivity("Atelier LinkedIn", "Carriere"),
                new SeedActivity("Rencontre alumni", "Carriere"),
                new SeedActivity("Forum stage", "Carriere"),
                new SeedActivity("Preparation alternance", "Carriere"),
                new SeedActivity("Pitch projet", "Carriere"),
                new SeedActivity("Collecte alimentaire", "Solidarite"),
                new SeedActivity("Maraude etudiante", "Solidarite"),
                new SeedActivity("Tutorat benevole", "Solidarite"),
                new SeedActivity("Don du sang", "Solidarite"),
                new SeedActivity("Nettoyage campus", "Solidarite"),
                new SeedActivity("Atelier inclusion", "Solidarite"),
                new SeedActivity("Collecte vetements", "Solidarite"),
                new SeedActivity("Parrainage international", "Solidarite"),
                new SeedActivity("Visite ville", "Voyage"),
                new SeedActivity("Week-end mer", "Voyage"),
                new SeedActivity("Sortie montagne", "Voyage"),
                new SeedActivity("Decouverte patrimoine", "Voyage"),
                new SeedActivity("Balade photo", "Voyage"),
                new SeedActivity("Sortie velo", "Voyage"),
                new SeedActivity("Visite entreprise", "Voyage"),
                new SeedActivity("Excursion regionale", "Voyage"),
                new SeedActivity("Atelier gestion stress", "Sante"),
                new SeedActivity("Pause sophrologie", "Sante"),
                new SeedActivity("Course solidaire", "Sport"),
                new SeedActivity("Musculation debutant", "Sport"),
                new SeedActivity("Danse urbaine", "Sport"),
                new SeedActivity("Escalade", "Sport"),
                new SeedActivity("Atelier podcast", "Culture"),
                new SeedActivity("Club manga", "Culture"),
                new SeedActivity("Atelier ecriture", "Culture"),
                new SeedActivity("Revision physique", "Etudes"),
                new SeedActivity("Revision reseaux", "Etudes"),
                new SeedActivity("Revision base de donnees", "Etudes"),
                new SeedActivity("Atelier React", "Tech"),
                new SeedActivity("Atelier Spring Boot", "Tech"),
                new SeedActivity("Atelier Kubernetes", "Tech"),
                new SeedActivity("Tournoi belote", "Jeux"),
                new SeedActivity("Soiree blind test", "Jeux"),
                new SeedActivity("Debat actualite", "Vie campus"),
                new SeedActivity("Atelier budget etudiant", "Vie campus"),
                new SeedActivity("Job dating", "Carriere"),
                new SeedActivity("Mentorat CV", "Carriere"),
                new SeedActivity("Aide devoirs lyceens", "Solidarite"),
                new SeedActivity("Atelier tri selectif", "Solidarite"),
                new SeedActivity("Sejour linguistique", "Voyage"),
                new SeedActivity("Sortie patinoire", "Sport")
        };
    }

    private record SeedDomain(String name, String description) {
    }

    private record SeedActivity(String title, String domain) {
    }
}
