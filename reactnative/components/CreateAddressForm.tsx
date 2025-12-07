import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Groupe } from '@/components/types';
import { WorkerForm } from './WorkerForm';
import { ProposeWorkForm } from './ProposeWorkForm';

interface CreateAddressFormProps {
  onAddressCreated: (groupe?: Groupe) => void;
}

export function CreateAddressForm({ onAddressCreated }: CreateAddressFormProps) {
  const [workMode, setWorkMode] = useState<'worker' | 'propose'>('worker');

  return (
    <ThemedView style={styles.formContainer}>
      <ThemedText type="subtitle">Créer une nouvelle adresse</ThemedText>
      
      {/* Sélecteur de mode avec les deux boutons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.workButton, workMode === 'worker' && styles.buttonActive]}
          onPress={() => setWorkMode('worker')}
        >
          <ThemedText style={[styles.workButtonText, workMode === 'worker' && styles.buttonTextActive]}>
            Je veux travailler
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.proposeButton, workMode === 'propose' && styles.buttonActive]}
          onPress={() => setWorkMode('propose')}
        >
          <ThemedText style={[styles.proposeButtonText, workMode === 'propose' && styles.buttonTextActive]}>
            Je propose un travail
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Affichage conditionnel du formulaire selon le mode */}
      {workMode === 'worker' ? (
        <WorkerForm onUpdate={() => {}} />
      ) : (
        <ProposeWorkForm onAddressCreated={onAddressCreated} />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    gap: 16,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  proposeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  workButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
  },
  buttonActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    borderWidth: 2,
    borderColor: '#000000',
  },
  proposeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  workButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

