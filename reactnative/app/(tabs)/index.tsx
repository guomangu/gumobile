import { Image } from 'expo-image';
import { StyleSheet, Button, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CreateAddressForm } from '@/components/CreateAddressForm';

export default function HomeScreen() {
  // États pour l'authentification
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUserPseudo, setCurrentUserPseudo] = useState<string | null>(null);

  useEffect(() => {
    loadAuthToken();
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
      const userPseudo = await AsyncStorage.getItem('userPseudo');
      if (token) {
        setAuthToken(token);
      }
      if (userPseudo) {
        setCurrentUserPseudo(userPseudo);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du token:', error);
    }
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

  const handleAddressCreated = () => {
    // Cette fonction peut être utilisée pour rafraîchir les données si nécessaire
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

      <CreateAddressForm onAddressCreated={handleAddressCreated} />
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
});
