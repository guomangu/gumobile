import { Image } from 'expo-image';
import { StyleSheet, Alert } from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { authEvents, AUTH_EVENTS } from '@/utils/authEvents';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CreateAddressForm } from '@/components/CreateAddressForm';
import { MenuBurger } from '@/components/MenuBurger';
import { getApiUrl, API_ENDPOINTS, getCompetences, type Competence as CompetenceApi } from '@/constants/api';
import { type Groupe } from '@/components/types';
import { GroupeItem } from '@/components/GroupeItem';

export default function HomeScreen() {
  const router = useRouter();
  
  // États pour l'authentification
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUserPseudo, setCurrentUserPseudo] = useState<string | null>(null);
  
  // États pour le groupe créé
  const [groupeCree, setGroupeCree] = useState<Groupe | null>(null);
  const [allCompetences, setAllCompetences] = useState<CompetenceApi[]>([]);
  const [addedCompetenceIds, setAddedCompetenceIds] = useState<Set<number>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  // État pour stocker tous les groupes (pour améliorer l'autocomplétion)
  const [allGroupes, setAllGroupes] = useState<Groupe[]>([]);

  // Définir fetchGroupeComplet avant les autres fonctions qui l'utilisent
  const fetchGroupeComplet = useCallback(async (groupeId: number): Promise<Groupe | null> => {
    try {
      console.log('[fetchGroupeComplet] Chargement du groupe ID:', groupeId);
      const url = getApiUrl(`${API_ENDPOINTS.GROUPES}/${groupeId}`);
      console.log('[fetchGroupeComplet] URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('[fetchGroupeComplet] Status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('[fetchGroupeComplet] Erreur réponse:', response.status, errorText);
        
        // Si c'est une erreur 500, essayer de récupérer le groupe depuis la liste
        if (response.status === 500) {
          console.warn('[fetchGroupeComplet] Erreur 500, tentative de récupération depuis la liste des groupes');
          try {
            const listResponse = await fetch(getApiUrl(API_ENDPOINTS.GROUPES), {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
            });
            if (listResponse.ok) {
              const listData = await listResponse.json();
              const groupesList = listData['hydra:member'] || listData || [];
              const groupe = Array.isArray(groupesList) 
                ? groupesList.find((g: Groupe) => g.id === groupeId)
                : null;
              if (groupe) {
                console.log('[fetchGroupeComplet] Groupe trouvé dans la liste:', groupe);
                // S'assurer que le groupe a la bonne structure
                return {
                  id: groupe.id,
                  nom: groupe.nom,
                  demandes: groupe.demandes || [],
                  users: groupe.usersData || groupe.users || [],
                  usersData: groupe.usersData || groupe.users || [],
                  adresses: groupe.adresses || [],
                };
              } else {
                console.warn('[fetchGroupeComplet] Groupe non trouvé dans la liste, ID recherché:', groupeId);
              }
            }
          } catch (listError) {
            console.error('[fetchGroupeComplet] Erreur lors de la récupération depuis la liste:', listError);
          }
        }
        
        throw new Error(`Erreur ${response.status}: ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      console.log('[fetchGroupeComplet] Données reçues:', data);
      return {
        id: data.id,
        nom: data.nom,
        demandes: data.demandes || [],
        users: data.usersData || data.users || [],
        usersData: data.usersData || data.users || [],
        adresses: data.adresses || [],
      };
    } catch (error: any) {
      console.error('[fetchGroupeComplet] Erreur complète:', error);
      console.error('[fetchGroupeComplet] Message:', error.message);
      return null;
    }
  }, []);

  const saveGroupeCree = useCallback(async (groupeId: number) => {
    try {
      console.log('[saveGroupeCree] Sauvegarde du groupe ID:', groupeId);
      await AsyncStorage.setItem('groupeCreeId', groupeId.toString());
      console.log('[saveGroupeCree] Groupe sauvegardé avec succès');
    } catch (error) {
      console.error('[saveGroupeCree] Erreur:', error);
    }
  }, []);

  const loadGroupeCree = useCallback(async () => {
    try {
      console.log('[loadGroupeCree] Chargement du groupe depuis AsyncStorage');
      const groupeIdStr = await AsyncStorage.getItem('groupeCreeId');
      console.log('[loadGroupeCree] ID trouvé:', groupeIdStr);
      if (groupeIdStr) {
        const groupeId = parseInt(groupeIdStr, 10);
        if (!isNaN(groupeId)) {
          const groupe = await fetchGroupeComplet(groupeId);
          if (groupe) {
            console.log('[loadGroupeCree] Groupe chargé:', groupe);
            setGroupeCree(groupe);
          } else {
            console.warn('[loadGroupeCree] Impossible de charger le groupe complet');
          }
        } else {
          console.error('[loadGroupeCree] ID invalide:', groupeIdStr);
        }
      } else {
        console.log('[loadGroupeCree] Aucun groupe sauvegardé');
      }
    } catch (error) {
      console.error('[loadGroupeCree] Erreur:', error);
    }
  }, [fetchGroupeComplet]);

  const loadAuthToken = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userPseudo = await AsyncStorage.getItem('userPseudo');
      if (token) {
        setAuthToken(token);
      } else {
        setAuthToken(null);
      }
      if (userPseudo) {
        setCurrentUserPseudo(userPseudo);
      } else {
        setCurrentUserPseudo(null);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du token:', error);
    }
  }, []);

  const loadUserId = useCallback(async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        setCurrentUserId(parseInt(userId, 10));
      } else {
        setCurrentUserId(null);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'ID utilisateur:', error);
    }
  }, []);

  const fetchAllCompetences = useCallback(async () => {
    try {
      const data = await getCompetences();
      setAllCompetences(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des compétences:', error);
      setAllCompetences([]);
    }
  }, []);

  const fetchAllGroupes = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadAuthToken();
    loadUserId();
    fetchAllCompetences();
    fetchAllGroupes();
    loadGroupeCree();
  }, [loadGroupeCree, loadAuthToken, loadUserId, fetchAllCompetences, fetchAllGroupes]);

  // Écouter les événements d'authentification pour rafraîchir automatiquement
  useEffect(() => {
    const handleAuthChange = async () => {
      await loadAuthToken();
      await loadUserId();
      // Rafraîchir les groupes et le groupe créé si nécessaire
      await fetchAllGroupes();
      if (groupeCree) {
        const groupe = await fetchGroupeComplet(groupeCree.id);
        if (groupe) {
          setGroupeCree(groupe);
        }
      }
    };

    authEvents.on(AUTH_EVENTS.LOGIN, handleAuthChange);
    authEvents.on(AUTH_EVENTS.LOGOUT, handleAuthChange);

    return () => {
      authEvents.off(AUTH_EVENTS.LOGIN, handleAuthChange);
      authEvents.off(AUTH_EVENTS.LOGOUT, handleAuthChange);
    };
  }, [loadAuthToken, loadUserId, groupeCree, fetchGroupeComplet, fetchAllGroupes]);

  // Rafraîchir le groupe et l'état d'authentification quand on revient sur la page
  useFocusEffect(
    useCallback(() => {
      loadGroupeCree();
      loadAuthToken();
      loadUserId();
      fetchAllGroupes();
    }, [loadGroupeCree, loadAuthToken, loadUserId, fetchAllGroupes])
  );


  const handleUpdateGroupe = useCallback(async () => {
    if (groupeCree) {
      const groupe = await fetchGroupeComplet(groupeCree.id);
      if (groupe) {
        setGroupeCree(groupe);
      }
    }
    fetchAllCompetences();
    fetchAllGroupes();
  }, [groupeCree, fetchGroupeComplet, fetchAllCompetences, fetchAllGroupes]);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('userPseudo');
      setAuthToken(null);
      setCurrentUserPseudo(null);
      setCurrentUserId(null);
      Alert.alert('Déconnexion', 'Vous avez été déconnecté avec succès');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la déconnexion');
    }
  };

  const handleAddressCreated = useCallback(async (groupe?: Groupe) => {
    // Afficher le groupe créé sur la page home
    if (groupe) {
      console.log('[handleAddressCreated] Groupe reçu:', groupe);
      // Sauvegarder l'ID du groupe
      await saveGroupeCree(groupe.id);
      // Charger le groupe complet depuis l'API
      const groupeComplet = await fetchGroupeComplet(groupe.id);
      if (groupeComplet) {
        console.log('[handleAddressCreated] Groupe complet chargé:', groupeComplet);
        setGroupeCree(groupeComplet);
      } else {
        console.warn('[handleAddressCreated] Impossible de charger le groupe complet, utilisation des données de base');
        // Si le chargement échoue, utiliser les données de base
        setGroupeCree({
          id: groupe.id,
          nom: groupe.nom,
          demandes: [],
        });
      }
      // Rafraîchir la liste de tous les groupes pour améliorer l'autocomplétion
      fetchAllGroupes();
    }
  }, [saveGroupeCree, fetchGroupeComplet, fetchAllGroupes]);

  // Combiner tous les groupes avec le groupe créé pour améliorer l'autocomplétion
  const combinedGroupes = useMemo(() => {
    if (!groupeCree) return allGroupes;
    const groupesMap = new Map(allGroupes.map(g => [g.id, g]));
    // S'assurer que le groupe créé est inclus
    if (!groupesMap.has(groupeCree.id)) {
      return [...allGroupes, groupeCree];
    }
    return allGroupes;
  }, [allGroupes, groupeCree]);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>


        <ThemedView style={styles.groupeContainer} cloudStyle={false}>
          <CreateAddressForm onAddressCreated={handleAddressCreated} />
        </ThemedView>

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
    marginTop: 20,
    padding: 0,
    gap: 0,
  },
});
