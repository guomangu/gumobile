import { StyleSheet, TextInput, Button, Alert, TouchableOpacity } from 'react-native';
import { useState, useMemo } from 'react';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getApiUrl, API_ENDPOINTS, type Competence as CompetenceApi } from '@/constants/api';
import { type Competence } from './types';
import { proposeCompetencesFromDemande, proposeNewWordsFromDemande } from './competence-utils';

interface CompetenceSectionProps {
  demandeId: number;
  demandeTexte: string;
  competences: Competence[];
  allCompetences: CompetenceApi[];
  groupes: any[];
  addedCompetenceIds: Set<number>;
  demandeGroupeId: number;
  onUpdate: () => void;
  onAllCompetencesUpdate: () => void;
  onAddedCompetenceIdsUpdate: (ids: Set<number>) => void;
}

export function CompetenceSection({
  demandeId,
  demandeTexte,
  competences,
  allCompetences,
  groupes,
  addedCompetenceIds,
  demandeGroupeId,
  onUpdate,
  onAllCompetencesUpdate,
  onAddedCompetenceIdsUpdate,
}: CompetenceSectionProps) {
  const [competenceNom, setCompetenceNom] = useState('');
  const [loadingCompetence, setLoadingCompetence] = useState(false);
  // État local pour retirer immédiatement les compétences ajoutées des propositions
  const [locallyAddedCompetenceIds, setLocallyAddedCompetenceIds] = useState<Set<number>>(new Set());
  
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'icon');

  const handleCreateCompetence = async (nomCompetence?: string, competenceId?: number) => {
    const nom = nomCompetence || competenceNom.trim();
    if (!nom) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour la compétence');
      return;
    }

    const nomLower = nom.toLowerCase().trim();
    const existingInDemande = competences.some(
      c => c.nom.toLowerCase().trim() === nomLower
    );

    if (existingInDemande) {
      Alert.alert('Erreur', 'Cette compétence existe déjà pour cette demande');
      return;
    }

    setLoadingCompetence(true);
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.COMPETENCES), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          nom: nom,
          demandes: [`/api/demandes/${demandeId}`],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}: ${response.statusText}`);
      }

      const newCompetence = await response.json();
      const addedId = competenceId || newCompetence.id;

      // Ajouter immédiatement à l'état local pour retirer de la liste des propositions
      if (addedId) {
        setLocallyAddedCompetenceIds(prev => new Set([...prev, addedId]));
        onAddedCompetenceIdsUpdate(new Set([...addedCompetenceIds, addedId]));
      }

      if (!nomCompetence) {
        Alert.alert('Succès', 'Compétence créée avec succès !');
      }
      
      setCompetenceNom('');
      
      // Recharger les données pour mettre à jour les compétences de la demande
      // Cela permettra de recalculer les propositions avec la nouvelle compétence liée
      onUpdate();
      onAllCompetencesUpdate();
      
      // Réinitialiser les IDs ajoutés après un court délai pour permettre le rechargement
      // Les propositions seront recalculées automatiquement grâce à useMemo quand competences change
      setTimeout(() => {
        onAddedCompetenceIdsUpdate(new Set());
        setLocallyAddedCompetenceIds(new Set());
      }, 300);
    } catch (error: any) {
      console.error('Erreur lors de la création de la compétence:', error);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue lors de la création de la compétence');
    } finally {
      setLoadingCompetence(false);
    }
  };

  // Combiner les IDs ajoutés globalement et localement pour filtrer les propositions
  const combinedAddedIds = useMemo(() => {
    return new Set([...addedCompetenceIds, ...locallyAddedCompetenceIds]);
  }, [addedCompetenceIds, locallyAddedCompetenceIds]);

  // Utiliser useMemo pour recalculer les propositions quand les dépendances changent
  // Les propositions sont recalculées automatiquement quand competences change
  // Cela permet de proposer les compétences associées au tag nouvellement lié
  const proposedCompetences = useMemo(() => {
    return proposeCompetencesFromDemande(
      demandeTexte,
      competences,
      demandeGroupeId,
      allCompetences,
      groupes,
      combinedAddedIds
    );
  }, [demandeTexte, competences, demandeGroupeId, allCompetences, groupes, combinedAddedIds]);

  // Proposer des nouveaux mots de la demande qui ne sont pas dans la DB
  const proposedNewWords = useMemo(() => {
    return proposeNewWordsFromDemande(
      demandeTexte,
      competences,
      allCompetences,
      combinedAddedIds
    );
  }, [demandeTexte, competences, allCompetences, combinedAddedIds]);

  return (
    <>
      {/* Affichage des compétences existantes */}
      {competences.length > 0 && (
        <ThemedView style={styles.competencesContainer}>
          <ThemedText style={styles.competencesLabel}>Compétences:</ThemedText>
          <ThemedView style={styles.competencesTags}>
            {competences.map((competence) => (
              <ThemedView key={competence.id} style={styles.competenceTag}>
                <ThemedText style={styles.competenceTagText}>{competence.nom}</ThemedText>
              </ThemedView>
            ))}
          </ThemedView>
        </ThemedView>
      )}
      
      {/* Propositions de compétences existantes de la DB */}
      {proposedCompetences.length > 0 && (
        <ThemedView style={styles.proposedCompetencesContainer}>
          <ThemedText style={styles.proposedCompetencesLabel}>
            Suggestions de compétences (existantes):
          </ThemedText>
          <ThemedView style={styles.proposedCompetencesTags}>
            {proposedCompetences.map((competence) => (
              <TouchableOpacity
                key={competence.id}
                style={[styles.proposedCompetenceTag, { borderColor }]}
                onPress={() => handleCreateCompetence(competence.nom, competence.id)}
                disabled={loadingCompetence}
              >
                <ThemedText style={styles.proposedCompetenceTagText}>
                  {competence.nom}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ThemedView>
        </ThemedView>
      )}

      {/* Propositions de nouveaux mots de la demande */}
      {proposedNewWords.length > 0 && (
        <ThemedView style={styles.proposedNewWordsContainer}>
          <ThemedText style={styles.proposedNewWordsLabel}>
            Mots de la demande (nouveaux tags):
          </ThemedText>
          <ThemedView style={styles.proposedNewWordsTags}>
            {proposedNewWords.map((word, index) => (
              <TouchableOpacity
                key={`${word}-${index}`}
                style={[styles.proposedNewWordTag, { borderColor }]}
                onPress={() => {
                  setCompetenceNom(word);
                  handleCreateCompetence(word);
                }}
                disabled={loadingCompetence}
              >
                <ThemedText style={styles.proposedNewWordTagText}>
                  {word}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ThemedView>
        </ThemedView>
      )}
      
      {/* Input pour créer une nouvelle compétence */}
      <ThemedView style={styles.createCompetenceContainer}>
        <ThemedText style={styles.createCompetenceLabel}>Ajouter une compétence (tag):</ThemedText>
        <TextInput
          style={[styles.competenceInput, { borderColor, color: textColor }]}
          placeholder="Entrez un mot-clé..."
          placeholderTextColor={textColor + '80'}
          value={competenceNom}
          onChangeText={setCompetenceNom}
        />
        <Button
          title={loadingCompetence ? 'Création...' : 'Ajouter'}
          onPress={() => handleCreateCompetence()}
          disabled={loadingCompetence || !competenceNom.trim()}
        />
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  competencesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 8,
  },
  competencesLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.7,
  },
  competencesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  competenceTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  competenceTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  createCompetenceContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 8,
  },
  createCompetenceLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.7,
  },
  competenceInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    minHeight: 40,
  },
  proposedCompetencesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 8,
  },
  proposedCompetencesLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.7,
  },
  proposedCompetencesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  proposedCompetenceTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  proposedCompetenceTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(0,122,255,0.9)',
  },
  proposedNewWordsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 8,
  },
  proposedNewWordsLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.7,
  },
  proposedNewWordsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  proposedNewWordTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,149,0,0.1)',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  proposedNewWordTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,149,0,0.9)',
  },
});

