import { StyleSheet, TextInput, Button, Alert } from 'react-native';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getApiUrl, API_ENDPOINTS } from '@/constants/api';
import { type User } from './types';

interface UserSectionProps {
  groupeId: number;
  users: User[];
  authToken: string | null;
  currentUserId: number | null;
  onUpdate: () => void;
}

export function UserSection({ groupeId, users, authToken, currentUserId, onUpdate }: UserSectionProps) {
  const [userPseudo, setUserPseudo] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userMail, setUserMail] = useState('');
  const [loadingUser, setLoadingUser] = useState(false);
  
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'icon');
  
  const hasUsers = users.length > 0;
  const isCurrentUserInGroupe = currentUserId && users.some(user => user.id === currentUserId);

  const handleCreateUser = async () => {
    if (!userPseudo.trim() || !userPassword.trim() || !userMail.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoadingUser(true);
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.USERS), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          pseudo: userPseudo.trim(),
          password: userPassword.trim(),
          mail: userMail.trim(),
          groupes: [`/api/groupes/${groupeId}`],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      
      if (responseData.token && responseData.user) {
        await AsyncStorage.setItem('authToken', responseData.token);
        await AsyncStorage.setItem('userId', responseData.user.id.toString());
        await AsyncStorage.setItem('userPseudo', responseData.user.pseudo);
        Alert.alert('Succès', 'Utilisateur créé et connecté automatiquement !');
      } else {
        Alert.alert('Succès', 'Utilisateur créé et lié au groupe avec succès !');
      }
      
      setUserPseudo('');
      setUserPassword('');
      setUserMail('');
      onUpdate();
    } catch (error: any) {
      console.error('Erreur lors de la création de l\'utilisateur:', error);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue lors de la création de l\'utilisateur');
    } finally {
      setLoadingUser(false);
    }
  };

  const handleJoinGroupe = async () => {
    if (!authToken || !currentUserId) {
      Alert.alert('Erreur', 'Vous devez être connecté pour participer à un groupe');
      return;
    }

    setLoadingUser(true);
    try {
      const userResponse = await fetch(getApiUrl(`${API_ENDPOINTS.USERS}/${currentUserId}`), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error(`Erreur ${userResponse.status}: ${userResponse.statusText}`);
      }

      const userData = await userResponse.json();
      const groupesData = userData.groupesData || userData.groupes || [];
      const isAlreadyInGroupe = groupesData.some((g: { id: number }) => g.id === groupeId);
      
      if (isAlreadyInGroupe) {
        Alert.alert('Information', 'Vous participez déjà à ce groupe');
        setLoadingUser(false);
        return;
      }

      const updatedGroupes = [
        ...groupesData.map((g: { id: number }) => `/api/groupes/${g.id}`),
        `/api/groupes/${groupeId}`,
      ];

      const updateResponse = await fetch(getApiUrl(`${API_ENDPOINTS.USERS}/${currentUserId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/merge-patch+json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          groupes: updatedGroupes,
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${updateResponse.status}: ${updateResponse.statusText}`);
      }

      Alert.alert('Succès', 'Vous participez maintenant à ce groupe !');
      onUpdate();
    } catch (error: any) {
      console.error('Erreur lors de la participation au groupe:', error);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue lors de la participation au groupe');
    } finally {
      setLoadingUser(false);
    }
  };

  if (hasUsers) {
    return (
      <ThemedView style={styles.usersContainer}>
        <ThemedText style={styles.usersLabel}>Utilisateurs du groupe:</ThemedText>
        {users.map((user) => (
          <ThemedView key={user.id} style={styles.userItem}>
            <ThemedText style={styles.userPseudo}>{user.pseudo}</ThemedText>
            <ThemedText style={styles.userMail}>{user.mail}</ThemedText>
            <ThemedText style={styles.userId}>ID: {user.id}</ThemedText>
          </ThemedView>
        ))}
        {authToken && currentUserId && !isCurrentUserInGroupe && (
          <ThemedView style={styles.joinGroupeContainer}>
            <Button
              title={loadingUser ? 'Participation...' : 'Participer au groupe'}
              onPress={handleJoinGroupe}
              disabled={loadingUser}
            />
          </ThemedView>
        )}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.createUserContainer}>
      {authToken && currentUserId ? (
        <>
          <ThemedText style={styles.createUserLabel}>Vous êtes connecté</ThemedText>
          <Button
            title={loadingUser ? 'Participation...' : 'Participer au groupe'}
            onPress={handleJoinGroupe}
            disabled={loadingUser}
          />
        </>
      ) : (
        <>
          <ThemedText style={styles.createUserLabel}>Créer un utilisateur pour ce groupe:</ThemedText>
          <TextInput
            style={[styles.userInput, { borderColor, color: textColor }]}
            placeholder="Pseudo..."
            placeholderTextColor={textColor + '80'}
            value={userPseudo}
            onChangeText={setUserPseudo}
          />
          <TextInput
            style={[styles.userInput, { borderColor, color: textColor }]}
            placeholder="Email..."
            placeholderTextColor={textColor + '80'}
            value={userMail}
            onChangeText={setUserMail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.userInput, { borderColor, color: textColor }]}
            placeholder="Mot de passe..."
            placeholderTextColor={textColor + '80'}
            value={userPassword}
            onChangeText={setUserPassword}
            secureTextEntry
          />
          <Button
            title={loadingUser ? 'Création...' : 'Créer l\'utilisateur'}
            onPress={handleCreateUser}
            disabled={loadingUser || !userPseudo.trim() || !userPassword.trim() || !userMail.trim()}
          />
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  usersContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 8,
  },
  usersLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
  },
  userItem: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.02)',
    gap: 4,
  },
  userPseudo: {
    fontSize: 14,
    fontWeight: '500',
  },
  userMail: {
    fontSize: 12,
    opacity: 0.7,
  },
  userId: {
    fontSize: 11,
    opacity: 0.6,
  },
  createUserContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 8,
  },
  createUserLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
  },
  userInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    minHeight: 40,
  },
  joinGroupeContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
});

