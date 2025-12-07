import { StyleSheet, Alert, Platform, TouchableOpacity, View, TextInput, ActivityIndicator } from 'react-native';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { importAddress, reverseGeocode, type BanAddressResult, type Adresse, getApiUrl, API_ENDPOINTS, getCompetences, type Competence as CompetenceApi } from '@/constants/api';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { type Groupe } from '@/components/types';
import { AddressTag } from './AddressTag';
import { authEvents, AUTH_EVENTS } from '@/utils/authEvents';
import { useThemeColor } from '@/hooks/use-theme-color';
import { proposeCompetencesFromDemande, proposeNewWordsFromDemande } from '@/components/competence-utils';

interface ProposeWorkFormProps {
  onAddressCreated: (groupe?: Groupe) => void;
}

export function ProposeWorkForm({ onAddressCreated }: ProposeWorkFormProps) {
  // États du formulaire
  const [demandeTexte, setDemandeTexte] = useState('');
  const [competenceNom, setCompetenceNom] = useState('');
  
  // États d'authentification
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
  // États locaux (Tunnel)
  const [localCompetences, setLocalCompetences] = useState<{nom: string, id?: number}[]>([]);
  const [signupPseudo, setSignupPseudo] = useState('');
  const [signupMail, setSignupMail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  
  // États API / Loading
  const [allCompetences, setAllCompetences] = useState<CompetenceApi[]>([]);
  const [allGroupes, setAllGroupes] = useState<Groupe[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<BanAddressResult | null>(null);
  const [initialAddress, setInitialAddress] = useState<BanAddressResult | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  
  const hasRequestedLocation = useRef(false);
  const textColor = useThemeColor({}, 'text');
  
  // Gestion des erreurs API
  const handleApiError = (error: any) => {
    console.error('API Error:', error);
    const errorMessage = error.message || '';
    if (errorMessage.includes('401') || errorMessage.includes('Expired JWT Token')) {
      Alert.alert('Session expirée', 'Veuillez vous reconnecter.', [
        { text: 'Se reconnecter', onPress: () => authEvents.emit(AUTH_EVENTS.LOGOUT) }
      ]);
    } else {
      Alert.alert('Erreur', errorMessage || 'Une erreur est survenue');
    }
  };

  // Initialisation Auth et Data
  useEffect(() => {
    const loadData = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const userId = await AsyncStorage.getItem('userId');
        setAuthToken(token);
        setCurrentUserId(userId ? parseInt(userId, 10) : null);
        
        const competencesData = await getCompetences();
        setAllCompetences(Array.isArray(competencesData) ? competencesData : []);

        const groupesResponse = await fetch(getApiUrl(API_ENDPOINTS.GROUPES), { headers: { 'Accept': 'application/json' } });
        if (groupesResponse.ok) {
            const data = await groupesResponse.json();
            setAllGroupes(data['hydra:member'] || data || []);
        }
      } catch (e) {
        console.error('Erreur chargement initial:', e);
      }
    };
    loadData();
  }, []);

  // Géolocalisation
  useEffect(() => {
    const requestLocation = async () => {
      if (hasRequestedLocation.current) return;
      hasRequestedLocation.current = true;
      setLoadingLocation(true);
      try {
        let latitude: number, longitude: number;
        if (Platform.OS === 'web') {
          if (!navigator.geolocation) { setLoadingLocation(false); return; }
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => 
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
          );
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
        } else {
             const Location = await import('expo-location');
             const { status } = await Location.requestForegroundPermissionsAsync();
             if (status !== 'granted') { setLoadingLocation(false); return; }
             const loc = await Location.getCurrentPositionAsync({});
             latitude = loc.coords.latitude;
             longitude = loc.coords.longitude;
        }
        const addr = await reverseGeocode(latitude, longitude);
        if (addr) {
            setInitialAddress(addr);
            setSelectedAddress(addr);
        }
      } catch (e) { console.error('Erreur geo:', e); }
      finally { setLoadingLocation(false); }
    };
    requestLocation();
  }, []);

  const handleSelectAddress = (address: BanAddressResult) => setSelectedAddress(address);

  const handleAddCompetence = (nom: string, id?: number) => {
    const trimmed = (nom || '').trim();
    if (!trimmed) return;
    if (localCompetences.some(c => (c.nom || '').toLowerCase() === trimmed.toLowerCase())) {
        Alert.alert('Info', 'Compétence déjà ajoutée');
        return;
    }
    setLocalCompetences(prev => [...prev, { nom: trimmed, id }]);
    setCompetenceNom('');
  };

  const handleRemoveCompetence = (index: number) => {
      setLocalCompetences(prev => prev.filter((_, i) => i !== index));
  };

  // Logique de validation finale
  const handleProposeTravail = async () => {
    if (!selectedAddress) { Alert.alert('Erreur', 'Veuillez sélectionner une adresse'); return; }
    const safeTexte = demandeTexte || '';
    if (!safeTexte.trim()) { Alert.alert('Erreur', 'Veuillez décrire le travail proposé'); return; }
    
    const safePseudo = signupPseudo || '';
    const safeMail = signupMail || '';
    const safePassword = signupPassword || '';

    if (!authToken && (!safePseudo.trim() || !safeMail.trim() || !safePassword.trim())) {
        Alert.alert('Erreur', 'Veuillez remplir les informations de création de compte');
        return;
    }

    setLoadingAction(true);
    let finalAuthToken = authToken;
    let finalUserId = currentUserId;

    try {
        // 1. Auth
        if (!finalAuthToken) {
            const signupResponse = await fetch(getApiUrl(API_ENDPOINTS.USERS), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ pseudo: safePseudo.trim(), password: safePassword.trim(), mail: safeMail.trim() }),
            });
            if (!signupResponse.ok) throw new Error('Erreur création compte');
            const signupData = await signupResponse.json();
            
            if (signupData.token && signupData.user?.id) {
                finalAuthToken = signupData.token;
                finalUserId = signupData.user.id;
            } else {
                // Fallback Login
                const loginResponse = await fetch(getApiUrl('login'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pseudo: safePseudo.trim(), password: safePassword.trim() }),
                });
                if (!loginResponse.ok) throw new Error('Compte créé mais échec connexion');
                const loginData = await loginResponse.json();
                finalAuthToken = loginData.token;
                finalUserId = loginData.user.id;
            }
            
            if (finalAuthToken && finalUserId) {
                await AsyncStorage.setItem('authToken', finalAuthToken);
                await AsyncStorage.setItem('userId', finalUserId.toString());
                authEvents.emit(AUTH_EVENTS.LOGIN);
            }
        }

        // 2. Création Groupe (Adresse)
        const newAddress = await importAddress(selectedAddress.label);
        const groupeId = newAddress.groupe?.id;
        if (!groupeId) throw new Error('Erreur création groupe adresse');

        // 3. Création Demande (liée au Groupe)
        const demandeResponse = await fetch(getApiUrl(API_ENDPOINTS.DEMANDES), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${finalAuthToken}` },
            body: JSON.stringify({
                texte: safeTexte.trim(),
                groupe: `/api/groupes/${groupeId}`,
                // Pas de user lié à la demande, car c'est la demande du GROUPE
            }),
        });
        if (!demandeResponse.ok) throw new Error('Erreur création demande');
        const newDemande = await demandeResponse.json();
        const demandeId = newDemande.id || parseInt(newDemande['@id']?.split('/').pop() || '0');

        // 4. Compétences
        for (const comp of localCompetences) {
            await fetch(getApiUrl(API_ENDPOINTS.COMPETENCES), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${finalAuthToken}` },
                body: JSON.stringify({ nom: comp.nom, demandes: [`/api/demandes/${demandeId}`] }),
            });
        }

        // 5. Ajouter l'utilisateur comme membre du groupe
        // On doit récupérer les groupes actuels de l'utilisateur et ajouter le nouveau
        const userResponse = await fetch(getApiUrl(`${API_ENDPOINTS.USERS}/${finalUserId}`), {
            headers: { 'Authorization': `Bearer ${finalAuthToken}`, 'Accept': 'application/json' }
        });
        if (userResponse.ok) {
            const userData = await userResponse.json();
            const currentGroupes = (userData.groupes || []).map((g: any) => typeof g === 'string' ? g : `/api/groupes/${g.id}`);
            const newGroupesList = [...currentGroupes, `/api/groupes/${groupeId}`];
            
            await fetch(getApiUrl(`${API_ENDPOINTS.USERS}/${finalUserId}`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/merge-patch+json', 'Authorization': `Bearer ${finalAuthToken}` },
                body: JSON.stringify({ groupes: newGroupesList })
            });
        }

        Alert.alert('Succès', 'Travail proposé avec succès !');
        
        // Callback vers le parent
        if (newAddress.groupe) {
             const groupeResult: Groupe = {
                id: newAddress.groupe.id,
                nom: newAddress.groupe.nom,
                adresses: newAddress.groupe.adresses?.map(addr => ({ id: addr.id, type: addr.type, valeur: addr.valeur })),
             };
             onAddressCreated(groupeResult);
        } else {
            onAddressCreated(undefined);
        }

    } catch (e: any) {
        handleApiError(e);
    } finally {
        setLoadingAction(false);
    }
  };

  // Suggestions
  const safeCompetenceNom = competenceNom || '';
  const filteredGlobalCompetences = useMemo(() => {
    if (!safeCompetenceNom.trim()) return [];
    const searchLower = safeCompetenceNom.toLowerCase().trim();
    const alreadyAdded = new Set(localCompetences.map(c => (c.nom || '').toLowerCase()));
    return allCompetences.filter(c => (c.nom || '').toLowerCase().includes(searchLower) && !alreadyAdded.has((c.nom || '').toLowerCase())).slice(0, 5);
  }, [safeCompetenceNom, allCompetences, localCompetences]);

  const textBasedCompetences = useMemo(() => {
    const safeTexte = demandeTexte || '';
    if (!safeTexte.trim()) return [];
    const addedIds = new Set(localCompetences.map(c => c.id).filter((id): id is number => id !== undefined));
    const currentComps = localCompetences.map(c => ({ id: c.id || 0, nom: c.nom || '', demandes: [] }));
    return proposeCompetencesFromDemande(safeTexte, currentComps, undefined, allCompetences, [], addedIds);
  }, [demandeTexte, localCompetences, allCompetences]);

  const proposedNewWords = useMemo(() => {
    const safeTexte = demandeTexte || '';
    if (!safeTexte.trim()) return [];
    const addedIds = new Set(localCompetences.map(c => c.id).filter((id): id is number => id !== undefined));
    const addedNames = new Set(localCompetences.map(c => (c.nom || '').toLowerCase()));
    const currentComps = localCompetences.map(c => ({ id: c.id || 0, nom: c.nom || '', demandes: [] }));
    const suggestions = proposeNewWordsFromDemande(safeTexte, currentComps, allCompetences, addedIds);
    return suggestions.filter(word => !addedNames.has(word.toLowerCase()));
  }, [demandeTexte, localCompetences, allCompetences]);

  const associatedCompetences = useMemo(() => {
    if (localCompetences.length === 0 || allGroupes.length === 0) return [];
    const addedIds = new Set(localCompetences.map(c => c.id).filter((id): id is number => id !== undefined));
    const addedNames = new Set(localCompetences.map(c => (c.nom || '').toLowerCase()));
    const suggestedIds = new Set<number>();
    const suggestions: CompetenceApi[] = [];
    allGroupes.forEach(groupe => {
      const groupeCompetences = (groupe.demandes || []).flatMap(d => d.competences || []);
      const hasCommon = groupeCompetences.some(c => (c.id && addedIds.has(c.id)) || (c.nom && addedNames.has(c.nom.toLowerCase())));
      if (hasCommon) {
        groupeCompetences.forEach(c => {
          if (c.id && !addedIds.has(c.id) && !suggestedIds.has(c.id) && !addedNames.has((c.nom || '').toLowerCase())) {
            suggestedIds.add(c.id);
            suggestions.push({ id: c.id, nom: c.nom || '' });
          }
        });
      }
    });
    return suggestions.slice(0, 10);
  }, [localCompetences, allGroupes]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Je propose un travail</ThemedText>
      
      {/* 1. Adresse */}
      <ThemedView style={[styles.section, { zIndex: 1000 }]}>
        <ThemedText style={styles.sectionLabel}>1. Adresse du chantier</ThemedText>
        {loadingLocation && <ThemedText>Localisation...</ThemedText>}
        <AddressAutocomplete
          onSelectAddress={handleSelectAddress}
          placeholder="Rechercher une adresse..."
          initialValue={selectedAddress || initialAddress}
        />
      </ThemedView>

      {/* 2. Description */}
      <ThemedView style={[styles.section, { zIndex: 1 }]}>
        <ThemedText style={styles.sectionLabel}>2. Description du travail</ThemedText>
        <TextInput
            style={[styles.input, { borderColor: '#ccc', color: textColor, height: 100 }]}
            placeholder="Décrivez les tâches à effectuer..."
            placeholderTextColor={'#999'}
            value={demandeTexte}
            onChangeText={setDemandeTexte}
            multiline
            numberOfLines={4}
        />
      </ThemedView>

      {/* 3. Compétences */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionLabel}>3. Compétences requises</ThemedText>
        <ThemedView style={styles.competencesContainer}>
            {localCompetences.map((comp, index) => (
                <TouchableOpacity key={index} onPress={() => handleRemoveCompetence(index)} style={styles.competenceTag}>
                    <ThemedText style={styles.competenceTagText}>{comp.nom} ✕</ThemedText>
                </TouchableOpacity>
            ))}
        </ThemedView>

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

        {associatedCompetences.length > 0 && (
            <ThemedView style={styles.suggestionsSection}>
                <ThemedText style={styles.suggestionLabel}>Souvent associé :</ThemedText>
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
            style={[styles.input, { borderColor: '#ccc', color: textColor }]}
            placeholder="Ajouter une compétence..."
            placeholderTextColor={'#999'}
            value={competenceNom}
            onChangeText={setCompetenceNom}
        />
        
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

      {/* 4. Validation */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionLabel}>4. Finalisation</ThemedText>
        {!authToken ? (
            <ThemedView style={styles.signupContainer}>
                <ThemedText style={styles.infoText}>Créez votre compte pour publier cette offre.</ThemedText>
                <TextInput style={[styles.input, { borderColor: '#ccc', color: textColor }]} placeholder="Pseudo" value={signupPseudo} onChangeText={setSignupPseudo} />
                <TextInput style={[styles.input, { borderColor: '#ccc', color: textColor }]} placeholder="Email" keyboardType="email-address" value={signupMail} onChangeText={setSignupMail} />
                <TextInput style={[styles.input, { borderColor: '#ccc', color: textColor }]} placeholder="Mot de passe" secureTextEntry value={signupPassword} onChangeText={setSignupPassword} />
            </ThemedView>
        ) : (
            <ThemedText style={styles.infoText}>Vous êtes connecté en tant que membre.</ThemedText>
        )}

        <TouchableOpacity 
            style={[styles.button, styles.validateButton, loadingAction && styles.buttonDisabled]}
            onPress={handleProposeTravail}
            disabled={loadingAction}
        >
            {loadingAction ? <ActivityIndicator color="white" /> : <ThemedText style={styles.buttonText}>Valider et proposer ce travail</ThemedText>}
        </TouchableOpacity>
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
    borderWidth: 1,
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
    backgroundColor: '#34C759',
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
  suggestionsSection: {
    marginBottom: 8,
  },
  suggestionLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  signupContainer: {
    gap: 10,
  },
  infoText: {
    marginBottom: 10,
    fontStyle: 'italic',
  },
});
