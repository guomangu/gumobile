import { type Competence, type Groupe } from './types';
import { type Competence as CompetenceApi } from '@/constants/api';

// Fonction pour proposer des compétences existantes de la DB basées sur le texte de la demande
export function proposeCompetencesFromDemande(
  texte: string,
  existingCompetences: Competence[] = [],
  demandeGroupeId: number | undefined,
  allCompetences: CompetenceApi[],
  groupes: Groupe[],
  addedCompetenceIds: Set<number>
): CompetenceApi[] {
  // Liste des mots vides (stop words) en français
  const stopWords = new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'd', 'et', 'ou', 'mais', 'donc', 'car', 'ne', 'pas',
    'pour', 'par', 'avec', 'sans', 'sur', 'sous', 'dans', 'entre', 'vers', 'chez', 'à', 'au', 'aux',
    'ce', 'cette', 'ces', 'se', 'te', 'me', 'nous', 'vous', 'ils', 'elles', 'il', 'elle', 'on',
    'qui', 'que', 'quoi', 'où', 'quand', 'comment', 'pourquoi', 'est', 'sont', 'être', 'avoir',
    'faire', 'aller', 'venir', 'voir', 'savoir', 'vouloir', 'pouvoir', 'devoir', 'falloir',
    'très', 'plus', 'moins', 'aussi', 'bien', 'mal', 'mieux', 'beaucoup', 'peu', 'trop',
    'tout', 'tous', 'toute', 'toutes', 'rien', 'personne', 'quelque', 'chaque',
    'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'notre', 'votre', 'leur',
    'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles'
  ]);

  // Nettoyer et extraire les mots du texte
  const texteWords = texte
    .toLowerCase()
    .replace(/[^\w\sàâäéèêëïîôöùûüÿç]/g, ' ')
    .split(/\s+/)
    .filter(word => 
      word.length >= 3 &&
      !stopWords.has(word) &&
      !/^\d+$/.test(word)
    );

  // Récupérer les IDs des compétences déjà liées à cette demande
  const existingCompetenceIds = new Set(
    existingCompetences.map(c => c.id)
  );

  // Récupérer les noms des compétences déjà liées à cette demande (pour éviter les doublons de noms)
  const existingCompetenceNames = new Set(
    existingCompetences.map(c => c.nom.toLowerCase().trim())
  );

  // Trouver les compétences liées par groupe
  const relatedCompetenceIds = new Set<number>();
  
  if (existingCompetences.length > 0) {
    existingCompetences.forEach(existingComp => {
      groupes.forEach(groupe => {
        if (groupe.id === demandeGroupeId) return;
        
        groupe.demandes?.forEach(demande => {
          const hasCompetence = demande.competences?.some(
            comp => comp.nom.toLowerCase().trim() === existingComp.nom.toLowerCase().trim()
          );
          
          if (hasCompetence) {
            groupe.demandes?.forEach(d => {
              d.competences?.forEach(comp => {
                if (!existingCompetenceIds.has(comp.id)) {
                  relatedCompetenceIds.add(comp.id);
                }
              });
            });
          }
        });
      });
    });
  }

  // Filtrer les compétences de la DB
  const availableCompetences = allCompetences.filter(
    comp => {
      const compNomLower = comp.nom.toLowerCase().trim();
      return (
        !existingCompetenceIds.has(comp.id) &&
        !addedCompetenceIds.has(comp.id) &&
        !existingCompetenceNames.has(compNomLower)
      );
    }
  );

  // Calculer un score de pertinence pour chaque compétence
  const competencesWithScore = availableCompetences.map(comp => {
    const compNomLower = comp.nom.toLowerCase();
    let score = 0;

    if (relatedCompetenceIds.has(comp.id)) {
      score += 15;
    }

    texteWords.forEach(word => {
      if (compNomLower.includes(word)) {
        score += 2;
      }
      if (compNomLower === word) {
        score += 5;
      }
      if (compNomLower.startsWith(word)) {
        score += 3;
      }
    });

    if (texte.toLowerCase().includes(compNomLower)) {
      score += 10;
    }

    return { compétence: comp, score };
  });

  // Trier par score décroissant et retourner les meilleures propositions
  return competencesWithScore
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(item => item.compétence);
}

