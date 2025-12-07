import { Tabs, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, StyleSheet, Alert } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { MenuBurger } from '@/components/MenuBurger';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userPseudo, setUserPseudo] = useState<string | null>(null);

  const loadAuthState = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const pseudo = await AsyncStorage.getItem('userPseudo');
      setAuthToken(token);
      setUserPseudo(pseudo);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'état d\'authentification:', error);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('userPseudo');
      setAuthToken(null);
      setUserPseudo(null);
      // L'événement LOGOUT est déjà émis par MenuBurger
      Alert.alert('Déconnexion', 'Vous avez été déconnecté avec succès');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la déconnexion');
    }
  }, []);

  // Recharger l'état d'authentification quand l'écran est focus
  useFocusEffect(
    useCallback(() => {
      loadAuthState();
    }, [loadAuthState])
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,
        headerRight: () => (
          <View style={styles.headerRight}>
            <MenuBurger
              authToken={authToken}
              userPseudo={userPseudo}
              onLogout={handleLogout}
              onLoginSuccess={loadAuthState}
            />
          </View>
        ),
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="groupe"
        options={{
          title: 'Groupes',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.3.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="login"
        options={{
          title: 'Connexion',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="signup"
        options={{
          title: 'Créer un compte',
          href: null, // Masquer de la barre de navigation
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    marginRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
