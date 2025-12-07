import { StyleSheet, TextInput, Alert, TouchableOpacity, Pressable, Platform, Button, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getApiUrl, API_ENDPOINTS, getCompetences, importAddress, reverseGeocode, type Competence as CompetenceApi, type BanAddressResult, type Adresse } from '@/constants/api';
import { type Competence, type Groupe } from '@/components/types';
import { proposeCompetencesFromDemande, proposeNewWordsFromDemande } from '@/components/competence-utils';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { AddressTag } from './AddressTag';
import { authEvents, AUTH_EVENTS } from '@/utils/authEvents';

interface WorkerFormProps {
  onUpdate?: () => void;
}

export function WorkerForm({ onUpdate }: WorkerFormProps) {
  const router = useRouter();
  // États du formulaire de demande
  const [demandeTexte, setDemandeTexte] = useState('');
  const [competenceNom, setCompetenceNom] = useState('');
  
  // États d'authentification et utilisateur
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [userDemande, setUserDemande] = useState<any | null>(null);
  
  // États pour les données locales (mode déconnecté / tunnel)
  const [localCompetences, setLocalCompetences] = useState<{nom: string, id?: number}[]>([]);
  const [authMail, setAuthMail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  
  // États de chargement
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  
  // États de données API
  const [allCompetences, setAllCompetences] = useState<CompetenceApi[]>([]);
  const [allGroupes, setAllGroupes] = useState<Groupe[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<BanAddressResult | null>(null);
  const [createdAddresses, setCreatedAddresses] = useState<Adresse[]>([]);
  const [initialAddress, setInitialAddress] = useState<BanAddressResult | null>(null);
  
  const hasRequestedLocation = useRef(false);

  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'icon');

  // Gestion des erreurs API
  const handleApiError = (error: any) => {
    console.error('API Error:', error);
    const errorMessage = error.message || '';
    
    if (errorMessage.includes('401') || errorMessage.includes('Expired JWT Token')) {
      Alert.alert(
        'Session expirée',
        'Votre session a expiré. Veuillez vous reconnecter.',
        [
          { 
            text: 'Se reconnecter', 
            onPress: () => {
              authEvents.emit(AUTH_EVENTS.LOGOUT);
            }
          }
        ]
      );
    } else {
      Alert.alert('Erreur', errorMessage || 'Une erreur est survenue');
    }
  };

  // Chargement de l'état d'authentification
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
      console.error('Erreur auth load:', error);
    }
  }, []);

  // Chargement des compétences globales
  const fetchAllCompetences = useCallback(async () => {
    try {
      const data = await getCompetences();
      setAllCompetences(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Erreur fetch competences:', error);
      setAllCompetences([]);
    }
  }, []);

  // Chargement des groupes (pour les suggestions par association)
  const fetchAllGroupes = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.GROUPES), {
        headers: { 'Accept': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        const groupes = data['hydra:member'] || data || [];
        setAllGroupes(Array.isArray(groupes) ? groupes : []);
      }
    } catch (error) {
      console.error('Erreur fetch groupes:', error);
    }
  }, []);

  // Chargement de la demande utilisateur existante
  const fetchUserDemande = useCallback(async () => {
    if (!currentUserId || !authToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(getApiUrl(`${API_ENDPOINTS.USERS}/${currentUserId}`), {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) throw new Error(`Erreur ${response.status}`);

      const userData = await response.json();
      const demandes = userData.demandes || [];
      
      if (demandes.length > 0) {
        let demande = demandes[0];
        
        // Gestion IRI
        if (typeof demande === 'string') {
          const demandeId = demande.split('/').pop();
          if (demandeId) {
             const resp = await fetch(getApiUrl(`${API_ENDPOINTS.DEMANDES}/${demandeId}`), {
               headers: { 'Authorization': `Bearer ${authToken}` }
             });
             if (resp.ok) demande = await resp.json();
          }
        }

        if (typeof demande === 'object' && demande !== null) {
            setUserDemande(demande);
            setDemandeTexte(demande.texte || '');
            // Convertir les compétences existantes au format local pour l'affichage unifié
            const existingComps = (demande.competences || []).map((c: any) => ({
                nom: c.nom,
                id: c.id
            }));
            setLocalCompetences(existingComps);
            
            // Si le groupe de la demande a une adresse, on pourrait essayer de la pré-remplir
            // Mais c'est complexe à mapper vers BanAddressResult sans reverse geocoding
        }
      }
    } catch (error: any) {
      console.error('Erreur fetch user demande:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, authToken]);

  useEffect(() => {
    loadAuthState();
    fetchAllCompetences();
    fetchAllGroupes();
  }, [loadAuthState, fetchAllCompetences, fetchAllGroupes]);

  useEffect(() => {
    // Désactivation du chargement automatique des données existantes sur la home page
    /*
    if (currentUserId && authToken) {
      fetchUserDemande();
    } else {
      setLoading(false);
    }
    */
    setLoading(false);
  }, [currentUserId, authToken, fetchUserDemande]);

  // Géolocalisation initiale
  useEffect(() => {
    const requestLocation = async () => {
      if (hasRequestedLocation.current) return;
      hasRequestedLocation.current = true;

      try {
        setLoadingLocation(true);
        let latitude: number;
        let longitude: number;

        if (Platform.OS === 'web') {
          if (!navigator.geolocation) {
            setLoadingLocation(false);
            return;
          }
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } else {
            // Logique mobile simplifiée pour l'exemple
             const Location = await import('expo-location');
             const { status } = await Location.requestForegroundPermissionsAsync();
             if (status !== 'granted') {
                 setLoadingLocation(false);
                 return;
             }
             const location = await Location.getCurrentPositionAsync({});
             latitude = location.coords.latitude;
             longitude = location.coords.longitude;
        }

        const address = await reverseGeocode(latitude, longitude);
        if (address) {
          setInitialAddress(address);
          setSelectedAddress(address);
        }
      } catch (error) {
        console.error('Erreur localisation:', error);
      } finally {
        setLoadingLocation(false);
      }
    };
    requestLocation();
  }, []);

  const handleSelectAddress = (address: BanAddressResult) => {
    setSelectedAddress(address);
  };

  // Ajout de compétence (Local ou Direct si connecté - pour l'instant on fait tout en local avant validation finale pour le mode tunnel)
  // En fait, si connecté, on peut garder le comportement "Direct".
  // Mais pour simplifier l'UX "Tunnel", on va tout traiter comme "Local" jusqu'au clic sur "Valider".
  // SAUF si l'utilisateur est déjà connecté et édite une demande existante.
  
  const handleAddCompetence = (nom: string, id?: number) => {
    const trimmedNom = (nom || '').trim();
    if (!trimmedNom) return;

    // Vérifier doublon local
    if (localCompetences.some(c => (c.nom || '').toLowerCase() === trimmedNom.toLowerCase())) {
        Alert.alert('Info', 'Cette compétence est déjà ajoutée');
        return;
    }

    setLocalCompetences(prev => [...prev, { nom: trimmedNom, id }]);
    setCompetenceNom('');
  };

  const handleRemoveCompetence = (index: number) => {
      setLocalCompetences(prev => prev.filter((_, i) => i !== index));
  };

  // Logique principale de soumission (Tunnel)
  const handleGlobalSubmit = async () => {
    console.log('[WorkerForm] handleGlobalSubmit appelée');
    console.log('[WorkerForm] selectedAddress:', selectedAddress?.label);
    console.log('[WorkerForm] demandeTexte:', demandeTexte);
    console.log('[WorkerForm] authToken:', authToken ? 'présent' : 'absent');
    
    if (!selectedAddress) {
        const msg = 'Veuillez sélectionner une adresse';
        Platform.OS === 'web' ? alert(msg) : Alert.alert('Erreur', msg);
        return;
    }
    const safeTexte = demandeTexte || '';
    if (!safeTexte.trim()) {
        const msg = 'Veuillez décrire votre demande';
        Platform.OS === 'web' ? alert(msg) : Alert.alert('Erreur', msg);
        return;
    }
    
    // Validation Auth si non connecté
    const safeMail = authMail || '';
    const safePassword = authPassword || '';
    
    if (!authToken && (!safeMail.trim() || !safePassword.trim())) {
        const msg = 'Veuillez entrer votre email et mot de passe';
        Platform.OS === 'web' ? alert(msg) : Alert.alert('Erreur', msg);
        return;
    }

    setLoadingAction(true);
    let finalAuthToken = authToken;
    let finalUserId = currentUserId;

    try {
        // 1. Auth (connexion ou création automatique via /api/auth)
        if (!finalAuthToken) {
            const authResponse = await fetch(getApiUrl('auth'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ mail: safeMail.trim(), password: safePassword.trim() }),
            });
            
            const authData = await authResponse.json();
            
            if (!authResponse.ok) {
                throw new Error(authData.error || 'Erreur d\'authentification');
            }
            
            if (authData.token && authData.user?.id) {
                finalAuthToken = authData.token;
                finalUserId = authData.user.id;
                
                await AsyncStorage.setItem('authToken', finalAuthToken!);
                await AsyncStorage.setItem('userId', finalUserId!.toString());
                await AsyncStorage.setItem('userMail', authData.user.mail);
                authEvents.emit(AUTH_EVENTS.LOGIN);
                console.log('[WorkerForm] Authentification réussie, userId:', finalUserId);
            } else {
                throw new Error('Réponse d\'authentification invalide');
            }
        }

        // 2. Création de l'adresse (et Groupe)
        const newAddress = await importAddress(selectedAddress.label, undefined, 'DEMANDE');
        const groupeId = newAddress.groupe?.id;
        
        // 3. Création de la demande
        const demandeResponse = await fetch(getApiUrl(API_ENDPOINTS.DEMANDES), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${finalAuthToken}`,
            },
            body: JSON.stringify({
                texte: safeTexte.trim(),
                user: `/api/users/${finalUserId}`,
                groupe: `/api/groupes/${groupeId}`,
            }),
        });

        if (!demandeResponse.ok) {
            const errorText = await demandeResponse.text();
            throw new Error(`Erreur création demande: ${demandeResponse.status} ${errorText}`);
        }
        const newDemande = await demandeResponse.json();
        const demandeId = newDemande.id || parseInt(newDemande['@id']?.split('/').pop() || '0');

        if (!demandeId) throw new Error('ID de demande introuvable');

        // 4. Création/Liaison des compétences
        // On traite localCompetences
        for (const comp of localCompetences) {
            // Si la compétence a déjà un ID (sélectionnée depuis la liste globale), on la lie juste ?
            // L'API POST /competences avec "nom" existant et "demandes" va gérer la liaison (via CompetenceUniqueValidator)
            // Donc on envoie toujours POST.
            
            await fetch(getApiUrl(API_ENDPOINTS.COMPETENCES), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${finalAuthToken}`,
                },
                body: JSON.stringify({
                    nom: comp.nom,
                    demandes: [`/api/demandes/${demandeId}`],
                }),
            });
        }

        // Redirection vers la page du groupe nouvellement créé
        router.push({
            pathname: '/groupe/[id]',
            params: {
                id: groupeId
            }
        });
        
        // Rafraichir
        setAuthToken(finalAuthToken);
        setCurrentUserId(finalUserId);
        setLocalCompetences([]); // Ou recharger depuis le serveur
        if (onUpdate) onUpdate();
        fetchUserDemande();

    } catch (error: any) {
        handleApiError(error);
    } finally {
        setLoadingAction(false);
    }
  };

  const safeCompetenceNom = competenceNom || '';
  // 1. Suggestions basées sur la saisie directe (Globales)
  const filteredGlobalCompetences = useMemo(() => {
    if (!safeCompetenceNom.trim()) return [];
    const searchLower = safeCompetenceNom.toLowerCase().trim();
    const alreadyAdded = new Set(localCompetences.map(c => (c.nom || '').toLowerCase()));
    
    return allCompetences.filter(c => 
      (c.nom || '').toLowerCase().includes(searchLower) && 
      !alreadyAdded.has((c.nom || '').toLowerCase())
    ).slice(0, 5);
  }, [safeCompetenceNom, allCompetences, localCompetences]);

  // 2. Suggestions basées sur le texte de la présentation (Compétences existantes détectées)
  const textBasedCompetences = useMemo(() => {
    const safeTexte = demandeTexte || '';
    if (!safeTexte.trim()) return [];
    
    const addedIds = new Set(localCompetences.map(c => c.id).filter((id): id is number => id !== undefined));
    
    // Mock pour l'utilitaire qui attend une structure spécifique
    const currentCompetences = localCompetences.map(c => ({ id: c.id || 0, nom: c.nom || '', demandes: [] }));

    return proposeCompetencesFromDemande(
        safeTexte,
        currentCompetences,
        undefined,
        allCompetences,
        [],
        addedIds
    );
  }, [demandeTexte, localCompetences, allCompetences]);

  // 3. Suggestions de nouveaux mots extraits du texte (Tags potentiels)
  const proposedNewWords = useMemo(() => {
    const safeTexte = demandeTexte || '';
    if (!safeTexte.trim()) return [];
    
    const addedIds = new Set(localCompetences.map(c => c.id).filter((id): id is number => id !== undefined));
    const addedNames = new Set(localCompetences.map(c => (c.nom || '').toLowerCase()));

    const currentCompetences = localCompetences.map(c => ({ id: c.id || 0, nom: c.nom || '', demandes: [] }));

    const suggestions = proposeNewWordsFromDemande(
        safeTexte,
        currentCompetences,
        allCompetences,
        addedIds
    );

    // Filtrer ce qui est déjà ajouté par nom
    return suggestions.filter(word => !addedNames.has(word.toLowerCase()));
  }, [demandeTexte, localCompetences, allCompetences]);

  // 4. Suggestions par association (Compétences présentes dans les mêmes groupes)
  const associatedCompetences = useMemo(() => {
    if (localCompetences.length === 0 || allGroupes.length === 0) return [];

    const addedIds = new Set(localCompetences.map(c => c.id).filter((id): id is number => id !== undefined));
    const addedNames = new Set(localCompetences.map(c => (c.nom || '').toLowerCase()));
    const suggestedIds = new Set<number>();
    const suggestions: CompetenceApi[] = [];

    // Pour chaque groupe
    allGroupes.forEach(groupe => {
      // Vérifier si ce groupe contient au moins une de nos compétences ajoutées
      const groupeCompetences = (groupe.demandes || []).flatMap(d => d.competences || []);
      const hasCommonCompetence = groupeCompetences.some(c => 
        (c.id && addedIds.has(c.id)) || (c.nom && addedNames.has(c.nom.toLowerCase()))
      );

      if (hasCommonCompetence) {
        // Si oui, ajouter toutes les autres compétences de ce groupe
        groupeCompetences.forEach(c => {
          if (c.id && !addedIds.has(c.id) && !suggestedIds.has(c.id) && !addedNames.has((c.nom || '').toLowerCase())) {
            suggestedIds.add(c.id);
            suggestions.push({ id: c.id, nom: c.nom || '' });
          }
        });
      }
    });

    return suggestions.slice(0, 10); // Limiter à 10 suggestions
  }, [localCompetences, allGroupes]);


  if (loading) return <ActivityIndicator size="large" />;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Je veux travailler</ThemedText>
      
      {/* 1. Adresse */}
      <ThemedView style={[styles.section, { zIndex: 1000 }]}>
        <ThemedText style={styles.sectionLabel}>1. Votre adresse</ThemedText>
        {loadingLocation && <ThemedText>Localisation en cours...</ThemedText>}
        <AddressAutocomplete
          onSelectAddress={handleSelectAddress}
          placeholder="Rechercher une adresse..."
          initialValue={selectedAddress || initialAddress}
        />
      </ThemedView>

      {/* 2. Présentation */}
      <ThemedView style={[styles.section, { zIndex: 1 }]}>
        <ThemedText style={styles.sectionLabel}>2. Votre présentation</ThemedText>
        <TextInput
            style={[styles.input, { borderColor, color: textColor, height: 100 }]}
            placeholder="Décrivez-vous, vos expériences..."
            placeholderTextColor={textColor + '80'}
            value={demandeTexte}
            onChangeText={setDemandeTexte}
            multiline
            numberOfLines={4}
        />
      </ThemedView>

      {/* 3. Compétences */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionLabel}>3. Vos compétences</ThemedText>
        
        <ThemedView style={styles.competencesContainer}>
            {localCompetences.map((comp, index) => (
                <TouchableOpacity key={index} onPress={() => handleRemoveCompetence(index)} style={styles.competenceTag}>
                    <ThemedText style={styles.competenceTagText}>{comp.nom} ✕</ThemedText>
                </TouchableOpacity>
            ))}
        </ThemedView>

        {/* Suggestions issues du texte (Base de données) */}
        {textBasedCompetences.length > 0 && (
            <ThemedView style={styles.suggestionsSection}>
                <ThemedText style={styles.suggestionLabel}>Suggestions (détectées):</ThemedText>
                <ThemedView style={styles.proposedTags}>
                    {textBasedCompetences.map(c => (
                        <TouchableOpacity key={c.id} style={styles.proposedTag} onPress={() => handleAddCompetence(c.nom, c.id)}>
                            <ThemedText style={styles.proposedTagText}>{c.nom}</ThemedText>
                        </TouchableOpacity>
                    ))}
                </ThemedView>
            </ThemedView>
        )}

        {/* Suggestions issues du texte (Nouveaux mots) */}
        {proposedNewWords.length > 0 && (
            <ThemedView style={styles.suggestionsSection}>
                <ThemedText style={styles.suggestionLabel}>Mots-clés (nouveaux):</ThemedText>
                <ThemedView style={styles.proposedTags}>
                    {proposedNewWords.map((word, index) => (
                        <TouchableOpacity key={`new-${index}`} style={[styles.proposedTag, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]} onPress={() => handleAddCompetence(word)}>
                            <ThemedText style={styles.proposedTagText}>{word}</ThemedText>
                        </TouchableOpacity>
                    ))}
                </ThemedView>
            </ThemedView>
        )}

        {/* Suggestions par association (Groupes similaires) */}
        {associatedCompetences.length > 0 && (
            <ThemedView style={styles.suggestionsSection}>
                <ThemedText style={styles.suggestionLabel}>Souvent associé avec vos compétences :</ThemedText>
                <ThemedView style={styles.proposedTags}>
                    {associatedCompetences.map(c => (
                        <TouchableOpacity key={`assoc-${c.id}`} style={[styles.proposedTag, { backgroundColor: 'rgba(175, 82, 222, 0.1)' }]} onPress={() => handleAddCompetence(c.nom, c.id)}>
                            <ThemedText style={styles.proposedTagText}>{c.nom}</ThemedText>
                        </TouchableOpacity>
                    ))}
                </ThemedView>
            </ThemedView>
        )}

        <TextInput
            style={[styles.input, { borderColor, color: textColor }]}
            placeholder="Ajouter une compétence..."
            placeholderTextColor={textColor + '80'}
            value={competenceNom}
            onChangeText={setCompetenceNom}
        />
        
        {/* Suggestions Globales (Saisie manuelle) */}
        {filteredGlobalCompetences.length > 0 && (
            <ThemedView style={styles.proposedTags}>
                {filteredGlobalCompetences.map(c => (
                    <TouchableOpacity key={c.id} style={styles.proposedTag} onPress={() => handleAddCompetence(c.nom, c.id)}>
                        <ThemedText style={styles.proposedTagText}>{c.nom}</ThemedText>
                    </TouchableOpacity>
                ))}
            </ThemedView>
        )}

        <TouchableOpacity 
            style={[styles.button, !(competenceNom || '').trim() && styles.buttonDisabled]} 
            onPress={() => handleAddCompetence(competenceNom)}
            disabled={!(competenceNom || '').trim()}
        >
            <ThemedText style={styles.buttonText}>Ajouter</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* 4. Compte & Validation */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionLabel}>4. Finalisation</ThemedText>
        
        {!authToken ? (
            <ThemedView style={styles.signupContainer}>
                <ThemedText style={styles.infoText}>Connectez-vous ou créez un compte avec votre email.</ThemedText>
                <TextInput
                    style={[styles.input, { borderColor, color: textColor }]}
                    placeholder="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={authMail}
                    onChangeText={setAuthMail}
                />
                <TextInput
                    style={[styles.input, { borderColor, color: textColor }]}
                    placeholder="Mot de passe"
                    secureTextEntry
                    value={authPassword}
                    onChangeText={setAuthPassword}
                />
            </ThemedView>
        ) : (
            <ThemedText style={styles.infoText}>✓ Vous êtes connecté</ThemedText>
        )}

        <Pressable 
            style={[styles.button, styles.validateButton, loadingAction && styles.buttonDisabled]}
            onPress={() => {
                console.log('=== BOUTON WORKER CLIQUÉ ===');
                handleGlobalSubmit();
            }}
            disabled={loadingAction}
        >
            {loadingAction ? (
                <ActivityIndicator color="white" />
            ) : (
                <ThemedText style={styles.buttonText}>
                    {authToken ? 'Voir les résultats' : 'Valider et voir les résultats'}
                </ThemedText>
            )}
        </Pressable>
      </ThemedView>

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 10,
  },
  button: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  validateButton: {
    backgroundColor: '#34C759', // Vert pour validation
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  competencesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  competenceTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
  },
  competenceTagText: {
    fontSize: 14,
    color: 'black',
  },
  proposedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  proposedTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  proposedTagText: {
    color: 'black',
  },
  signupContainer: {
    gap: 10,
  },
  infoText: {
    marginBottom: 10,
    fontStyle: 'italic',
  },
  suggestionsSection: {
    marginBottom: 8,
  },
  suggestionLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
    fontStyle: 'italic',
  },
});
