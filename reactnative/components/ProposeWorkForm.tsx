import { StyleSheet, Alert, Platform, TouchableOpacity, View } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { importAddress, reverseGeocode, type BanAddressResult, type Adresse } from '@/constants/api';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { type Groupe } from '@/components/types';
import { AddressTag } from './AddressTag';

interface ProposeWorkFormProps {
  onAddressCreated: (groupe?: Groupe) => void;
}

export function ProposeWorkForm({ onAddressCreated }: ProposeWorkFormProps) {
  const [selectedAddress, setSelectedAddress] = useState<BanAddressResult | null>(null);
  const [complementAdresse, setComplementAdresse] = useState('');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [createdAddresses, setCreatedAddresses] = useState<Adresse[]>([]);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [initialAddress, setInitialAddress] = useState<BanAddressResult | null>(null);
  const hasRequestedLocation = useRef(false);

  useEffect(() => {
    const requestLocation = async () => {
      if (hasRequestedLocation.current) return;
      hasRequestedLocation.current = true;

      try {
        setLoadingLocation(true);
        
        let latitude: number;
        let longitude: number;

        if (Platform.OS === 'web') {
          if (!navigator.geolocation) {
            console.log('Géolocalisation non supportée par le navigateur');
            setLoadingLocation(false);
            return;
          }

          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 60000,
            });
          });

          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } else {
          try {
            const Location = await import('expo-location');
            
            const { status } = await Location.requestForegroundPermissionsAsync();
            
            if (status !== 'granted') {
              console.log('Permission de géolocalisation refusée');
              setLoadingLocation(false);
              return;
            }

            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });

            latitude = location.coords.latitude;
            longitude = location.coords.longitude;
          } catch (error) {
            console.error('Erreur lors du chargement de expo-location:', error);
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 60000,
              });
            });
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;
          }
        }

        const address = await reverseGeocode(latitude, longitude);

        if (address) {
          setInitialAddress(address);
          setSelectedAddress(address);
        }
      } catch (error) {
        console.error('Erreur lors de la géolocalisation:', error);
      } finally {
        setLoadingLocation(false);
      }
    };

    requestLocation();
  }, []);

  const handleSelectAddress = (address: BanAddressResult) => {
    setSelectedAddress(address);
  };

  const handleProposeTravail = async () => {
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
      
      if (newAddress.groupe?.adresses && Array.isArray(newAddress.groupe.adresses)) {
        setCreatedAddresses(newAddress.groupe.adresses);
      }
      
      setSelectedAddress(null);
      setComplementAdresse('');
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
      <ThemedText type="subtitle">Je propose un travail</ThemedText>
      {loadingLocation && (
        <ThemedText style={styles.loadingText}>
          📍 Détection de votre localisation...
        </ThemedText>
      )}
      <AddressAutocomplete
        onSelectAddress={handleSelectAddress}
        placeholder="Rechercher une adresse..."
        initialValue={initialAddress}
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
      
      <TouchableOpacity
        style={[styles.button, styles.proposeButton, (loadingAddress || !selectedAddress) && styles.buttonDisabled]}
        onPress={handleProposeTravail}
        disabled={loadingAddress || !selectedAddress}
      >
        <ThemedText style={styles.proposeButtonText}>
          {loadingAddress ? 'Création...' : 'Je propose un travail'}
        </ThemedText>
      </TouchableOpacity>
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
  loadingText: {
    fontSize: 12,
    opacity: 0.7,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  button: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    margin: 5,
  },
  proposeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  proposeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});

