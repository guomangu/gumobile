import { StyleSheet, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getApiUrl, API_ENDPOINTS } from '@/constants/api';
import { useThemeColor } from '@/hooks/use-theme-color';

interface GroupData {
  id: number;
  nom: string;
  type?: string; // 'OFFRE' | 'DEMANDE'
  adresse?: string;
  description?: string;
}

interface UserProfile {
  id: number;
  pseudo: string;
  mail: string;
  groupesData: GroupData[];
}

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (!id) return;
        setLoading(true);
        const response = await fetch(getApiUrl(`${API_ENDPOINTS.USERS}/${id}`), {
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser(data);
        }
      } catch (error) {
        console.error('Erreur chargement profil:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, [id]);

  const renderGroupItem = ({ item }: { item: GroupData }) => {
    const isOffre = item.type === 'OFFRE';
    // Style distinctif pour Offre vs Demande
    const badgeColor = isOffre ? '#34C759' : '#007AFF'; // Vert pour Offre, Bleu pour Demande
    const badgeText = isOffre ? 'Offre' : 'Demande';

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => router.push(`/groupe/${item.id}`)}
      >
        <ThemedView style={styles.cardHeader}>
          <ThemedView style={[styles.badge, { backgroundColor: badgeColor }]}>
            <ThemedText style={styles.badgeText}>{badgeText}</ThemedText>
          </ThemedView>
          <ThemedText type="defaultSemiBold" style={{flex: 1, marginLeft: 8}}>{item.nom}</ThemedText>
        </ThemedView>

        {item.adresse && (
          <ThemedView style={styles.row}>
            <IconSymbol name="house.fill" size={14} color={textColor} style={{ opacity: 0.6 }} />
            <ThemedText style={styles.infoText} numberOfLines={1}>{item.adresse}</ThemedText>
          </ThemedView>
        )}

        {item.description && (
          <ThemedText style={styles.description} numberOfLines={3}>
            {item.description}
          </ThemedText>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
        <ThemedView style={styles.centered}>
            <ActivityIndicator size="large" />
        </ThemedView>
    );
  }

  if (!user) {
    return (
        <ThemedView style={styles.centered}>
            <ThemedText>Utilisateur introuvable</ThemedText>
        </ThemedView>
    );
  }

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
        <ThemedText type="title">{user.pseudo}</ThemedText>
        <ThemedText style={styles.subtitle}>Profil Public</ThemedText>
      </ThemedView>

      <ThemedView style={styles.sectionContainer}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
            Ses Groupes ({user.groupesData?.length || 0})
        </ThemedText>
        
        <FlatList
            data={user.groupesData}
            renderItem={renderGroupItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
                <ThemedText style={{ fontStyle: 'italic', opacity: 0.6 }}>
                    Aucun groupe public.
                </ThemedText>
            }
        />
      </ThemedView>

    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerImage: {
    position: 'absolute',
    bottom: -20,
    left: 20,
  },
  headerContainer: {
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.6,
  },
  sectionContainer: {
    gap: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  listContainer: {
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)', // Ou utiliser une couleur themée pour la carte
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
  },
  infoText: {
    fontSize: 12,
    opacity: 0.6,
    flex: 1,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});

