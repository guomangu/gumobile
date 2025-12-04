import { StyleSheet, TextInput, Button, Alert, View } from 'react-native';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getApiUrl } from '@/constants/api';

export default function LoginScreen() {
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'icon');

  const handleLogin = async () => {
    if (!pseudo.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(getApiUrl('login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          pseudo: pseudo.trim(),
          password: password.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Debug: afficher la réponse du serveur
      console.log('Réponse du serveur:', JSON.stringify(data, null, 2));
      
      // Le contrôleur personnalisé AuthController retourne { token: string, user: { id, pseudo, mail } }
      if (data.token && data.user && data.user.id && data.user.pseudo) {
        // Stocker le token et l'ID utilisateur
        await AsyncStorage.setItem('authToken', data.token);
        await AsyncStorage.setItem('userId', data.user.id.toString());
        await AsyncStorage.setItem('userPseudo', data.user.pseudo);
        
        Alert.alert('Succès', `Bienvenue ${data.user.pseudo} !`);
        
        // Rediriger vers l'écran d'accueil
        router.replace('/(tabs)/');
      } else {
        console.error('Format de réponse inattendu:', data);
        throw new Error('Réponse invalide du serveur. Format attendu: { token: string, user: { id, pseudo, mail } }. Reçu: ' + JSON.stringify(data));
      }
    } catch (error: any) {
      console.error('Erreur lors de la connexion:', error);
      Alert.alert(
        'Erreur',
        error.message || 'Une erreur est survenue lors de la connexion'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>Connexion</ThemedText>
        
        <ThemedView style={styles.formContainer}>
          <ThemedText style={styles.label}>Pseudo</ThemedText>
          <TextInput
            style={[styles.input, { borderColor, color: textColor }]}
            placeholder="Entrez votre pseudo..."
            placeholderTextColor={textColor + '80'}
            value={pseudo}
            onChangeText={setPseudo}
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <ThemedText style={styles.label}>Mot de passe</ThemedText>
          <TextInput
            style={[styles.input, { borderColor, color: textColor }]}
            placeholder="Entrez votre mot de passe..."
            placeholderTextColor={textColor + '80'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <Button
            title={loading ? 'Connexion...' : 'Se connecter'}
            onPress={handleLogin}
            disabled={loading || !pseudo.trim() || !password.trim()}
          />
        </ThemedView>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
  },
  formContainer: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 44,
  },
});

