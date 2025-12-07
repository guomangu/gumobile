import { StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getApiUrl } from '@/constants/api';

interface HeaderLoginFormProps {
  onLoginSuccess: () => void;
}

export function HeaderLoginForm({ onLoginSuccess }: HeaderLoginFormProps) {
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'icon');
  const backgroundColor = useThemeColor({}, 'background');

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
      
      if (data.token && data.user && data.user.id && data.user.pseudo) {
        await AsyncStorage.setItem('authToken', data.token);
        await AsyncStorage.setItem('userId', data.user.id.toString());
        await AsyncStorage.setItem('userPseudo', data.user.pseudo);
        
        setPseudo('');
        setPassword('');
        onLoginSuccess();
      } else {
        throw new Error('Réponse invalide du serveur');
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

  const handleSignup = () => {
    router.push('/(tabs)/signup');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.formRow}>
        <TextInput
          style={[styles.input, { borderColor, color: textColor, backgroundColor }]}
          placeholder="Pseudo"
          placeholderTextColor={textColor + '80'}
          value={pseudo}
          onChangeText={setPseudo}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={[styles.input, { borderColor, color: textColor, backgroundColor }]}
          placeholder="Mot de passe"
          placeholderTextColor={textColor + '80'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.loginButton, { backgroundColor: '#007AFF' }]}
          onPress={handleLogin}
          disabled={loading || !pseudo.trim() || !password.trim()}
        >
          <ThemedText style={styles.loginButtonText}>
            {loading ? '...' : 'Connexion'}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
      <TouchableOpacity
        style={styles.signupButton}
        onPress={handleSignup}
      >
        <ThemedText style={styles.signupButtonText}>
          Créer un compte
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
    paddingRight: 4,
    maxWidth: 300,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    minHeight: 28,
    width: 90,
  },
  loginButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  signupButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignSelf: 'flex-end',
  },
  signupButtonText: {
    fontSize: 10,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});

