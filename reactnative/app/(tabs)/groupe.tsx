import { StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedView } from '@/components/themed-view';
import { getApiUrl, API_ENDPOINTS, getCompetences, type Competence as CompetenceApi } from '@/constants/api';
import { GroupeList } from '@/components/GroupeList';
import { type Groupe } from '@/components/types';

export default function GroupeScreen() {
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [loadingGroupes, setLoadingGroupes] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // État pour stocker toutes les compétences de la base de données
  const [allCompetences, setAllCompetences] = useState<CompetenceApi[]>([]);
  const [loadingAllCompetences, setLoadingAllCompetences] = useState(false);
  
  // État pour suivre les compétences ajoutées récemment (pour les retirer des propositions)
  const [addedCompetenceIds, setAddedCompetenceIds] = useState<Set<number>>(new Set());
  
  // États pour l'authentification
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const fetchGroupes = async () => {
    setLoadingGroupes(true);
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.GROUPES), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const groupesList = data['hydra:member'] || data || [];
      setGroupes(Array.isArray(groupesList) ? groupesList : []);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des groupes:', error);
      setGroupes([]);
    } finally {
      setLoadingGroupes(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGroupes();
    fetchAllCompetences();
    loadAuthToken();
  }, []);

  useEffect(() => {
    const unsubscribe = () => {
      loadAuthToken();
    };
    return unsubscribe;
  }, []);

  const loadAuthToken = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userId = await AsyncStorage.getItem('userId');
      if (token) {
        setAuthToken(token);
      }
      if (userId) {
        setCurrentUserId(parseInt(userId, 10));
      }
    } catch (error) {
      console.error('Erreur lors du chargement du token:', error);
    }
  };

  const fetchAllCompetences = async () => {
    setLoadingAllCompetences(true);
    try {
      const data = await getCompetences();
      setAllCompetences(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des compétences:', error);
      setAllCompetences([]);
    } finally {
      setLoadingAllCompetences(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroupes();
  };

  const handleUpdate = () => {
    fetchGroupes();
  };

  const handleAllCompetencesUpdate = () => {
    fetchAllCompetences();
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}>
      <ThemedView style={styles.container}>
        <GroupeList
          groupes={groupes}
          loading={loadingGroupes}
          refreshing={refreshing}
          authToken={authToken}
          currentUserId={currentUserId}
          allCompetences={allCompetences}
          addedCompetenceIds={addedCompetenceIds}
          onRefresh={onRefresh}
          onUpdate={handleUpdate}
          onAllCompetencesUpdate={handleAllCompetencesUpdate}
          onAddedCompetenceIdsUpdate={setAddedCompetenceIds}
        />
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

