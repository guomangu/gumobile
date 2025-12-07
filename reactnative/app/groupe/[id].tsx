import { StyleSheet, ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getApiUrl, API_ENDPOINTS } from '@/constants/api';
import { useThemeColor } from '@/hooks/use-theme-color';

interface GroupDetail {
  id: number;
  nom: string;
  type?: string;
  adresses?: {
    id: number;
    valeur: string;
    latitude?: number;
    longitude?: number;
  }[];
  demandes?: {
    id: number;
    texte: string;
    competences?: {
      id: number;
      nom: string;
    }[];
  }[];
  usersData?: {
    id: number;
    pseudo: string;
    mail: string;
  }[];
  users?: { // Fallback if usersData is not populated or for different API serialization
    id: number;
    pseudo: string;
    mail: string;
  }[];
}

export default function GroupeDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [groupe, setGroupe] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');

  useEffect(() => {
    const fetchGroupe = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await fetch(getApiUrl(`${API_ENDPOINTS.GROUPES}/${id}`), {
          headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: Impossible de charger le groupe`);
        }

        const data = await response.json();
        setGroupe(data);
      } catch (err: any) {
        console.error('Erreur chargement groupe:', err);
        setError(err.message || 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchGroupe();
  }, [id]);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (error || !groupe) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>Groupe introuvable ou erreur de chargement.</ThemedText>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </ThemedView>
    );
  }

  const users = groupe.usersData || groupe.users || [];
  const isOffre = groupe.type === 'OFFRE';
  const badgeColor = isOffre ? '#34C759' : '#007AFF';
  const badgeText = isOffre ? 'Offre' : 'Demande';

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={100}
          color="#808080"
          name="person.3.fill"
          style={styles.headerImage}
        />
      }>
      
      <ThemedView style={styles.headerContainer}>
        <ThemedView style={styles.titleRow}>
            <ThemedText type="title" style={{flex: 1}}>{groupe.nom}</ThemedText>
            {groupe.type && (
                <ThemedView style={[styles.badge, { backgroundColor: badgeColor }]}>
                    <ThemedText style={styles.badgeText}>{badgeText}</ThemedText>
                </ThemedView>
            )}
        </ThemedView>
      </ThemedView>

      {/* Adresses */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Localisation</ThemedText>
        {groupe.adresses && groupe.adresses.length > 0 ? (
            groupe.adresses.map((addr, index) => (
                <ThemedView key={index} style={styles.infoRow}>
                    <IconSymbol name="house.fill" size={16} color={textColor} />
                    <ThemedText>{addr.valeur}</ThemedText>
                </ThemedView>
            ))
        ) : (
            <ThemedText style={styles.italicText}>Aucune adresse renseignée.</ThemedText>
        )}
      </ThemedView>

      {/* Membres */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Membres ({users.length})</ThemedText>
        {users.length > 0 ? (
            <ThemedView style={styles.usersList}>
                {users.map((user) => (
                    <TouchableOpacity 
                        key={user.id} 
                        style={styles.userChip}
                        onPress={() => router.push(`/profil/${user.id}`)}
                    >
                        <IconSymbol name="person.fill" size={12} color={textColor} />
                        <ThemedText style={styles.userText}>{user.pseudo}</ThemedText>
                    </TouchableOpacity>
                ))}
            </ThemedView>
        ) : (
            <ThemedText style={styles.italicText}>Aucun membre visible.</ThemedText>
        )}
      </ThemedView>

      {/* Description / Demandes */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Description & Compétences</ThemedText>
        {groupe.demandes && groupe.demandes.length > 0 ? (
            groupe.demandes.map((demande) => (
                <ThemedView key={demande.id} style={styles.demandeCard}>
                    <ThemedText style={styles.demandeText}>{demande.texte}</ThemedText>
                    
                    {demande.competences && demande.competences.length > 0 && (
                        <ThemedView style={styles.tagsContainer}>
                            {demande.competences.map((comp) => (
                                <ThemedView key={comp.id} style={styles.tag}>
                                    <ThemedText style={styles.tagText}>{comp.nom}</ThemedText>
                                </ThemedView>
                            ))}
                        </ThemedView>
                    )}
                </ThemedView>
            ))
        ) : (
            <ThemedText style={styles.italicText}>Aucune description disponible.</ThemedText>
        )}
      </ThemedView>

    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
  headerImage: {
    position: 'absolute',
    bottom: -20,
    left: 20,
  },
  headerContainer: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
    gap: 8,
  },
  sectionTitle: {
    marginBottom: 8,
    opacity: 0.8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  italicText: {
    fontStyle: 'italic',
    opacity: 0.6,
  },
  usersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
  },
  userText: {
    fontSize: 14,
  },
  demandeCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
    gap: 12,
  },
  demandeText: {
    fontSize: 15,
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#E5E5EA',
  },
  tagText: {
    fontSize: 12,
    color: '#333',
  },
});
