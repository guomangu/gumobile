import { StyleSheet, Button, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { importAddress, type BanAddressResult, type Adresse } from '@/constants/api';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { type Groupe } from '@/components/types';
import { AddressTag } from './AddressTag';

interface CreateAddressFormProps {
  onAddressCreated: (groupe?: Groupe) => void;
}

export function CreateAddressForm({ onAddressCreated }: CreateAddressFormProps) {
  const router = useRouter();
  const [selectedAddress, setSelectedAddress] = useState<BanAddressResult | null>(null);
  const [complementAdresse, setComplementAdresse] = useState('');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [createdAddresses, setCreatedAddresses] = useState<Adresse[]>([]);

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
      
      // Stocker les adresses créées pour les afficher comme tags
      if (newAddress.groupe?.adresses && Array.isArray(newAddress.groupe.adresses)) {
        setCreatedAddresses(newAddress.groupe.adresses);
      }
      
      setSelectedAddress(null);
      setComplementAdresse('');
      // Passer le groupe créé au callback si disponible
      const groupe: Groupe | undefined = newAddress.groupe ? {
        id: newAddress.groupe.id,
        nom: newAddress.groupe.nom,
        adresses: newAddress.groupe.adresses?.map(addr => ({
          id: addr.id,
          type: addr.type,
          valeur: addr.valeur,
        })),
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
      
      {/* Afficher les adresses créées comme tags cliquables */}
      {createdAddresses.length > 0 && (
        <ThemedView style={styles.addressesSection}>
          <ThemedText style={styles.addressesLabel}>Adresses créées:</ThemedText>
          <ThemedView style={styles.addressesTags}>
            {createdAddresses.map((adresse) => (
              <AddressTag key={adresse.id} adresse={adresse} />
            ))}
          </ThemedView>
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
    gap: 16,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  selectedAddressContainer: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
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
  addressesSection: {
    marginTop: 12,
    gap: 8,
  },
  addressesLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
    marginBottom: 8,
    paddingBottom: 4,
  },
  addressesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});

