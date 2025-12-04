import { StyleSheet, TextInput, Button, Alert } from 'react-native';
import { useState } from 'react';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getApiUrl, API_ENDPOINTS } from '@/constants/api';

interface CreateGroupeFormProps {
  onGroupeCreated: () => void;
}

export function CreateGroupeForm({ onGroupeCreated }: CreateGroupeFormProps) {
  const [nomGroupe, setNomGroupe] = useState('');
  const [loading, setLoading] = useState(false);
  
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'icon');

  const handleSubmit = async () => {
    if (!nomGroupe.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour le groupe');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.GROUPES), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          nom: nomGroupe.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}: ${response.statusText}`);
      }

      Alert.alert('Succès', `Groupe "${nomGroupe}" créé avec succès !`);
      setNomGroupe('');
      onGroupeCreated();
    } catch (error: any) {
      console.error('Erreur lors de la création du groupe:', error);
      Alert.alert(
        'Erreur',
        error.message || 'Une erreur est survenue lors de la création du groupe'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.formContainer}>
      <ThemedText type="subtitle">Créer un nouveau groupe</ThemedText>
      <TextInput
        style={[styles.input, { borderColor, color: textColor }]}
        placeholder="Nom du groupe..."
        placeholderTextColor={textColor + '80'}
        value={nomGroupe}
        onChangeText={setNomGroupe}
      />
      <Button
        title={loading ? 'Création...' : 'Créer le groupe'}
        onPress={handleSubmit}
        disabled={loading || !nomGroupe.trim()}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    gap: 12,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 44,
  },
});

