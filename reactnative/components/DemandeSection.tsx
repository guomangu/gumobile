import { StyleSheet, TextInput, Button, Alert } from 'react-native';
import { useState } from 'react';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getApiUrl, API_ENDPOINTS, type Competence as CompetenceApi } from '@/constants/api';
import { type Demande, type Competence, type Groupe } from './types';
import { CompetenceSection } from './CompetenceSection';

interface DemandeSectionProps {
  groupeId: number;
  demandes: Demande[];
  allCompetences: CompetenceApi[];
  groupes: Groupe[];
  addedCompetenceIds: Set<number>;
  onUpdate: () => void;
  onAllCompetencesUpdate: () => void;
  onAddedCompetenceIdsUpdate: (ids: Set<number>) => void;
}

export function DemandeSection({
  groupeId,
  demandes,
  allCompetences,
  groupes,
  addedCompetenceIds,
  onUpdate,
  onAllCompetencesUpdate,
  onAddedCompetenceIdsUpdate,
}: DemandeSectionProps) {
  const [demandeTexte, setDemandeTexte] = useState('');
  const [loadingDemande, setLoadingDemande] = useState(false);
  
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'icon');
  
  const hasDemande = demandes && demandes.length > 0;

  const handleCreateDemande = async () => {
    if (!demandeTexte.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un texte pour la demande');
      return;
    }

    setLoadingDemande(true);
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.DEMANDES), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          texte: demandeTexte.trim(),
          groupe: `/api/groupes/${groupeId}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}: ${response.statusText}`);
      }

      Alert.alert('Succès', 'Demande créée avec succès !');
      setDemandeTexte('');
      onUpdate();
    } catch (error: any) {
      console.error('Erreur lors de la création de la demande:', error);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue lors de la création de la demande');
    } finally {
      setLoadingDemande(false);
    }
  };

  if (hasDemande) {
    return (
      <ThemedView style={styles.demandeContainer}>
        <ThemedText style={styles.demandeLabel}>Demande existante:</ThemedText>
        {demandes.map((demande) => (
          <ThemedView key={demande.id} style={styles.demandeItem}>
            <ThemedText style={styles.demandeTexte}>{demande.texte}</ThemedText>
            <ThemedText style={styles.demandeId}>ID: {demande.id}</ThemedText>
            
            <CompetenceSection
              demandeId={demande.id}
              demandeTexte={demande.texte}
              competences={demande.competences || []}
              allCompetences={allCompetences}
              groupes={groupes}
              addedCompetenceIds={addedCompetenceIds}
              demandeGroupeId={groupeId}
              onUpdate={onUpdate}
              onAllCompetencesUpdate={onAllCompetencesUpdate}
              onAddedCompetenceIdsUpdate={onAddedCompetenceIdsUpdate}
            />
          </ThemedView>
        ))}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.createDemandeContainer}>
      <ThemedText style={styles.createDemandeLabel}>Créer une demande:</ThemedText>
      <TextInput
        style={[styles.demandeInput, { borderColor, color: textColor }]}
        placeholder="Entrez le texte de la demande..."
        placeholderTextColor={textColor + '80'}
        value={demandeTexte}
        onChangeText={setDemandeTexte}
        multiline
        numberOfLines={3}
      />
      <Button
        title={loadingDemande ? 'Création...' : 'Créer la demande'}
        onPress={handleCreateDemande}
        disabled={loadingDemande || !demandeTexte.trim()}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  demandeContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 8,
  },
  demandeLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
  },
  demandeItem: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.02)',
    gap: 4,
  },
  demandeTexte: {
    fontSize: 14,
  },
  demandeId: {
    fontSize: 11,
    opacity: 0.6,
  },
  createDemandeContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 8,
  },
  createDemandeLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
  },
  demandeInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});

