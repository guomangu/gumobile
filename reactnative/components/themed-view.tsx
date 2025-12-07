import { View, type ViewProps, StyleSheet } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  cloudStyle?: boolean; // Option pour appliquer le style nuage
};

export function ThemedView({ style, lightColor, darkColor, cloudStyle = true, ...otherProps }: ThemedViewProps) {
  // Par défaut, les composants sont blancs avec transparence (style nuage)
  // Le fond bleu est réservé au fond général du site
  const defaultBackgroundColor = 'rgba(255, 255, 255, 0.8)';
  
  // Si lightColor ou darkColor est spécifié, utiliser le thème
  // Si cloudStyle est false, utiliser le fond du thème (pour les conteneurs principaux)
  const backgroundColor = cloudStyle === false && !lightColor && !darkColor
    ? useThemeColor({}, 'background')
    : lightColor || darkColor
    ? useThemeColor({ light: lightColor, dark: darkColor }, 'background')
    : defaultBackgroundColor;

  return (
    <View 
      style={[
        cloudStyle && styles.cloudContainer,
        { backgroundColor },
        style
      ]} 
      {...otherProps} 
    />
  );
}

const styles = StyleSheet.create({
  cloudContainer: {
    borderRadius: 16,
  },
});
