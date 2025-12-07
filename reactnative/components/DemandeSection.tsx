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
  currentUserId: number | null;
  groupeUsers: any[];
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
  currentUserId,
  groupeUsers,
  onUpdate,
  onAllCompetencesUpdate,
  onAddedCompetenceIdsUpdate,
}: DemandeSectionProps) {
  const [demandeTexte, setDemandeTexte] = useState('');
  const [loadingDemande, setLoadingDemande] = useState(false);
  
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'icon');
  
  const hasDemande = demandes && demandes.length > 0;
  
  // Vérifier si l'utilisateur actuel est membre du groupe
  const isUserInGroupe = currentUserId && groupeUsers.some(user => user.id === currentUserId);
  // Permettre la modification si le groupe n'a pas d'utilisateurs (groupe vide)
  const canModifyGroupe = groupeUsers.length === 0 || isUserInGroupe;

  const handleCreateDemande = async () => {
    // Vérifier si l'utilisateur est membre du groupe ou si le groupe est vide
    if (!canModifyGroupe) {
      Alert.alert('Erreur', 'Vous devez être membre du groupe pour créer des demandes');
      return;
    }

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
              currentUserId={currentUserId}
              groupeUsers={groupeUsers}
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
      {canModifyGroupe ? (
        <>
          <ThemedText style={styles.createDemandeLabel}>Créer une demande:</ThemedText>
          {groupeUsers.length === 0 && (
            <ThemedText style={styles.infoMessage}>
              💡 Vous pouvez créer une demande maintenant. Vous pourrez vous connecter ou créer un utilisateur après.
            </ThemedText>
          )}
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
        </>
      ) : (
        <ThemedText style={styles.restrictedMessage}>
          Vous devez être membre du groupe pour créer des demandes
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  demandeContainer: {
    marginTop: 12,
    paddingTop: 12,
    gap: 12,
  },
  demandeLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
    marginBottom: 8,
    paddingBottom: 4,
  },
  demandeItem: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    gap: 6,
    marginVertical: 6,
  },
  demandeTexte: {
    fontSize: 14,
  },
  demandeId: {
    fontSize: 11,
    opacity: 0.6,
  },
  createDemandeContainer: {
    marginTop: 12,
    paddingTop: 12,
    gap: 12,
  },
  createDemandeLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
    marginBottom: 8,
    paddingBottom: 4,
  },
  demandeInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    margin: 5,
  },
  restrictedMessage: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.7,
    textAlign: 'center',
    padding: 8,
  },
  infoMessage: {
    fontSize: 11,
    fontStyle: 'italic',
    opacity: 0.8,
    padding: 8,
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderRadius: 6,
    marginBottom: 8,
  },
});

