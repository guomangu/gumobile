import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Groupe } from './types';
import { UserSection } from './UserSection';
import { DemandeSection } from './DemandeSection';
import { type Competence as CompetenceApi } from '@/constants/api';

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
}: GroupeItemProps) {
  const users = groupe.usersData || groupe.users || [];

  return (
    <ThemedView style={styles.groupeItem}>
      <ThemedView style={styles.groupeHeader}>
        <ThemedText type="defaultSemiBold">{groupe.nom}</ThemedText>
        <ThemedText style={styles.groupeId}>ID: {groupe.id}</ThemedText>
      </ThemedView>
      
      <UserSection
        groupeId={groupe.id}
        users={users}
        authToken={authToken}
        currentUserId={currentUserId}
        onUpdate={onUpdate}
      />
      
      <DemandeSection
        groupeId={groupe.id}
        demandes={groupe.demandes || []}
        allCompetences={allCompetences}
        groupes={groupes}
        addedCompetenceIds={addedCompetenceIds}
        onUpdate={onUpdate}
        onAllCompetencesUpdate={onAllCompetencesUpdate}
        onAddedCompetenceIdsUpdate={onAddedCompetenceIdsUpdate}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  groupeItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  groupeHeader: {
    gap: 4,
  },
  groupeId: {
    fontSize: 12,
    opacity: 0.6,
  },
});

