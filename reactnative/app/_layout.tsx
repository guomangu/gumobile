import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen 
          name="adresse/[id]" 
          options={{ 
            presentation: 'card',
            title: 'Détails de l\'adresse',
            headerStyle: { backgroundColor: '#B0E0E6' },
            headerTintColor: '#000000',
          }} 
        />
        <Stack.Screen 
          name="groupe/[id]" 
          options={{ 
            presentation: 'card',
            title: 'Détails du groupe',
            headerStyle: { backgroundColor: '#B0E0E6' },
            headerTintColor: '#000000',
          }} 
        />
        <Stack.Screen 
          name="worker/create" 
          options={{ 
            presentation: 'card',
            title: 'Créer un Worker',
            headerStyle: { backgroundColor: '#B0E0E6' },
            headerTintColor: '#000000',
          }} 
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
