import { StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getAddressById, getApiUrl, API_ENDPOINTS, type Adresse } from '@/constants/api';
import { type Groupe } from '@/components/types';
import { AddressTag } from '@/components/AddressTag';

export default function AddressDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [adresse, setAdresse] = useState<Adresse | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [enfants, setEnfants] = useState<Adresse[]>([]);

  useEffect(() => {
    if (id) {
      loadAddress();
    }
  }, [id]);

  const loadAddress = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const addressId = parseInt(id, 10);
      const addressData = await getAddressById(addressId);
      
      if (addressData) {
        setAdresse(addressData);
        
        // Récupérer les groupes associés à cette adresse
        const groupesList: Groupe[] = [];
        
        // L'adresse peut maintenant avoir plusieurs groupes (relation ManyToMany)
        if (addressData.groupes && Array.isArray(addressData.groupes)) {
          addressData.groupes.forEach((g: any) => {
            groupesList.push({
              id: g.id,
              nom: g.nom,
            });
          });
        } else if (addressData.groupe) {
          // Fallback pour l'ancienne structure
          groupesList.push({
            id: addressData.groupe.id,
            nom: addressData.groupe.nom,
          });
        }
        
        setGroupes(groupesList);
        
        // Récupérer les adresses enfants
        if (addressData.enfants && Array.isArray(addressData.enfants)) {
          setEnfants(addressData.enfants);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'adresse:', error);
    } finally {
      setLoading(false);
    }
  };


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

  if (!adresse) {
    return (
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}>
        <ThemedView style={styles.container} cloudStyle={false}>
          <ThemedText>Adresse introuvable</ThemedText>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}>
      <ThemedView style={styles.container} cloudStyle={false}>
        <ThemedView style={styles.addressHeader}>
          <ThemedText type="title" style={styles.addressTitle}>
            {adresse.valeur}
          </ThemedText>
          <ThemedText style={styles.addressType}>
            Type: {adresse.type}
          </ThemedText>
          {adresse.latitude && adresse.longitude && (
            <ThemedText style={styles.addressCoords}>
              📍 {adresse.latitude.toFixed(4)}, {adresse.longitude.toFixed(4)}
            </ThemedText>
          )}
        </ThemedView>

        {/* Groupes associés */}
        {groupes.length > 0 && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Groupes associés
            </ThemedText>
            {groupes.map((groupe) => (
              <TouchableOpacity
                key={groupe.id}
                style={styles.groupItem}
                onPress={() => router.push(`/(tabs)/groupe`)}
              >
                <ThemedText type="defaultSemiBold">{groupe.nom}</ThemedText>
                <ThemedText style={styles.groupId}>ID: {groupe.id}</ThemedText>
              </TouchableOpacity>
            ))}
          </ThemedView>
        )}

        {/* Adresses enfants */}
        {enfants.length > 0 && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Adresses enfants
            </ThemedText>
            <ThemedView style={styles.tagsContainer}>
              {enfants.map((enfant) => (
                <AddressTag key={enfant.id} adresse={enfant} />
              ))}
            </ThemedView>
          </ThemedView>
        )}

        {groupes.length === 0 && enfants.length === 0 && (
          <ThemedText style={styles.emptyText}>
            Aucun groupe ou adresse enfant associé
          </ThemedText>
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
  addressHeader: {
    gap: 8,
    paddingBottom: 16,
  },
  addressTitle: {
    marginBottom: 4,
  },
  addressType: {
    fontSize: 14,
    opacity: 0.7,
  },
  addressCoords: {
    fontSize: 12,
    opacity: 0.6,
  },
  section: {
    gap: 12,
    marginTop: 8,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  groupItem: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    gap: 6,
  },
  groupId: {
    fontSize: 12,
    opacity: 0.6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
    fontStyle: 'italic',
    marginTop: 20,
  },
});

