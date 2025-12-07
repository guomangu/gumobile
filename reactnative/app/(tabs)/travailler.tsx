import { StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getApiUrl, API_ENDPOINTS } from '@/constants/api';
import { useThemeColor } from '@/hooks/use-theme-color';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Demande {
  id: number;
  texte: string;
  competences: { id: number; nom: string }[];
  groupe?: {
    id: number;
    nom: string;
    adresses?: { latitude: number; longitude: number; valeur: string }[];
  };
  distance?: number;
}

interface Groupe {
  id: number;
  nom: string;
  adresses?: { id: number; latitude: number; longitude: number; valeur: string }[];
}

export default function TravaillerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchLat, setSearchLat] = useState<number | null>(params.lat ? parseFloat(params.lat as string) : null);
  const [searchLon, setSearchLon] = useState<number | null>(params.lon ? parseFloat(params.lon as string) : null);
  const [searchAddress, setSearchAddress] = useState<string | null>(params.address ? (params.address as string) : null);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  // Gestion des tags du worker
  const [workerTags, setWorkerTags] = useState<string[]>(
    params.tags ? (JSON.parse(params.tags as string) as string[]) : []
  );
  const [newTag, setNewTag] = useState('');

  // Chargement des données du worker si workerId est présent
  useEffect(() => {
    const workerId = params.workerId;
    if (workerId) {
      const loadWorkerData = async () => {
        try {
          setLoading(true);
          const response = await fetch(getApiUrl(`${API_ENDPOINTS.USERS}/${workerId}`), {
            headers: { 'Accept': 'application/json' }
          });
          
          if (response.ok) {
            const userData = await response.json();
            const userDemandes = userData.demandes || [];
            
            if (userDemandes.length > 0) {
              let demande = userDemandes[0];
              
              // Si c'est un IRI, on le fetch
              if (typeof demande === 'string') {
                const demandeId = demande.split('/').pop();
                const demandeRes = await fetch(getApiUrl(`${API_ENDPOINTS.DEMANDES}/${demandeId}`), {
                    headers: { 'Accept': 'application/json' }
                });
                if (demandeRes.ok) {
                    demande = await demandeRes.json();
                }
              }

              if (typeof demande === 'object') {
                // Mise à jour des tags
                if (demande.competences) {
                    const tags = demande.competences.map((c: any) => c.nom);
                    setWorkerTags(tags);
                }

                // Mise à jour de l'adresse
                if (demande.groupe) {
                    let groupe = demande.groupe;
                    // Si le groupe est un IRI, on le fetch (ou on espère qu'il est inclus)
                    // Pour l'instant on suppose qu'on a besoin de l'adresse.
                    // Souvent l'API User inclut un groupe simplifié.
                    
                    if (typeof groupe === 'string') {
                         // fetch groupe logic if needed, but typically user serialization includes embedded relations if configured
                         // Assuming basic struct for now or relying on what we have.
                         // If we can't get address easily from user->demande->groupe, we might need to fetch groupe.
                         const groupeId = groupe.split('/').pop();
                         const groupeRes = await fetch(getApiUrl(`${API_ENDPOINTS.GROUPES}/${groupeId}`), {
                             headers: { 'Accept': 'application/json' }
                         });
                         if (groupeRes.ok) groupe = await groupeRes.json();
                    }

                    if (groupe && groupe.adresses && groupe.adresses.length > 0) {
                        const addr = groupe.adresses[0];
                        setSearchLat(addr.latitude);
                        setSearchLon(addr.longitude);
                        setSearchAddress(addr.valeur);
                    }
                }
              }
            }
          }
        } catch (error) {
          console.error('Erreur chargement profil worker:', error);
        } finally {
          // On ne met pas setLoading(false) ici car fetchDemandes va s'enchaîner
        }
      };
      loadWorkerData();
    }
  }, [params.workerId]);

  // Mettre à jour les tags si les params changent (fallback pour navigation sans workerId)
  useEffect(() => {
    if (params.tags && !params.workerId) {
      setWorkerTags(JSON.parse(params.tags as string));
    }
  }, [params.tags, params.workerId]);

  const handleAddTag = async (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !workerTags.includes(trimmedTag)) {
      const updatedTags = [...workerTags, trimmedTag];
      setWorkerTags(updatedTags);
      setNewTag('');

      // Synchroniser avec l'API si l'utilisateur est connecté et a une demande active
      try {
        const token = await AsyncStorage.getItem('authToken');
        const userId = await AsyncStorage.getItem('userId');
        
        if (token && userId) {
            // 1. Créer la compétence si elle n'existe pas
            // Note: l'API Symfony gère la création/récupération via le nom
            
            // 2. Récupérer la demande de l'utilisateur
            const userResponse = await fetch(getApiUrl(`${API_ENDPOINTS.USERS}/${userId}`), {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
            });
            
            if (userResponse.ok) {
                const userData = await userResponse.json();
                const userDemandes = userData.demandes || [];
                
                if (userDemandes.length > 0) {
                    // On prend la première demande par défaut
                    const demande = userDemandes[0];
                    const demandeId = typeof demande === 'string' 
                        ? demande.split('/').pop() 
                        : (demande.id || demande['@id']?.split('/').pop());

                    if (demandeId) {
                        // Ajouter la compétence liée à cette demande
                        await fetch(getApiUrl(API_ENDPOINTS.COMPETENCES), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'Authorization': `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                                nom: trimmedTag,
                                demandes: [`/api/demandes/${demandeId}`],
                            }),
                        });
                        console.log('Compétence synchronisée avec l\'API:', trimmedTag);
                    }
                }
            }
        }
      } catch (error) {
        console.error('Erreur lors de la synchronisation du tag:', error);
      }
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    setWorkerTags(workerTags.filter(tag => tag !== tagToRemove));

    // Synchroniser la suppression avec l'API
    try {
        const token = await AsyncStorage.getItem('authToken');
        const userId = await AsyncStorage.getItem('userId');
        
        if (token && userId) {
            // Récupérer la demande de l'utilisateur pour trouver l'ID de la compétence à supprimer
            const userResponse = await fetch(getApiUrl(`${API_ENDPOINTS.USERS}/${userId}`), {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
            });
            
            if (userResponse.ok) {
                const userData = await userResponse.json();
                const userDemandes = userData.demandes || [];
                
                if (userDemandes.length > 0) {
                    let demande = userDemandes[0];
                    
                    // Si c'est juste un IRI, il faut fetch la demande complète
                    if (typeof demande === 'string') {
                        const demandeId = demande.split('/').pop();
                        const demandeResponse = await fetch(getApiUrl(`${API_ENDPOINTS.DEMANDES}/${demandeId}`), {
                            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
                        });
                        if (demandeResponse.ok) {
                            demande = await demandeResponse.json();
                        }
                    }

                    if (demande && demande.competences) {
                        const competenceToDelete = demande.competences.find((c: any) => c.nom === tagToRemove);
                        if (competenceToDelete && competenceToDelete.id) {
                            // Supprimer la compétence (DELETE /api/competences/{id})
                            // Note: Cela supprime la compétence de la base si elle n'est liée qu'à cette demande
                            // Ou juste le lien ? Avec API Platform standard, DELETE sur une ressource la supprime.
                            await fetch(getApiUrl(`${API_ENDPOINTS.COMPETENCES}/${competenceToDelete.id}`), {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                }
                            });
                            console.log('Compétence supprimée de l\'API:', tagToRemove);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Erreur lors de la suppression du tag:', error);
    }
  };

  // Calcul de la distance (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const fetchDemandes = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Récupérer les demandes
      const demandesUrl = getApiUrl(API_ENDPOINTS.DEMANDES);
      const demandesResponse = await fetch(demandesUrl, {
        headers: { 'Accept': 'application/json' }
      });

      if (!demandesResponse.ok) throw new Error('Erreur chargement demandes');

      const demandesData = await demandesResponse.json();
      let allDemandes: Demande[] = demandesData['hydra:member'] || demandesData || [];

      // 2. Récupérer les groupes pour avoir les adresses complètes (si manquantes dans demandes)
      const groupesUrl = getApiUrl(API_ENDPOINTS.GROUPES);
      try {
        const groupesResponse = await fetch(groupesUrl, {
             headers: { 'Accept': 'application/json' }
        });
        if (groupesResponse.ok) {
            const groupesData = await groupesResponse.json();
            const allGroupes: Groupe[] = groupesData['hydra:member'] || groupesData || [];
            
            // Enrichir les demandes avec les données complètes du groupe
            allDemandes = allDemandes.map(d => {
                if (d.groupe?.id) {
                    const fullGroupe = allGroupes.find(g => g.id === d.groupe?.id);
                    if (fullGroupe) {
                        return {
                            ...d,
                            groupe: {
                                ...d.groupe,
                                nom: fullGroupe.nom,
                                adresses: fullGroupe.adresses
                            }
                        };
                    }
                }
                return d;
            });
        }
      } catch (err) {
        console.warn('Impossible de charger les détails des groupes:', err);
      }

      // Filtrage par tags
      let filtered = allDemandes;
      if (workerTags.length > 0) {
        filtered = allDemandes.filter(d => 
          d.competences?.some(c => workerTags.includes(c.nom))
        );
      }

      // Tri par distance si coordonnées disponibles
      if (searchLat && searchLon) {
        filtered = filtered.map(d => {
            // Trouver l'adresse la plus proche du groupe
            let minDist = Infinity;
            if (d.groupe?.adresses) {
                d.groupe.adresses.forEach(addr => {
                    if (addr.latitude && addr.longitude) {
                        const dist = calculateDistance(searchLat, searchLon, addr.latitude, addr.longitude);
                        if (dist < minDist) minDist = dist;
                    }
                });
            }
            // Si pas d'adresse ou calcul impossible, distance infinie (à la fin)
            return { ...d, distance: minDist === Infinity ? 99999 : minDist };
        }).sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }

      setDemandes(filtered);
    } catch (error) {
      console.error('Erreur fetch demandes:', error);
      Alert.alert('Erreur', 'Impossible de charger les demandes');
    } finally {
      setLoading(false);
    }
  }, [searchLat, searchLon, workerTags]);

  useEffect(() => {
    fetchDemandes();
  }, [fetchDemandes]);

  const renderItem = ({ item }: { item: Demande }) => (
    <TouchableOpacity 
        style={[styles.card, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
        onPress={() => router.push(`/(tabs)/groupe`)} // Idéalement vers le détail du groupe/demande
    >
      <ThemedView style={styles.cardHeader}>
        <ThemedText type="defaultSemiBold">{item.groupe?.nom || 'Groupe inconnu'}</ThemedText>
        {item.distance !== undefined && item.distance < 9000 && (
            <ThemedText style={styles.distance}>
                {item.distance < 1 ? `${Math.round(item.distance * 1000)}m` : `${item.distance.toFixed(1)}km`}
            </ThemedText>
        )}
      </ThemedView>

      {/* Affichage de l'adresse du groupe */}
      {item.groupe?.adresses && item.groupe.adresses.length > 0 && (
        <ThemedView style={styles.groupAddressContainer}>
            <IconSymbol name="house.fill" size={14} color={textColor} style={{ opacity: 0.6 }} />
            <ThemedText style={styles.groupAddressText} numberOfLines={1}>
                {item.groupe.adresses[0].valeur}
            </ThemedText>
        </ThemedView>
      )}
      
      <ThemedText style={styles.description} numberOfLines={3}>{item.texte}</ThemedText>
      
      <ThemedView style={styles.tagsContainer}>
        {item.competences?.map((c, i) => (
            <TouchableOpacity 
                key={i} 
                style={[
                    styles.tag, 
                    workerTags.includes(c.nom) ? styles.tagActive : styles.tagInactive
                ]}
                onPress={() => !workerTags.includes(c.nom) && handleAddTag(c.nom)}
            >
                <ThemedText style={[
                    styles.tagText,
                    !workerTags.includes(c.nom) && { color: '#007AFF' }
                ]}>
                    {c.nom} {workerTags.includes(c.nom) ? '✓' : '+'}
                </ThemedText>
            </TouchableOpacity>
        ))}
      </ThemedView>
    </TouchableOpacity>
  );

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={<IconSymbol size={310} color="#808080" name="chevron.left.forwardslash.chevron.right" style={styles.headerImage} />}>
      
      <ThemedView style={styles.headerContainer}>
        <ThemedText type="title">Votre profil travailleur</ThemedText>
        
        {searchAddress && (
            <ThemedView style={styles.addressContainer}>
                <IconSymbol name="house.fill" size={20} color={textColor} />
                <ThemedText style={styles.addressText}>{searchAddress}</ThemedText>
            </ThemedView>
        )}

        <ThemedView style={styles.competencesSection}>
            <ThemedText type="subtitle">Vos compétences</ThemedText>
            <ThemedView style={styles.tagsInputContainer}>
                {workerTags.map((tag, index) => (
                    <TouchableOpacity key={index} style={styles.tagInput} onPress={() => handleRemoveTag(tag)}>
                        <ThemedText style={styles.tagInputText}>{tag} ✕</ThemedText>
                    </TouchableOpacity>
                ))}
            </ThemedView>
            
            <ThemedView style={styles.addTagContainer}>
                <ThemedText style={styles.suggestionLabel}>Ajouter une compétence depuis les demandes ci-dessous :</ThemedText>
            </ThemedView>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Résultats</ThemedText>
        <ThemedText>
            {demandes.length} demande(s) correspondant à vos critères
            {searchLat ? ' (triées par proximité)' : ''}
        </ThemedText>
      </ThemedView>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
            data={demandes}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            scrollEnabled={false} // Car dans ParallaxScrollView
            contentContainerStyle={styles.listContainer}
        />
      )}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 20,
  },
  listContainer: {
    gap: 16,
    paddingBottom: 20,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  groupAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  groupAddressText: {
    fontSize: 12,
    opacity: 0.6,
    flex: 1,
  },
  distance: {
    fontSize: 12,
    opacity: 0.6,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
  },
  tagInactive: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  tagActive: {
    backgroundColor: '#34C759', // Highlight matched tags
  },
  tagText: {
    fontSize: 12,
  },
  headerContainer: {
    marginBottom: 24,
    gap: 16,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    opacity: 0.8,
  },
  addressText: {
    fontSize: 16,
  },
  competencesSection: {
    gap: 12,
  },
  tagsInputContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagInput: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagInputText: {
    color: 'white',
    fontSize: 14,
  },
  addTagContainer: {
    marginTop: 8,
  },
  suggestionLabel: {
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.7,
  },
});

