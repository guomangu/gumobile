import { StyleSheet, FlatList, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Groupe } from './types';
import { GroupeItem } from './GroupeItem';
import { type Competence as CompetenceApi } from '@/constants/api';

interface GroupeListProps {
  groupes: Groupe[];
  loading: boolean;
  refreshing: boolean;
  authToken: string | null;
  currentUserId: number | null;
  allCompetences: CompetenceApi[];
  addedCompetenceIds: Set<number>;
  onRefresh: () => void;
  onUpdate: () => void;
  onAllCompetencesUpdate: () => void;
  onAddedCompetenceIdsUpdate: (ids: Set<number>) => void;
}

export function GroupeList({
  groupes,
  loading,
  refreshing,
  authToken,
  currentUserId,
  allCompetences,
  addedCompetenceIds,
  onRefresh,
  onUpdate,
  onAllCompetencesUpdate,
  onAddedCompetenceIdsUpdate,
}: GroupeListProps) {
  if (loading && groupes.length === 0) {
    return <ThemedText>Chargement...</ThemedText>;
  }

  if (groupes.length === 0) {
    return <ThemedText style={styles.emptyText}>Aucun groupe pour le moment</ThemedText>;
  }

  return (
    <ThemedView style={styles.listContainer}>
      <ThemedText type="subtitle">Liste des groupes</ThemedText>
      <FlatList
        data={groupes}
        renderItem={({ item }) => (
          <GroupeItem
            groupe={item}
            authToken={authToken}
            currentUserId={currentUserId}
            allCompetences={allCompetences}
            groupes={groupes}
            addedCompetenceIds={addedCompetenceIds}
            onUpdate={onUpdate}
            onAllCompetencesUpdate={onAllCompetencesUpdate}
            onAddedCompetenceIdsUpdate={onAddedCompetenceIdsUpdate}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        scrollEnabled={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    gap: 12,
    marginBottom: 16,
    padding: 16,
  },
  emptyText: {
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
});

