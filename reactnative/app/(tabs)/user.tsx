import { StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getApiUrl, API_ENDPOINTS } from '@/constants/api';
import { type User } from '@/components/types';
import { authEvents, AUTH_EVENTS } from '@/utils/authEvents';

export default function UserScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  
  // États pour l'édition
  const [isEditing, setIsEditing] = useState(false);
  const [editPseudo, setEditPseudo] = useState('');
  const [editMail, setEditMail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'icon');

  const loadAuthState = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userIdStr = await AsyncStorage.getItem('userId');
      setAuthToken(token);
      if (userIdStr) {
        setUserId(parseInt(userIdStr, 10));
      } else {
        setUserId(null);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'état d\'authentification:', error);
    }
  }, []);

  const loadUser = useCallback(async () => {
    if (!authToken || !userId) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(getApiUrl(`${API_ENDPOINTS.USERS}/${userId}`), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token invalide, déconnexion
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('userId');
          await AsyncStorage.removeItem('userPseudo');
          setAuthToken(null);
          setUserId(null);
          setUser(null);
          Alert.alert('Session expirée', 'Veuillez vous reconnecter');
          router.replace('/(tabs)/login');
          return;
        }
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const userData = await response.json();
      setUser(userData);
      setEditPseudo(userData.pseudo || '');
      setEditMail(userData.mail || '');
    } catch (error: any) {
      console.error('Erreur lors du chargement de l\'utilisateur:', error);
      Alert.alert('Erreur', error.message || 'Impossible de charger les informations utilisateur');
    } finally {
      setLoading(false);
    }
  }, [authToken, userId, router]);

  useEffect(() => {
    loadAuthState();
  }, [loadAuthState]);

  useEffect(() => {
    if (authToken && userId) {
      loadUser();
    }
  }, [authToken, userId, loadUser]);

  // Écouter les événements de connexion/déconnexion
  useFocusEffect(
    useCallback(() => {
      loadAuthState();
      
      const handleLogin = () => {
        loadAuthState();
      };
      
      const handleLogout = () => {
        setUser(null);
        setAuthToken(null);
        setUserId(null);
      };

      authEvents.on(AUTH_EVENTS.LOGIN, handleLogin);
      authEvents.on(AUTH_EVENTS.LOGOUT, handleLogout);

      return () => {
        authEvents.off(AUTH_EVENTS.LOGIN, handleLogin);
        authEvents.off(AUTH_EVENTS.LOGOUT, handleLogout);
      };
    }, [loadAuthState])
  );

  const handleSave = async () => {
    if (!authToken || !userId) {
      Alert.alert('Erreur', 'Vous devez être connecté pour modifier votre profil');
      return;
    }

    if (!editPseudo.trim() || !editMail.trim()) {
      Alert.alert('Erreur', 'Le pseudo et l\'email sont obligatoires');
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        pseudo: editPseudo.trim(),
        mail: editMail.trim(),
      };

      // Ne mettre à jour le mot de passe que s'il est fourni
      if (editPassword.trim()) {
        updateData.password = editPassword.trim();
      }

      const response = await fetch(getApiUrl(`${API_ENDPOINTS.USERS}/${userId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}: ${response.statusText}`);
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      setIsEditing(false);
      setEditPassword('');
      
      // Mettre à jour le pseudo dans AsyncStorage si changé
      if (updatedUser.pseudo) {
        await AsyncStorage.setItem('userPseudo', updatedUser.pseudo);
      }

      Alert.alert('Succès', 'Votre profil a été mis à jour');
      loadUser();
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      Alert.alert('Erreur', error.message || 'Impossible de mettre à jour le profil');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setEditPseudo(user.pseudo || '');
      setEditMail(user.mail || '');
    }
    setEditPassword('');
    setIsEditing(false);
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

  if (!authToken || !userId || !user) {
    return (
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}>
        <ThemedView style={styles.container} cloudStyle={false}>
          <ThemedText type="title" style={styles.title}>Mon compte</ThemedText>
          <ThemedText style={styles.notConnectedText}>
            Vous n'êtes pas connecté
          </ThemedText>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/(tabs)/login')}
          >
            <ThemedText style={styles.loginButtonText}>Se connecter</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}>
      <ThemedView style={styles.container} cloudStyle={false}>
        <ThemedText type="title" style={styles.title}>Mon compte</ThemedText>

        {!isEditing ? (
          <>
            <ThemedView style={styles.infoSection}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>Informations</ThemedText>
              <ThemedView style={styles.infoItem}>
                <ThemedText style={styles.infoLabel}>Pseudo:</ThemedText>
                <ThemedText style={styles.infoValue}>{user.pseudo}</ThemedText>
              </ThemedView>
              <ThemedView style={styles.infoItem}>
                <ThemedText style={styles.infoLabel}>Email:</ThemedText>
                <ThemedText style={styles.infoValue}>{user.mail}</ThemedText>
              </ThemedView>
              <ThemedView style={styles.infoItem}>
                <ThemedText style={styles.infoLabel}>ID:</ThemedText>
                <ThemedText style={styles.infoValue}>{user.id}</ThemedText>
              </ThemedView>
            </ThemedView>

            {(user.groupes || user.groupesData) && (user.groupes || user.groupesData)!.length > 0 && (
              <ThemedView style={styles.groupesSection}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>Mes groupes</ThemedText>
                {(user.groupes || user.groupesData || []).map((groupe) => (
                  <TouchableOpacity
                    key={groupe.id}
                    style={styles.groupeItem}
                    onPress={() => router.push(`/groupe/${groupe.id}`)}
                  >
                    <ThemedText type="defaultSemiBold">{groupe.nom}</ThemedText>
                    <ThemedText style={styles.groupeId}>ID: {groupe.id}</ThemedText>
                  </TouchableOpacity>
                ))}
              </ThemedView>
            )}

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <ThemedText style={styles.editButtonText}>Modifier mon profil</ThemedText>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <ThemedView style={styles.editSection}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>Modifier mon profil</ThemedText>
              
              <ThemedText style={styles.inputLabel}>Pseudo:</ThemedText>
              <TextInput
                style={[styles.input, { borderColor, color: textColor }]}
                placeholder="Pseudo..."
                placeholderTextColor={textColor + '80'}
                value={editPseudo}
                onChangeText={setEditPseudo}
              />

              <ThemedText style={styles.inputLabel}>Email:</ThemedText>
              <TextInput
                style={[styles.input, { borderColor, color: textColor }]}
                placeholder="Email..."
                placeholderTextColor={textColor + '80'}
                value={editMail}
                onChangeText={setEditMail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <ThemedText style={styles.inputLabel}>Nouveau mot de passe (optionnel):</ThemedText>
              <TextInput
                style={[styles.input, { borderColor, color: textColor }]}
                placeholder="Laisser vide pour ne pas changer"
                placeholderTextColor={textColor + '80'}
                value={editPassword}
                onChangeText={setEditPassword}
                secureTextEntry
              />

              <ThemedView style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.buttonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <ThemedText style={styles.saveButtonText}>
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  disabled={saving}
                >
                  <ThemedText style={styles.cancelButtonText}>Annuler</ThemedText>
                </TouchableOpacity>
              </ThemedView>
            </ThemedView>
          </>
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
  title: {
    marginBottom: 8,
  },
  notConnectedText: {
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
    opacity: 0.7,
  },
  loginButton: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    marginTop: 12,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    gap: 12,
    marginTop: 8,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  infoValue: {
    fontSize: 14,
  },
  groupesSection: {
    gap: 12,
    marginTop: 8,
  },
  groupeItem: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    gap: 6,
    marginBottom: 8,
  },
  groupeId: {
    fontSize: 12,
    opacity: 0.6,
  },
  editButton: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    marginTop: 12,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  editSection: {
    gap: 16,
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    margin: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

