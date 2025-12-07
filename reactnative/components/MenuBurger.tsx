import { StyleSheet, TouchableOpacity, Modal, Pressable, TextInput, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getApiUrl } from '@/constants/api';
import { authEvents, AUTH_EVENTS } from '@/utils/authEvents';

interface MenuBurgerProps {
  authToken: string | null;
  userPseudo: string | null;
  onLogout: () => void;
  onLoginSuccess?: () => void;
}

export function MenuBurger({ authToken, userPseudo, onLogout, onLoginSuccess }: MenuBurgerProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
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
      
      if (data.token && data.user && data.user.id && data.user.pseudo) {
        await AsyncStorage.setItem('authToken', data.token);
        await AsyncStorage.setItem('userId', data.user.id.toString());
        await AsyncStorage.setItem('userPseudo', data.user.pseudo);
        
        setPseudo('');
        setPassword('');
        setIsMenuOpen(false);
        
        // Émettre un événement de connexion pour notifier toutes les pages
        authEvents.emit(AUTH_EVENTS.LOGIN, data.user);
        
        // Rafraîchir l'état d'authentification
        if (onLoginSuccess) {
          onLoginSuccess();
        }
        
        // Attendre un peu pour que les callbacks se déclenchent
        setTimeout(() => {
          Alert.alert('Succès', `Bienvenue ${data.user.pseudo} !`);
        }, 100);
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
    setIsMenuOpen(false);
    router.push('/(tabs)/signup');
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    // Émettre un événement de déconnexion pour notifier toutes les pages
    authEvents.emit(AUTH_EVENTS.LOGOUT);
    onLogout();
  };

  return (
    <>
      <TouchableOpacity
        style={styles.burgerButton}
        onPress={() => setIsMenuOpen(true)}
        activeOpacity={0.7}
      >
        <MaterialIcons name="menu" size={28} color={textColor} />
      </TouchableOpacity>

      <Modal
        visible={isMenuOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsMenuOpen(false)}
        >
          <Pressable
            style={[styles.menuContainer, { backgroundColor, borderColor }]}
            onPress={(e) => e.stopPropagation()}
            onStartShouldSetResponder={() => true}
          >
            <ThemedView style={styles.menuHeader}>
              <ThemedText type="defaultSemiBold" style={styles.menuTitle}>
                Menu
              </ThemedText>
              <TouchableOpacity
                onPress={() => setIsMenuOpen(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </ThemedView>

            {authToken && userPseudo ? (
              <>
                <ThemedView style={styles.userInfo}>
                  <ThemedText style={styles.userPseudo}>
                    👤 {userPseudo}
                  </ThemedText>
                </ThemedView>
                <TouchableOpacity
                  style={[styles.menuItem, { borderColor }]}
                  onPress={handleLogout}
                >
                  <MaterialIcons name="logout" size={20} color="#ff3b30" />
                  <ThemedText style={[styles.menuItemText, { color: '#ff3b30' }]}>
                    Déconnexion
                  </ThemedText>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <ThemedView style={styles.loginForm}>
                  <ThemedText style={styles.formTitle}>Connexion</ThemedText>
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
                      {loading ? 'Connexion...' : 'Se connecter'}
                    </ThemedText>
                  </TouchableOpacity>
                </ThemedView>
                <TouchableOpacity
                  style={[styles.signupButton, { borderColor }]}
                  onPress={handleSignup}
                >
                  <MaterialIcons name="person-add" size={20} color={textColor} />
                  <ThemedText style={styles.signupButtonText}>
                    Créer un compte
                  </ThemedText>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  burgerButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  menuContainer: {
    minWidth: 280,
    maxWidth: 320,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  menuTitle: {
    fontSize: 18,
  },
  closeButton: {
    padding: 4,
  },
  userInfo: {
    paddingVertical: 8,
    marginBottom: 4,
  },
  userPseudo: {
    fontSize: 14,
    opacity: 0.8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 4,
  },
  menuItemText: {
    fontSize: 16,
  },
  loginForm: {
    gap: 12,
    width: '100%',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 44,
    width: '100%',
  },
  loginButton: {
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 4,
  },
  signupButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
});

