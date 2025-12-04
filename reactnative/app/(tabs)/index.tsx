import { Image } from 'expo-image';
import { Platform, StyleSheet, TextInput, Button, Alert, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useState, useEffect, useMemo } from 'react';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getApiUrl, API_ENDPOINTS, importAddress, getAddresses, getCompetences, type BanAddressResult, type Adresse, type Competence as CompetenceApi } from '@/constants/api';
import { AddressAutocomplete } from '@/components/address-autocomplete';

interface Competence {
  id: number;
  nom: string;
  demande?: {
    id: number;
    texte: string;
  };
}

interface Demande {
  id: number;
  texte: string;
  groupe?: {
    id: number;
    nom: string;
  };
  competences?: Competence[];
}

interface Groupe {
  id: number;
  nom: string;
  demandes?: Demande[];
}

export default function HomeScreen() {
  const [nomGroupe, setNomGroupe] = useState('');
  const [loading, setLoading] = useState(false);
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [loadingGroupes, setLoadingGroupes] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // États pour la création d'adresse
  const [selectedAddress, setSelectedAddress] = useState<BanAddressResult | null>(null);
  const [complementAdresse, setComplementAdresse] = useState('');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [adresses, setAdresses] = useState<Adresse[]>([]);
  const [loadingAdresses, setLoadingAdresses] = useState(false);
  const [refreshingAdresses, setRefreshingAdresses] = useState(false);
  
  // États pour la création de demande
  const [demandeTextes, setDemandeTextes] = useState<Record<number, string>>({});
  const [loadingDemandes, setLoadingDemandes] = useState<Record<number, boolean>>({});
  
  // États pour la création de compétence
  const [competenceNoms, setCompetenceNoms] = useState<Record<number, string>>({});
  const [loadingCompetences, setLoadingCompetences] = useState<Record<number, boolean>>({});
  
  // État pour stocker toutes les compétences de la base de données
  const [allCompetences, setAllCompetences] = useState<CompetenceApi[]>([]);
  const [loadingAllCompetences, setLoadingAllCompetences] = useState(false);
  
  // État pour suivre les compétences ajoutées récemment (pour les retirer des propositions)
  const [addedCompetenceIds, setAddedCompetenceIds] = useState<Set<number>>(new Set());
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'icon');

  const fetchGroupes = async () => {
    setLoadingGroupes(true);
    try {
      // Récupérer les groupes avec leurs demandes (le contexte groupe:read est maintenant par défaut)
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
      // API Platform retourne les données dans un format hydra:member
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
    fetchAdresses();
    fetchAllCompetences();
  }, []);

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

  const fetchAdresses = async () => {
    setLoadingAdresses(true);
    try {
      const data = await getAddresses();
      setAdresses(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des adresses:', error);
      setAdresses([]);
    } finally {
      setLoadingAdresses(false);
      setRefreshingAdresses(false);
    }
  };

  const onRefreshAdresses = () => {
    setRefreshingAdresses(true);
    fetchAdresses();
  };

  const handleSelectAddress = (address: BanAddressResult) => {
    setSelectedAddress(address);
  };

  const handleCreateAddress = async () => {
    if (!selectedAddress) {
      Alert.alert('Erreur', 'Veuillez sélectionner une adresse');
      return;
    }

    setLoadingAddress(true);
    try {
      const newAddress = await importAddress(selectedAddress.label, complementAdresse.trim() || undefined);
      const message = newAddress.groupe 
        ? `Adresse "${selectedAddress.label}" créée avec succès !\nGroupe "${newAddress.groupe.nom}" créé avec ${newAddress.groupe.adresses?.length || 0} tags.`
        : `Adresse "${selectedAddress.label}" créée avec succès !`;
      Alert.alert('Succès', message);
      setSelectedAddress(null);
      setComplementAdresse('');
      await fetchAdresses();
      // Rafraîchir aussi la liste des groupes au cas où un nouveau groupe a été créé
      await fetchGroupes();
    } catch (error: any) {
      console.error('Erreur lors de la création de l\'adresse:', error);
      Alert.alert(
        'Erreur',
        error.message || 'Une erreur est survenue lors de la création de l\'adresse'
      );
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleSubmit = async () => {
    if (!nomGroupe.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour le groupe');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.GROUPES), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          nom: nomGroupe.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      Alert.alert('Succès', `Groupe "${nomGroupe}" créé avec succès !`);
      setNomGroupe('');
      // Rafraîchir la liste des groupes après création
      await fetchGroupes();
    } catch (error: any) {
      console.error('Erreur lors de la création du groupe:', error);
      Alert.alert(
        'Erreur',
        error.message || 'Une erreur est survenue lors de la création du groupe'
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroupes();
  };

  const handleCreateDemande = async (groupeId: number) => {
    const texte = demandeTextes[groupeId]?.trim();
    if (!texte) {
      Alert.alert('Erreur', 'Veuillez entrer un texte pour la demande');
      return;
    }

    setLoadingDemandes(prev => ({ ...prev, [groupeId]: true }));
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.DEMANDES), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          texte: texte,
          groupe: `/api/groupes/${groupeId}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}: ${response.statusText}`);
      }

      Alert.alert('Succès', 'Demande créée avec succès !');
      // Réinitialiser le texte pour ce groupe
      setDemandeTextes(prev => {
        const newState = { ...prev };
        delete newState[groupeId];
        return newState;
      });
      // Rafraîchir la liste des groupes pour afficher la nouvelle demande
      await fetchGroupes();
    } catch (error: any) {
      console.error('Erreur lors de la création de la demande:', error);
      Alert.alert(
        'Erreur',
        error.message || 'Une erreur est survenue lors de la création de la demande'
      );
    } finally {
      setLoadingDemandes(prev => ({ ...prev, [groupeId]: false }));
    }
  };

  const handleCreateCompetence = async (demandeId: number, nomCompetence?: string, competenceId?: number) => {
    const nom = nomCompetence || competenceNoms[demandeId]?.trim();
    if (!nom) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour la compétence');
      return;
    }

    // Trouver la demande correspondante pour vérifier les doublons
    const demande = groupes
      .flatMap(g => g.demandes || [])
      .find(d => d.id === demandeId);

    // Vérifier si une compétence avec ce nom existe déjà dans cette demande
    const nomLower = nom.toLowerCase().trim();
    const existingInDemande = demande?.competences?.some(
      c => c.nom.toLowerCase().trim() === nomLower
    );

    if (existingInDemande) {
      Alert.alert('Erreur', 'Cette compétence existe déjà pour cette demande');
      return;
    }

    // Vérifier si une compétence avec ce nom existe déjà dans toute la DB
    const existingInDb = allCompetences.some(
      c => c.nom.toLowerCase().trim() === nomLower
    );

    if (existingInDb && !competenceId) {
      // Si la compétence existe déjà dans la DB mais qu'on n'a pas son ID, on ne peut pas la réutiliser
      // On crée quand même une nouvelle instance (car chaque compétence est liée à une demande)
      // Mais on pourrait aussi chercher la compétence existante et la réutiliser
    }

    setLoadingCompetences(prev => ({ ...prev, [demandeId]: true }));
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.COMPETENCES), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          nom: nom,
          demande: `/api/demandes/${demandeId}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}: ${response.statusText}`);
      }

      const newCompetence = await response.json();

      // Si c'était une compétence proposée (avec un ID), l'ajouter temporairement à la liste
      // pour la retirer immédiatement des propositions
      if (competenceId) {
        setAddedCompetenceIds(prev => new Set([...prev, competenceId]));
      } else if (newCompetence.id) {
        // Si c'est une nouvelle compétence créée, l'ajouter aussi temporairement
        setAddedCompetenceIds(prev => new Set([...prev, newCompetence.id]));
      }

      // Ne pas afficher d'alerte si c'est un clic sur une proposition (pour une meilleure UX)
      if (!nomCompetence) {
        Alert.alert('Succès', 'Compétence créée avec succès !');
      }
      // Réinitialiser le nom pour cette demande
      setCompetenceNoms(prev => {
        const newState = { ...prev };
        delete newState[demandeId];
        return newState;
      });
      // Rafraîchir la liste des groupes pour afficher la nouvelle compétence
      await fetchGroupes();
      // Rafraîchir aussi la liste de toutes les compétences
      await fetchAllCompetences();
      
      // Nettoyer le Set des compétences ajoutées après le rafraîchissement
      // car elles seront maintenant dans les compétences existantes de la demande
      setTimeout(() => {
        setAddedCompetenceIds(new Set());
      }, 100);
    } catch (error: any) {
      console.error('Erreur lors de la création de la compétence:', error);
      Alert.alert(
        'Erreur',
        error.message || 'Une erreur est survenue lors de la création de la compétence'
      );
    } finally {
      setLoadingCompetences(prev => ({ ...prev, [demandeId]: false }));
    }
  };

  // Fonction pour proposer des compétences existantes de la DB basées sur le texte de la demande
  const proposeCompetencesFromDemande = (
    texte: string, 
    existingCompetences: Competence[] = [],
    demandeGroupeId?: number
  ): CompetenceApi[] => {
    // Liste des mots vides (stop words) en français
    const stopWords = new Set([
      'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'd', 'et', 'ou', 'mais', 'donc', 'car', 'ne', 'pas',
      'pour', 'par', 'avec', 'sans', 'sur', 'sous', 'dans', 'entre', 'vers', 'chez', 'à', 'au', 'aux',
      'ce', 'cette', 'ces', 'se', 'te', 'me', 'nous', 'vous', 'ils', 'elles', 'il', 'elle', 'on',
      'qui', 'que', 'quoi', 'où', 'quand', 'comment', 'pourquoi', 'est', 'sont', 'être', 'avoir',
      'faire', 'aller', 'venir', 'voir', 'savoir', 'vouloir', 'pouvoir', 'devoir', 'falloir',
      'très', 'plus', 'moins', 'aussi', 'bien', 'mal', 'mieux', 'beaucoup', 'peu', 'trop',
      'tout', 'tous', 'toute', 'toutes', 'rien', 'personne', 'quelque', 'chaque',
      'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'notre', 'votre', 'leur',
      'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles'
    ]);

    // Nettoyer et extraire les mots du texte
    const texteWords = texte
      .toLowerCase()
      .replace(/[^\w\sàâäéèêëïîôöùûüÿç]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length >= 3 &&
        !stopWords.has(word) &&
        !/^\d+$/.test(word)
      );

    // Récupérer les IDs des compétences déjà liées à cette demande
    const existingCompetenceIds = new Set(
      existingCompetences.map(c => c.id)
    );

    // Récupérer les noms des compétences déjà liées à cette demande (pour éviter les doublons de noms)
    const existingCompetenceNames = new Set(
      existingCompetences.map(c => c.nom.toLowerCase().trim())
    );

    // Trouver les compétences liées par groupe
    // Pour chaque compétence existante dans la demande, trouver les groupes qui la contiennent
    // puis récupérer toutes les compétences de ces groupes
    const relatedCompetenceIds = new Set<number>();
    
    if (existingCompetences.length > 0) {
      // Pour chaque compétence existante, trouver dans quels groupes elle apparaît
      existingCompetences.forEach(existingComp => {
        groupes.forEach(groupe => {
          // Ignorer le groupe de la demande actuelle
          if (groupe.id === demandeGroupeId) return;
          
          // Parcourir toutes les demandes du groupe
          groupe.demandes?.forEach(demande => {
            // Vérifier si cette demande contient la compétence existante (par nom, insensible à la casse)
            const hasCompetence = demande.competences?.some(
              comp => comp.nom.toLowerCase().trim() === existingComp.nom.toLowerCase().trim()
            );
            
            if (hasCompetence) {
              // Récupérer toutes les compétences de ce groupe
              groupe.demandes?.forEach(d => {
                d.competences?.forEach(comp => {
                  // Ajouter toutes les compétences de ce groupe (sauf celles déjà dans la demande actuelle)
                  if (!existingCompetenceIds.has(comp.id)) {
                    relatedCompetenceIds.add(comp.id);
                  }
                });
              });
            }
          });
        });
      });
    }

    // Filtrer les compétences de la DB qui :
    // 1. Ne sont pas déjà liées à cette demande (par ID)
    // 2. N'ont pas été ajoutées récemment (pour les retirer des propositions)
    // 3. N'ont pas un nom qui existe déjà dans cette demande (pour éviter les doublons)
    const availableCompetences = allCompetences.filter(
      comp => {
        const compNomLower = comp.nom.toLowerCase().trim();
        return (
          !existingCompetenceIds.has(comp.id) &&
          !addedCompetenceIds.has(comp.id) &&
          !existingCompetenceNames.has(compNomLower)
        );
      }
    );

    // Calculer un score de pertinence pour chaque compétence
    const competencesWithScore = availableCompetences.map(comp => {
      const compNomLower = comp.nom.toLowerCase();
      let score = 0;

      // Bonus si la compétence est dans un groupe lié (groupe qui contient une compétence de la demande)
      if (relatedCompetenceIds.has(comp.id)) {
        score += 15; // Bonus important pour les compétences liées par groupe
      }

      // Vérifier si le nom de la compétence contient des mots du texte
      texteWords.forEach(word => {
        if (compNomLower.includes(word)) {
          score += 2; // Correspondance partielle
        }
        // Vérifier si le nom de la compétence est exactement égal à un mot
        if (compNomLower === word) {
          score += 5; // Correspondance exacte
        }
        // Vérifier si le nom de la compétence commence par un mot du texte
        if (compNomLower.startsWith(word)) {
          score += 3;
        }
      });

      // Vérifier si le texte contient le nom de la compétence
      if (texte.toLowerCase().includes(compNomLower)) {
        score += 10; // Correspondance forte
      }

      return { compétence: comp, score };
    });

    // Trier par score décroissant et retourner les meilleures propositions
    return competencesWithScore
      .filter(item => item.score > 0) // Garder seulement celles avec un score > 0
      .sort((a, b) => b.score - a.score)
      .slice(0, 10) // Limiter à 10 propositions
      .map(item => item.compétence);
  };

  const renderGroupe = ({ item }: { item: Groupe }) => {
    const hasDemande = item.demandes && item.demandes.length > 0;
    const demandeTexte = demandeTextes[item.id] || '';
    const isLoading = loadingDemandes[item.id] || false;

    return (
      <ThemedView style={styles.groupeItem}>
        <ThemedView style={styles.groupeHeader}>
          <ThemedText type="defaultSemiBold">{item.nom}</ThemedText>
          <ThemedText style={styles.groupeId}>ID: {item.id}</ThemedText>
        </ThemedView>
        {hasDemande ? (
          <ThemedView style={styles.demandeContainer}>
            <ThemedText style={styles.demandeLabel}>Demande existante:</ThemedText>
            {item.demandes?.map((demande) => {
              const competenceNom = competenceNoms[demande.id] || '';
              const isLoadingCompetence = loadingCompetences[demande.id] || false;
              
              // Proposer des compétences existantes de la DB basées sur le texte de la demande
              const proposedCompetences = proposeCompetencesFromDemande(
                demande.texte,
                demande.competences || [],
                item.id // Passer l'ID du groupe de la demande
              );

              return (
                <ThemedView key={demande.id} style={styles.demandeItem}>
                  <ThemedText style={styles.demandeTexte}>{demande.texte}</ThemedText>
                  <ThemedText style={styles.demandeId}>ID: {demande.id}</ThemedText>
                  
                  {/* Affichage des compétences existantes */}
                  {demande.competences && demande.competences.length > 0 && (
                    <ThemedView style={styles.competencesContainer}>
                      <ThemedText style={styles.competencesLabel}>Compétences:</ThemedText>
                      <ThemedView style={styles.competencesTags}>
                        {demande.competences.map((competence) => (
                          <ThemedView key={competence.id} style={styles.competenceTag}>
                            <ThemedText style={styles.competenceTagText}>{competence.nom}</ThemedText>
                          </ThemedView>
                        ))}
                      </ThemedView>
                    </ThemedView>
                  )}
                  
                  {/* Propositions de compétences existantes de la DB */}
                  {proposedCompetences.length > 0 && (
                    <ThemedView style={styles.proposedCompetencesContainer}>
                      <ThemedText style={styles.proposedCompetencesLabel}>
                        Suggestions de compétences (existantes):
                      </ThemedText>
                      <ThemedView style={styles.proposedCompetencesTags}>
                        {proposedCompetences.map((competence) => (
                          <TouchableOpacity
                            key={competence.id}
                            style={[styles.proposedCompetenceTag, { borderColor }]}
                            onPress={() => handleCreateCompetence(demande.id, competence.nom, competence.id)}
                            disabled={isLoadingCompetence}
                          >
                            <ThemedText style={styles.proposedCompetenceTagText}>
                              {competence.nom}
                            </ThemedText>
                          </TouchableOpacity>
                        ))}
                      </ThemedView>
                    </ThemedView>
                  )}
                  
                  {/* Input pour créer une nouvelle compétence */}
                  <ThemedView style={styles.createCompetenceContainer}>
                    <ThemedText style={styles.createCompetenceLabel}>Ajouter une compétence (tag):</ThemedText>
                    <TextInput
                      style={[styles.competenceInput, { borderColor, color: textColor }]}
                      placeholder="Entrez un mot-clé..."
                      placeholderTextColor={textColor + '80'}
                      value={competenceNom}
                      onChangeText={(text) => setCompetenceNoms(prev => ({ ...prev, [demande.id]: text }))}
                    />
                    <Button
                      title={isLoadingCompetence ? 'Création...' : 'Ajouter'}
                      onPress={() => handleCreateCompetence(demande.id)}
                      disabled={isLoadingCompetence || !competenceNom.trim()}
                    />
                  </ThemedView>
                </ThemedView>
              );
            })}
          </ThemedView>
        ) : (
          <ThemedView style={styles.createDemandeContainer}>
            <ThemedText style={styles.createDemandeLabel}>Créer une demande:</ThemedText>
            <TextInput
              style={[styles.demandeInput, { borderColor, color: textColor }]}
              placeholder="Entrez le texte de la demande..."
              placeholderTextColor={textColor + '80'}
              value={demandeTexte}
              onChangeText={(text) => setDemandeTextes(prev => ({ ...prev, [item.id]: text }))}
              multiline
              numberOfLines={3}
            />
            <Button
              title={isLoading ? 'Création...' : 'Créer la demande'}
              onPress={() => handleCreateDemande(item.id)}
              disabled={isLoading || !demandeTexte.trim()}
            />
          </ThemedView>
        )}
      </ThemedView>
    );
  };

  const renderAdresse = ({ item }: { item: Adresse }) => {
    // Si c'est un groupe avec des adresses, afficher le groupe avec ses tags
    if (item.groupe && item.groupe.adresses) {
      return (
        <ThemedView style={styles.adresseItem}>
          <ThemedView style={styles.adresseHeader}>
            <ThemedText type="defaultSemiBold">{item.groupe.nom}</ThemedText>
            <ThemedText style={styles.groupeId}>ID Groupe: {item.groupe.id}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.tagsContainer}>
            {item.groupe.adresses.map((tag, index) => (
              <ThemedView key={tag.id || index} style={styles.tagItem}>
                <ThemedText style={styles.tagType}>{tag.type}:</ThemedText>
                <ThemedText style={styles.tagValeur}>{tag.valeur}</ThemedText>
                {tag.latitude && tag.longitude && (
                  <ThemedText style={styles.coordsText}>
                    📍 {tag.latitude.toFixed(6)}, {tag.longitude.toFixed(6)}
                  </ThemedText>
                )}
              </ThemedView>
            ))}
          </ThemedView>
        </ThemedView>
      );
    }

    // Sinon, afficher un tag individuel
    return (
      <ThemedView style={styles.adresseItem}>
        <ThemedView style={styles.adresseHeader}>
          <ThemedText type="defaultSemiBold">
            {item.type}: {item.valeur}
          </ThemedText>
          {item.latitude && item.longitude && (
            <ThemedText style={styles.coordsText}>
              📍 {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
            </ThemedText>
          )}
          {item.parent && (
            <ThemedText style={styles.parentText}>
              Parent: {item.parent.type} - {item.parent.valeur}
            </ThemedText>
          )}
          <ThemedText style={styles.adresseId}>ID: {item.id}</ThemedText>
        </ThemedView>
        {item.groupe && (
          <ThemedView style={styles.groupeStack}>
            <ThemedView style={styles.groupeStackItem}>
              <ThemedText type="defaultSemiBold" style={styles.groupeStackNom}>
                {item.groupe.nom}
              </ThemedText>
              <ThemedText style={styles.groupeStackId}>ID: {item.groupe.id}</ThemedText>
            </ThemedView>
          </ThemedView>
        )}
      </ThemedView>
    );
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
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>
      
      

      <ThemedView style={styles.listContainer}>
        <ThemedText type="subtitle">Liste des groupes</ThemedText>
        {loadingGroupes && groupes.length === 0 ? (
          <ThemedText>Chargement...</ThemedText>
        ) : groupes.length === 0 ? (
          <ThemedText style={styles.emptyText}>Aucun groupe pour le moment</ThemedText>
        ) : (
          <FlatList
            data={groupes}
            renderItem={renderGroupe}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            scrollEnabled={false}
          />
        )}
      </ThemedView>

      <ThemedView style={styles.formContainer}>
        <ThemedText type="subtitle">Créer une nouvelle adresse</ThemedText>
        <AddressAutocomplete
          onSelectAddress={handleSelectAddress}
          placeholder="Rechercher une adresse..."
        />
        {selectedAddress && (
          <ThemedView style={styles.selectedAddressContainer}>
            <ThemedText type="defaultSemiBold" style={styles.selectedAddressLabel}>
              Adresse sélectionnée:
            </ThemedText>
            <ThemedText style={styles.selectedAddressText}>
              {selectedAddress.label}
            </ThemedText>
            <ThemedText style={styles.selectedAddressDetails}>
              {selectedAddress.postcode} {selectedAddress.city}
            </ThemedText>
          </ThemedView>
        )}
        <Button
          title={loadingAddress ? 'Création...' : 'Créer l\'adresse'}
          onPress={handleCreateAddress}
          disabled={loadingAddress || !selectedAddress}
        />
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  formContainer: {
    gap: 12,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 44,
  },
  listContainer: {
    gap: 12,
    marginBottom: 16,
    padding: 16,
  },
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
  demandeContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 8,
  },
  demandeLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
  },
  demandeItem: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.02)',
    gap: 4,
  },
  demandeTexte: {
    fontSize: 14,
  },
  demandeId: {
    fontSize: 11,
    opacity: 0.6,
  },
  createDemandeContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 8,
  },
  createDemandeLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
  },
  demandeInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  competencesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 8,
  },
  competencesLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.7,
  },
  competencesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  competenceTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  competenceTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  createCompetenceContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 8,
  },
  createCompetenceLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.7,
  },
  competenceInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    minHeight: 40,
  },
  proposedCompetencesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 8,
  },
  proposedCompetencesLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.7,
  },
  proposedCompetencesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  proposedCompetenceTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  proposedCompetenceTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(0,122,255,0.9)',
  },
  groupeId: {
    fontSize: 12,
    opacity: 0.6,
  },
  emptyText: {
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  selectedAddressContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  selectedAddressLabel: {
    marginBottom: 4,
  },
  selectedAddressText: {
    fontSize: 14,
  },
  selectedAddressDetails: {
    fontSize: 12,
    opacity: 0.7,
  },
  adresseItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  adresseHeader: {
    gap: 4,
  },
  complementText: {
    fontSize: 12,
    opacity: 0.8,
  },
  coordsText: {
    fontSize: 11,
    opacity: 0.6,
  },
  adresseId: {
    fontSize: 12,
    opacity: 0.6,
  },
  parentText: {
    fontSize: 11,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  tagsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 4,
  },
  tagItem: {
    padding: 6,
    marginLeft: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.02)',
    gap: 2,
  },
  tagType: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  tagValeur: {
    fontSize: 12,
  },
  groupeStack: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  groupeStackItem: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.03)',
    gap: 4,
    marginLeft: 8,
  },
  groupeStackNom: {
    fontSize: 14,
  },
  groupeStackId: {
    fontSize: 11,
    opacity: 0.6,
  },
  noGroupeText: {
    fontSize: 11,
    opacity: 0.5,
    fontStyle: 'italic',
    marginTop: 4,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
