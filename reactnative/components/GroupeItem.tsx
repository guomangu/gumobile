import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Groupe } from './types';
import { UserSection } from './UserSection';
import { DemandeSection } from './DemandeSection';
import { type Competence as CompetenceApi, type Adresse } from '@/constants/api';
import { AddressTag } from './AddressTag';

interface GroupeItemProps {
  groupe: Groupe;
  authToken: string | null;
  currentUserId: number | null;
  allCompetences: CompetenceApi[];
  groupes: Groupe[];
  addedCompetenceIds: Set<number>;
  onUpdate: () => void;
  onAllCompetencesUpdate: () => void;
  onAddedCompetenceIdsUpdate: (ids: Set<number>) => void;
  onLoginSuccess?: () => void;
}

export function GroupeItem({
  groupe,
  authToken,
  currentUserId,
  allCompetences,
  groupes,
  addedCompetenceIds,
  onUpdate,
  onAllCompetencesUpdate,
  onAddedCompetenceIdsUpdate,
  onLoginSuccess,
}: GroupeItemProps) {
  const users = groupe.usersData || groupe.users || [];

  // Convertir les adresses du groupe en format Adresse pour AddressTag
  const groupeAdresses: Adresse[] = (groupe.adresses || []).map(addr => ({
    id: addr.id,
    type: addr.type as Adresse['type'],
    valeur: addr.valeur,
  }));

  return (
    <ThemedView style={styles.groupeItem}>
      <ThemedView style={styles.groupeHeader}>
        <ThemedText type="defaultSemiBold">{groupe.nom}</ThemedText>
        <ThemedText style={styles.groupeId}>ID: {groupe.id}</ThemedText>
      </ThemedView>
      
      {/* Affichage des adresses comme tags cliquables */}
      {groupeAdresses.length > 0 && (
        <ThemedView style={styles.addressesSection}>
          <ThemedText style={styles.addressesLabel}>Adresses:</ThemedText>
          <ThemedView style={styles.addressesTags}>
            {groupeAdresses.map((adresse) => (
              <AddressTag key={adresse.id} adresse={adresse} />
            ))}
          </ThemedView>
        </ThemedView>
      )}
      
      <DemandeSection
        groupeId={groupe.id}
        demandes={groupe.demandes || []}
        allCompetences={allCompetences}
        groupes={groupes}
        addedCompetenceIds={addedCompetenceIds}
        currentUserId={currentUserId}
        groupeUsers={users}
        onUpdate={onUpdate}
        onAllCompetencesUpdate={onAllCompetencesUpdate}
        onAddedCompetenceIdsUpdate={onAddedCompetenceIdsUpdate}
      />
      
      <UserSection
        groupeId={groupe.id}
        users={users}
        authToken={authToken}
        currentUserId={currentUserId}
        onUpdate={onUpdate}
        onLoginSuccess={onLoginSuccess}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  groupeItem: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 20,
    gap: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  groupeHeader: {
    gap: 6,
    marginBottom: 4,
    paddingBottom: 12,
  },
  groupeId: {
    fontSize: 12,
    opacity: 0.6,
  },
  addressesSection: {
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
  },
  addressesLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
    marginBottom: 8,
    paddingBottom: 4,
  },
  addressesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});

