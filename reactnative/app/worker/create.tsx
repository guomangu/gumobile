import { StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getApiUrl, API_ENDPOINTS, getCompetences, type Competence as CompetenceApi } from '@/constants/api';
import { type Competence } from '@/components/types';
import { proposeCompetencesFromDemande, proposeNewWordsFromDemande } from '@/components/competence-utils';
import { TouchableOpacity } from 'react-native';

export default function CreateWorkerScreen() {
  const router = useRouter();
  const [demandeTexte, setDemandeTexte] = useState('');
  const [competenceNom, setCompetenceNom] = useState('');
  const [loadingDemande, setLoadingDemande] = useState(false);
  const [loadingCompetence, setLoadingCompetence] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [allCompetences, setAllCompetences] = useState<CompetenceApi[]>([]);
  const [userDemande, setUserDemande] = useState<any | null>(null);
  const [demandeCompetences, setDemandeCompetences] = useState<Competence[]>([]);
  const [addedCompetenceIds, setAddedCompetenceIds] = useState<Set<number>>(new Set());
  const [locallyAddedCompetenceIds, setLocallyAddedCompetenceIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'icon');

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

  const fetchAllCompetences = useCallback(async () => {
    try {
      const data = await getCompetences();
      setAllCompetences(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des compétences:', error);
      setAllCompetences([]);
    }
  }, []);

  const fetchUserDemande = useCallback(async () => {
    if (!currentUserId || !authToken) {
      setLoading(false);
      return;
    }

    try {
      // Récupérer l'utilisateur avec ses demandes
      const response = await fetch(getApiUrl(`${API_ENDPOINTS.USERS}/${currentUserId}`), {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const userData = await response.json();
      const demandes = userData.demandes || [];
      
      if (demandes.length > 0) {
        const demande = demandes[0]; // Prendre la première demande
        setUserDemande(demande);
        setDemandeTexte(demande.texte || '');
        setDemandeCompetences(demande.competences || []);
      }
    } catch (error: any) {
      console.error('Erreur lors de la récupération de la demande:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, authToken]);

  useEffect(() => {
    loadAuthState();
    fetchAllCompetences();
  }, [loadAuthState, fetchAllCompetences]);

  useEffect(() => {
    if (currentUserId && authToken) {
      fetchUserDemande();
    } else {
      setLoading(false);
    }
  }, [currentUserId, authToken, fetchUserDemande]);

  useFocusEffect(
    useCallback(() => {
      loadAuthState();
    }, [loadAuthState])
  );

  const handleCreateDemande = async () => {
    if (!authToken || !currentUserId) {
      Alert.alert('Erreur', 'Vous devez être connecté pour créer votre présentation');
      router.replace('/(tabs)/login');
      return;
    }

    if (!demandeTexte.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre présentation');
      return;
    }

    setLoadingDemande(true);
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.DEMANDES), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          texte: demandeTexte.trim(),
          user: `/api/users/${currentUserId}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}: ${response.statusText}`);
      }

      const newDemande = await response.json();
      setUserDemande(newDemande);
      Alert.alert('Succès', 'Présentation créée avec succès !');
      fetchUserDemande();
    } catch (error: any) {
      console.error('Erreur lors de la création de la demande:', error);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue lors de la création de la présentation');
    } finally {
      setLoadingDemande(false);
    }
  };

  const handleCreateCompetence = async (nomCompetence?: string, competenceId?: number) => {
    if (!authToken || !currentUserId) {
      Alert.alert('Erreur', 'Vous devez être connecté');
      return;
    }

    if (!userDemande) {
      Alert.alert('Erreur', 'Vous devez d\'abord créer votre présentation');
      return;
    }

    const nom = nomCompetence || competenceNom.trim();
    if (!nom) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour la compétence');
      return;
    }

    const nomLower = nom.toLowerCase().trim();
    const existingInDemande = demandeCompetences.some(
      c => c.nom.toLowerCase().trim() === nomLower
    );

    if (existingInDemande) {
      Alert.alert('Erreur', 'Cette compétence existe déjà');
      return;
    }

    setLoadingCompetence(true);
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.COMPETENCES), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          nom: nom,
          demandes: [`/api/demandes/${userDemande.id}`],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}: ${response.statusText}`);
      }

      const newCompetence = await response.json();
      const addedId = competenceId || newCompetence.id;

      if (addedId) {
        setLocallyAddedCompetenceIds(prev => new Set([...prev, addedId]));
        setAddedCompetenceIds(prev => new Set([...prev, addedId]));
      }

      if (!nomCompetence) {
        Alert.alert('Succès', 'Compétence créée avec succès !');
      }
      
      setCompetenceNom('');
      fetchUserDemande();
      fetchAllCompetences();
      
      setTimeout(() => {
        setAddedCompetenceIds(new Set());
        setLocallyAddedCompetenceIds(new Set());
      }, 300);
    } catch (error: any) {
      console.error('Erreur lors de la création de la compétence:', error);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue lors de la création de la compétence');
    } finally {
      setLoadingCompetence(false);
    }
  };

  // Propositions de compétences basées sur le texte de la demande
  const proposedCompetences = useMemo(() => {
    if (!userDemande || !demandeTexte.trim()) return [];
    const allIds = new Set([...addedCompetenceIds, ...locallyAddedCompetenceIds]);
    return proposeCompetencesFromDemande(
      demandeTexte,
      demandeCompetences,
      undefined, // demandeGroupeId (pas de groupe pour un Worker)
      allCompetences,
      [], // groupes (pas de groupes pour un Worker)
      allIds
    );
  }, [demandeTexte, allCompetences, demandeCompetences, addedCompetenceIds, locallyAddedCompetenceIds, userDemande]);

  const proposedNewWords = useMemo(() => {
    if (!userDemande || !demandeTexte.trim()) return [];
    const allIds = new Set([...addedCompetenceIds, ...locallyAddedCompetenceIds]);
    return proposeNewWordsFromDemande(demandeTexte, demandeCompetences, allCompetences, allIds);
  }, [demandeTexte, allCompetences, demandeCompetences, addedCompetenceIds, locallyAddedCompetenceIds, userDemande]);

  if (loading) {
    return (
      <ParallaxScrollView headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}>
        <ThemedView style={styles.container} cloudStyle={false}>
          <ActivityIndicator size="large" color="#000000" />
          <ThemedText style={styles.loadingText}>Chargement...</ThemedText>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  if (!authToken || !currentUserId) {
    return (
      <ParallaxScrollView headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}>
        <ThemedView style={styles.container} cloudStyle={false}>
          <ThemedText type="title">Créer un Worker</ThemedText>
          <ThemedText style={styles.errorText}>
            Vous devez être connecté pour créer votre présentation
          </ThemedText>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.replace('/(tabs)/login')}
          >
            <ThemedText style={styles.loginButtonText}>Se connecter</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  return (
    <ParallaxScrollView headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}>
      <ThemedView style={styles.container} cloudStyle={false}>
        <ThemedText type="title">Créer un Worker</ThemedText>
        <ThemedText style={styles.subtitle}>
          Créez votre présentation et ajoutez vos compétences
        </ThemedText>

        {!userDemande ? (
          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionLabel}>Votre présentation</ThemedText>
            <TextInput
              style={[styles.input, { borderColor, color: textColor }]}
              placeholder="Décrivez-vous, vos expériences, vos compétences..."
              placeholderTextColor={textColor + '80'}
              value={demandeTexte}
              onChangeText={setDemandeTexte}
              multiline
              numberOfLines={6}
            />
            <TouchableOpacity
              style={[styles.button, (loadingDemande || !demandeTexte.trim()) && styles.buttonDisabled]}
              onPress={handleCreateDemande}
              disabled={loadingDemande || !demandeTexte.trim()}
            >
              <ThemedText style={styles.buttonText}>
                {loadingDemande ? 'Création...' : 'Créer ma présentation'}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : (
          <>
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionLabel}>Votre présentation</ThemedText>
              <ThemedView style={styles.demandeItem}>
                <ThemedText style={styles.demandeTexte}>{userDemande.texte}</ThemedText>
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionLabel}>Vos compétences</ThemedText>
              
              {demandeCompetences.length > 0 && (
                <ThemedView style={styles.competencesContainer}>
                  {demandeCompetences.map((competence) => (
                    <ThemedView key={competence.id} style={styles.competenceTag}>
                      <ThemedText style={styles.competenceTagText}>{competence.nom}</ThemedText>
                    </ThemedView>
                  ))}
                </ThemedView>
              )}

              <TextInput
                style={[styles.input, { borderColor, color: textColor }]}
                placeholder="Ajouter une compétence..."
                placeholderTextColor={textColor + '80'}
                value={competenceNom}
                onChangeText={setCompetenceNom}
              />
              <TouchableOpacity
                style={[styles.button, (loadingCompetence || !competenceNom.trim()) && styles.buttonDisabled]}
                onPress={() => handleCreateCompetence()}
                disabled={loadingCompetence || !competenceNom.trim()}
              >
                <ThemedText style={styles.buttonText}>
                  {loadingCompetence ? 'Ajout...' : 'Ajouter la compétence'}
                </ThemedText>
              </TouchableOpacity>

              {proposedCompetences.length > 0 && (
                <ThemedView style={styles.proposedContainer}>
                  <ThemedText style={styles.proposedLabel}>Compétences suggérées:</ThemedText>
                  <ThemedView style={styles.proposedTags}>
                    {proposedCompetences.map((competence: CompetenceApi) => (
                      <TouchableOpacity
                        key={competence.id}
                        style={styles.proposedTag}
                        onPress={() => handleCreateCompetence(competence.nom, competence.id)}
                      >
                        <ThemedText style={styles.proposedTagText}>{competence.nom}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ThemedView>
                </ThemedView>
              )}

              {proposedNewWords.length > 0 && (
                <ThemedView style={styles.proposedContainer}>
                  <ThemedText style={styles.proposedLabel}>Mots-clés suggérés:</ThemedText>
                  <ThemedView style={styles.proposedTags}>
                    {proposedNewWords.map((word: string, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.proposedNewWordTag}
                        onPress={() => handleCreateCompetence(word)}
                      >
                        <ThemedText style={styles.proposedNewWordTagText}>{word}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ThemedView>
                </ThemedView>
              )}
            </ThemedView>
          </>
        )}
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
  subtitle: {
    fontSize: 16,
    opacity: 0.8,
    marginBottom: 8,
  },
  section: {
    gap: 12,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
    marginBottom: 8,
    paddingBottom: 4,
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    margin: 5,
  },
  button: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    margin: 5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  demandeItem: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    margin: 5,
  },
  demandeTexte: {
    fontSize: 14,
    lineHeight: 20,
  },
  competencesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  competenceTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  competenceTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000000',
  },
  proposedContainer: {
    marginTop: 12,
    gap: 8,
  },
  proposedLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
    marginBottom: 8,
  },
  proposedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  proposedTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderStyle: 'dashed',
  },
  proposedTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000000',
  },
  proposedNewWordTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,149,0,0.1)',
    borderStyle: 'dashed',
  },
  proposedNewWordTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000000',
  },
  errorText: {
    fontSize: 14,
    color: '#ff3b30',
    marginTop: 12,
    marginBottom: 20,
  },
  loginButton: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

