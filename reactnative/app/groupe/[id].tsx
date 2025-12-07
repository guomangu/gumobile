import { StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getApiUrl, API_ENDPOINTS, getCompetences, type Competence as CompetenceApi, type Adresse } from '@/constants/api';
import { type Groupe } from '@/components/types';
import { UserSection } from '@/components/UserSection';
import { DemandeSection } from '@/components/DemandeSection';
import { AddressTag } from '@/components/AddressTag';
import { authEvents, AUTH_EVENTS } from '@/utils/authEvents';

export default function GroupeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [groupe, setGroupe] = useState<Groupe | null>(null);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [allCompetences, setAllCompetences] = useState<CompetenceApi[]>([]);
  const [addedCompetenceIds, setAddedCompetenceIds] = useState<Set<number>>(new Set());

  const loadAuthState = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userId = await AsyncStorage.getItem('userId');
      setAuthToken(token);
      if (userId) {
        setCurrentUserId(parseInt(userId, 10));
      } else {
        setCurrentUserId(null);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'état d\'authentification:', error);
    }
  }, []);

  const fetchGroupe = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const groupeId = parseInt(id, 10);
      const response = await fetch(getApiUrl(`${API_ENDPOINTS.GROUPES}/${groupeId}`), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setGroupe(null);
          setLoading(false);
          return;
        }
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setGroupe(data);
    } catch (error: any) {
      console.error('Erreur lors du chargement du groupe:', error);
      setGroupe(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAllCompetences = useCallback(async () => {
    try {
      const data = await getCompetences();
      setAllCompetences(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des compétences:', error);
      setAllCompetences([]);
    }
  }, []);

  useEffect(() => {
    loadAuthState();
    fetchAllCompetences();
  }, [loadAuthState, fetchAllCompetences]);

  useEffect(() => {
    if (id) {
      fetchGroupe();
    }
  }, [id, fetchGroupe]);

  // Écouter les événements d'authentification
  useFocusEffect(
    useCallback(() => {
      loadAuthState();
      
      const handleAuthChange = () => {
        loadAuthState();
        fetchGroupe();
      };

      authEvents.on(AUTH_EVENTS.LOGIN, handleAuthChange);
      authEvents.on(AUTH_EVENTS.LOGOUT, handleAuthChange);

      return () => {
        authEvents.off(AUTH_EVENTS.LOGIN, handleAuthChange);
        authEvents.off(AUTH_EVENTS.LOGOUT, handleAuthChange);
      };
    }, [loadAuthState, fetchGroupe])
  );

  const handleUpdate = useCallback(() => {
    fetchGroupe();
  }, [fetchGroupe]);

  const handleAllCompetencesUpdate = useCallback(() => {
    fetchAllCompetences();
  }, [fetchAllCompetences]);

  if (loading) {
    return (
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}>
        <ThemedView style={styles.container} cloudStyle={false}>
          <ActivityIndicator size="large" color="#000000" />
          <ThemedText style={styles.loadingText}>Chargement...</ThemedText>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  if (!groupe) {
    return (
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}>
        <ThemedView style={styles.container} cloudStyle={false}>
          <ThemedText type="title">Groupe introuvable</ThemedText>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ThemedText style={styles.backButtonText}>Retour</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  const users = groupe.usersData || groupe.users || [];
  
  // Convertir les adresses du groupe en format Adresse pour AddressTag
  const groupeAdresses: Adresse[] = (groupe.adresses || []).map(addr => ({
    id: addr.id,
    type: addr.type as Adresse['type'],
    valeur: addr.valeur,
  }));

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}>
      <ThemedView style={styles.container} cloudStyle={false}>
        <ThemedView style={styles.groupeHeader}>
          <ThemedText type="title" style={styles.groupeTitle}>
            {groupe.nom}
          </ThemedText>
          <ThemedText style={styles.groupeId}>ID: {groupe.id}</ThemedText>
        </ThemedView>

        {/* Affichage des adresses comme tags cliquables */}
        {groupeAdresses.length > 0 && (
          <ThemedView style={styles.addressesSection}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Adresses</ThemedText>
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
          groupes={[groupe]}
          addedCompetenceIds={addedCompetenceIds}
          currentUserId={currentUserId}
          groupeUsers={users}
          onUpdate={handleUpdate}
          onAllCompetencesUpdate={handleAllCompetencesUpdate}
          onAddedCompetenceIdsUpdate={setAddedCompetenceIds}
        />

        <UserSection
          groupeId={groupe.id}
          users={users}
          authToken={authToken}
          currentUserId={currentUserId}
          onUpdate={handleUpdate}
          onLoginSuccess={loadAuthState}
        />
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 24,
  },
  loadingText: {
    marginTop: 12,
    textAlign: 'center',
  },
  groupeHeader: {
    gap: 8,
    paddingBottom: 16,
  },
  groupeTitle: {
    marginBottom: 4,
  },
  groupeId: {
    fontSize: 12,
    opacity: 0.6,
  },
  addressesSection: {
    gap: 12,
    marginTop: 8,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  addressesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  backButton: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    marginTop: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

