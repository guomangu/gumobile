import { Image } from 'expo-image';
import { StyleSheet, Button, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CreateAddressForm } from '@/components/CreateAddressForm';
import { GroupeItem } from '@/components/GroupeItem';
import { getCompetences, getApiUrl, API_ENDPOINTS, type Competence as CompetenceApi } from '@/constants/api';
import { type Groupe } from '@/components/types';

export default function HomeScreen() {
  // États pour l'authentification
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUserPseudo, setCurrentUserPseudo] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
  // État pour le groupe créé
  const [createdGroupe, setCreatedGroupe] = useState<Groupe | null>(null);
  
  // État pour tous les groupes (nécessaire pour les propositions de compétences)
  const [allGroupes, setAllGroupes] = useState<Groupe[]>([]);
  
  // États pour GroupeItem
  const [allCompetences, setAllCompetences] = useState<CompetenceApi[]>([]);
  const [addedCompetenceIds, setAddedCompetenceIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadAuthToken();
    fetchAllCompetences();
    fetchAllGroupes();
    loadSavedGroupe();
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
      const userPseudo = await AsyncStorage.getItem('userPseudo');
      if (token) {
        setAuthToken(token);
      }
      if (userId) {
        setCurrentUserId(parseInt(userId, 10));
      }
      if (userPseudo) {
        setCurrentUserPseudo(userPseudo);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du token:', error);
    }
  };

  const fetchAllCompetences = async () => {
    try {
      const data = await getCompetences();
      setAllCompetences(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des compétences:', error);
      setAllCompetences([]);
    }
  };

  const fetchAllGroupes = async () => {
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
      setAllGroupes(Array.isArray(groupesList) ? groupesList : []);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des groupes:', error);
      setAllGroupes([]);
    }
  };

  const handleUpdate = async () => {
    // Recharger le groupe depuis l'API pour mettre à jour les données (demandes, users, etc.)
    if (createdGroupe) {
      const updatedGroupe = await fetchGroupeById(createdGroupe.id);
      if (updatedGroupe) {
        setCreatedGroupe(updatedGroupe);
        // S'assurer que l'ID reste sauvegardé après la mise à jour
        await saveGroupeId(updatedGroupe.id);
      }
    }
    // Recharger aussi tous les groupes pour avoir les données complètes pour les propositions
    await fetchAllGroupes();
  };

  const handleAllCompetencesUpdate = () => {
    fetchAllCompetences();
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('userPseudo');
      setAuthToken(null);
      setCurrentUserPseudo(null);
      Alert.alert('Déconnexion', 'Vous avez été déconnecté avec succès');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la déconnexion');
    }
  };

  const fetchGroupeById = async (groupeId: number): Promise<Groupe | null> => {
    try {
      const response = await fetch(getApiUrl(`${API_ENDPOINTS.GROUPES}/${groupeId}`), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        id: data.id,
        nom: data.nom,
        demandes: data.demandes || [],
        users: data.users || [],
        usersData: data.usersData || data.users || [],
      };
    } catch (error: any) {
      console.error('Erreur lors de la récupération du groupe:', error);
      return null;
    }
  };

  const loadSavedGroupe = async () => {
    try {
      const savedGroupeId = await AsyncStorage.getItem('createdGroupeId');
      if (savedGroupeId) {
        const groupeId = parseInt(savedGroupeId, 10);
        const groupe = await fetchGroupeById(groupeId);
        if (groupe) {
          setCreatedGroupe(groupe);
        } else {
          // Si le groupe n'existe plus, supprimer l'ID sauvegardé
          await AsyncStorage.removeItem('createdGroupeId');
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du groupe sauvegardé:', error);
    }
  };

  const saveGroupeId = async (groupeId: number) => {
    try {
      await AsyncStorage.setItem('createdGroupeId', groupeId.toString());
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du groupe:', error);
    }
  };

  const clearSavedGroupeId = async () => {
    try {
      await AsyncStorage.removeItem('createdGroupeId');
    } catch (error) {
      console.error('Erreur lors de la suppression du groupe sauvegardé:', error);
    }
  };

  const handleAddressCreated = async (groupe?: Groupe) => {
    if (groupe) {
      // Récupérer le groupe complet depuis l'API pour avoir toutes les données
      const fullGroupe = await fetchGroupeById(groupe.id);
      if (fullGroupe) {
        setCreatedGroupe(fullGroupe);
        // Sauvegarder l'ID du groupe dans AsyncStorage
        await saveGroupeId(fullGroupe.id);
      } else {
        // Si la récupération échoue, utiliser le groupe de base
        setCreatedGroupe(groupe);
        await saveGroupeId(groupe.id);
      }
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedView style={styles.headerRow}>
          <ThemedView style={styles.titleSection}>
            <ThemedText type="title">Welcome!</ThemedText>
            <HelloWave />
          </ThemedView>
          {authToken && currentUserPseudo && (
            <ThemedView style={styles.authSection}>
              <ThemedText style={styles.userInfo}>
                Connecté: {currentUserPseudo}
              </ThemedText>
              <Button
                title="Déconnexion"
                onPress={handleLogout}
                color="#ff3b30"
              />
            </ThemedView>
          )}
        </ThemedView>
      </ThemedView>

      {createdGroupe ? (
        <ThemedView style={styles.groupeContainer}>
          <GroupeItem
            groupe={createdGroupe}
            authToken={authToken}
            currentUserId={currentUserId}
            allCompetences={allCompetences}
            groupes={allGroupes}
            addedCompetenceIds={addedCompetenceIds}
            onUpdate={handleUpdate}
            onAllCompetencesUpdate={handleAllCompetencesUpdate}
            onAddedCompetenceIdsUpdate={setAddedCompetenceIds}
          />
          <Button
            title="Créer une autre adresse"
            onPress={async () => {
              setCreatedGroupe(null);
              await clearSavedGroupeId();
            }}
            color="#007AFF"
          />
        </ThemedView>
      ) : (
        <CreateAddressForm onAddressCreated={handleAddressCreated} />
      )}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  authSection: {
    gap: 8,
    alignItems: 'flex-end',
  },
  userInfo: {
    fontSize: 12,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  groupeContainer: {
    gap: 12,
    marginBottom: 16,
  },
});
