import { useState, useEffect, useRef } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { searchAddresses, type BanAddressResult } from '@/constants/api';

interface AddressAutocompleteProps {
  onSelectAddress: (address: BanAddressResult) => void;
  placeholder?: string;
  style?: any;
}

export function AddressAutocomplete({ 
  onSelectAddress, 
  placeholder = "Rechercher une adresse...",
  style 
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<BanAddressResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'icon');

  useEffect(() => {
    // Annuler la recherche précédente
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Si la requête est vide, vider les suggestions
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Délai de 300ms avant de lancer la recherche (debounce)
    setLoading(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchAddresses(query, 5);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Erreur lors de la recherche d\'adresses:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query]);

  const handleSelectAddress = (address: BanAddressResult) => {
    setQuery(address.label);
    setShowSuggestions(false);
    onSelectAddress(address);
  };

  const renderSuggestion = ({ item }: { item: BanAddressResult }) => (
    <TouchableOpacity
      style={[
        styles.suggestionItem,
        {
          backgroundColor: backgroundColor,
          borderColor: borderColor,
        },
      ]}
      onPress={() => handleSelectAddress(item)}
    >
      <ThemedText type="defaultSemiBold" style={styles.suggestionLabel}>
        {item.label}
      </ThemedText>
      <ThemedText style={styles.suggestionDetails}>
        {item.postcode} {item.city}
      </ThemedText>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={[styles.container, style]}>
      <ThemedView style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: backgroundColor,
              color: textColor,
              borderColor: borderColor,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={borderColor}
          value={query}
          onChangeText={setQuery}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            // Délai pour permettre le clic sur une suggestion
            setTimeout(() => setShowSuggestions(false), 200);
          }}
        />
        {loading && (
          <ActivityIndicator
            size="small"
            color={borderColor}
            style={styles.loader}
          />
        )}
      </ThemedView>

      {showSuggestions && suggestions.length > 0 && (
        <ThemedView
          style={[
            styles.suggestionsContainer,
            {
              backgroundColor: backgroundColor,
              borderColor: borderColor,
            },
          ]}
        >
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.suggestionsList}
          />
        </ThemedView>
      )}

      {showSuggestions && suggestions.length === 0 && !loading && query.trim() && (
        <ThemedView
          style={[
            styles.suggestionsContainer,
            {
              backgroundColor: backgroundColor,
              borderColor: borderColor,
            },
          ]}
        >
          <ThemedText style={styles.noResults}>Aucune adresse trouvée</ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 44,
    paddingRight: 40,
  },
  loader: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  suggestionLabel: {
    marginBottom: 4,
  },
  suggestionDetails: {
    fontSize: 12,
    opacity: 0.7,
  },
  noResults: {
    padding: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

