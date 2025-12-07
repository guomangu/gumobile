import { StyleSheet, TextInput, Button, Alert } from 'react-native';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getApiUrl, API_ENDPOINTS } from '@/constants/api';

export default function SignupScreen() {
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [mail, setMail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'icon');

  const handleSignup = async () => {
    if (!pseudo.trim() || !password.trim() || !mail.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.USERS), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          pseudo: pseudo.trim(),
          password: password.trim(),
          mail: mail.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Si la réponse contient un token et un user, connecter automatiquement
      if (data.token && data.user && data.user.id && data.user.pseudo) {
        await AsyncStorage.setItem('authToken', data.token);
        await AsyncStorage.setItem('userId', data.user.id.toString());
        await AsyncStorage.setItem('userPseudo', data.user.pseudo);
        
        Alert.alert('Succès', `Compte créé avec succès ! Bienvenue ${data.user.pseudo} !`);
        
        // Rediriger vers l'écran d'accueil
        router.replace('/(tabs)/');
      } else {
        Alert.alert('Succès', 'Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
        router.replace('/(tabs)/login');
      }
    } catch (error: any) {
      console.error('Erreur lors de la création du compte:', error);
      Alert.alert(
        'Erreur',
        error.message || 'Une erreur est survenue lors de la création du compte'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>Créer un compte</ThemedText>
        
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
          
          <ThemedText style={styles.label}>Email</ThemedText>
          <TextInput
            style={[styles.input, { borderColor, color: textColor }]}
            placeholder="Entrez votre email..."
            placeholderTextColor={textColor + '80'}
            value={mail}
            onChangeText={setMail}
            keyboardType="email-address"
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
            title={loading ? 'Création...' : 'Créer le compte'}
            onPress={handleSignup}
            disabled={loading || !pseudo.trim() || !password.trim() || !mail.trim()}
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

