import { StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Adresse } from '@/constants/api';

interface AddressTagProps {
  adresse: Adresse;
  style?: any;
}

export function AddressTag({ adresse, style }: AddressTagProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/adresse/${adresse.id}`);
  };

  return (
    <TouchableOpacity
      style={[styles.tag, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <ThemedText style={styles.tagText}>{adresse.valeur}</ThemedText>
      <ThemedText style={styles.tagType}>{adresse.type}</ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    gap: 4,
    minWidth: 100,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tagType: {
    fontSize: 11,
    opacity: 0.6,
  },
});

