import { StyleSheet, Button, Alert } from 'react-native';
import { useState } from 'react';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { importAddress, type BanAddressResult, type Adresse } from '@/constants/api';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { type Groupe } from '@/components/types';

interface CreateAddressFormProps {
  onAddressCreated: (groupe?: Groupe) => void;
}

export function CreateAddressForm({ onAddressCreated }: CreateAddressFormProps) {
  const [selectedAddress, setSelectedAddress] = useState<BanAddressResult | null>(null);
  const [complementAdresse, setComplementAdresse] = useState('');
  const [loadingAddress, setLoadingAddress] = useState(false);

  const handleSelectAddress = (address: BanAddressResult) => {
    setSelectedAddress(address);
  };

  const handleCreateAddress = async () => {
    if (!selectedAddress) {
      Alert.alert('Erreur', 'Veuillez sélectionner une adresse');
      return;
    }

    setLoadingAddress(true);
    try {
      const newAddress = await importAddress(selectedAddress.label, complementAdresse.trim() || undefined);
      const message = newAddress.groupe 
        ? `Adresse "${selectedAddress.label}" créée avec succès !\nGroupe "${newAddress.groupe.nom}" créé avec ${newAddress.groupe.adresses?.length || 0} tags.`
        : `Adresse "${selectedAddress.label}" créée avec succès !`;
      Alert.alert('Succès', message);
      setSelectedAddress(null);
      setComplementAdresse('');
      // Passer le groupe créé au callback si disponible
      const groupe: Groupe | undefined = newAddress.groupe ? {
        id: newAddress.groupe.id,
        nom: newAddress.groupe.nom,
      } : undefined;
      onAddressCreated(groupe);
    } catch (error: any) {
      console.error('Erreur lors de la création de l\'adresse:', error);
      Alert.alert(
        'Erreur',
        error.message || 'Une erreur est survenue lors de la création de l\'adresse'
      );
    } finally {
      setLoadingAddress(false);
    }
  };

  return (
    <ThemedView style={styles.formContainer}>
      <ThemedText type="subtitle">Créer une nouvelle adresse</ThemedText>
      <AddressAutocomplete
        onSelectAddress={handleSelectAddress}
        placeholder="Rechercher une adresse..."
      />
      {selectedAddress && (
        <ThemedView style={styles.selectedAddressContainer}>
          <ThemedText type="defaultSemiBold" style={styles.selectedAddressLabel}>
            Adresse sélectionnée:
          </ThemedText>
          <ThemedText style={styles.selectedAddressText}>
            {selectedAddress.label}
          </ThemedText>
          <ThemedText style={styles.selectedAddressDetails}>
            {selectedAddress.postcode} {selectedAddress.city}
          </ThemedText>
        </ThemedView>
      )}
      <Button
        title={loadingAddress ? 'Création...' : 'Créer l\'adresse'}
        onPress={handleCreateAddress}
        disabled={loadingAddress || !selectedAddress}
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
  selectedAddressContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  selectedAddressLabel: {
    marginBottom: 4,
  },
  selectedAddressText: {
    fontSize: 14,
  },
  selectedAddressDetails: {
    fontSize: 12,
    opacity: 0.7,
  },
});

