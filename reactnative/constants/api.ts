import { Platform } from 'react-native';

/**
 * Configuration de l'API Symfony
 * 
 * Sur Android Emulator, utilisez 10.0.2.2 au lieu de localhost
 * Sur iOS Simulator et Web, utilisez localhost
 * Sur un appareil physique, utilisez l'adresse IP locale de votre machine
 */
const getApiBaseUrl = (): string => {
  // Pour Android Emulator
  if (Platform.OS === 'android') {
    // Utilisez 10.0.2.2 pour l'émulateur Android
    // Pour un appareil physique, remplacez par l'IP locale de votre machine
    return 'http://10.0.2.2:9080';
  }
  
  // Pour iOS Simulator et Web
  return 'http://localhost:9080';
};

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  API_PREFIX: '/api',
} as const;

/**
 * Construit l'URL complète pour un endpoint de l'API
 */
export const getApiUrl = (endpoint: string): string => {
  // Enlève le slash initial s'il existe pour éviter les doubles slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_CONFIG.BASE_URL}${API_CONFIG.API_PREFIX}/${cleanEndpoint}`;
};

/**
 * Endpoints de l'API
 */
export const API_ENDPOINTS = {
  GROUPES: 'groupes',
  ADRESSES: 'adresses',
  DEMANDES: 'demandes',
  COMPETENCES: 'competences',
} as const;


// Configuration de l'API BAN (Base Adresse Nationale)
const BAN_API_URL = 'https://api-adresse.data.gouv.fr/search/';

export interface BanAddressResult {
  id: string;
  label: string;
  housenumber?: string;
  street: string;
  postcode: string;
  city: string;
  context: string;
  type: string;
  importance: number;
  longitude: number;
  latitude: number;
}

export interface Adresse {
  id: number;
  type: 'pays' | 'region' | 'ville' | 'rue' | 'numrue';
  valeur: string;
  latitude?: number;
  longitude?: number;
  parent?: {
    id: number;
    type: string;
    valeur: string;
  };
  enfants?: Adresse[];
  groupe?: {
    id: number;
    nom: string;
    adresses?: Adresse[];
  };
}

/**
 * Recherche d'adresses via l'API BAN (Base Adresse Nationale)
 */
export async function searchAddresses(query: string, limit: number = 5): Promise<BanAddressResult[]> {
  try {
    const response = await fetch(`${BAN_API_URL}?q=${encodeURIComponent(query)}&limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`Erreur API BAN: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.features || !Array.isArray(data.features)) {
      return [];
    }
    
    return data.features.map((feature: any) => {
      const props = feature.properties || {};
      const coords = feature.geometry?.coordinates || [];
      
      return {
        id: feature.id || '',
        label: props.label || '',
        housenumber: props.housenumber || undefined,
        street: props.street || '',
        postcode: props.postcode || '',
        city: props.city || '',
        context: props.context || '',
        type: props.type || '',
        importance: props.importance || 0,
        longitude: coords[0] || 0,
        latitude: coords[1] || 0,
      };
    });
  } catch (error) {
    console.error('Erreur lors de la recherche d\'adresses:', error);
    throw error;
  }
}

/**
 * Importe une adresse depuis l'API BAN vers notre système
 */
export async function importAddress(query: string, complement?: string): Promise<Adresse> {
  try {
    const url = getApiUrl('adresses/import');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        complement,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erreur lors de l'import: ${response.status}`);
    }
    
    const data = await response.json();
    // Le contrôleur retourne un groupe avec ses adresses
    // On transforme pour correspondre à notre interface
    return {
      id: data.id || 0,
      type: 'pays' as const,
      valeur: data.nom || '',
      groupe: {
        id: data.id,
        nom: data.nom,
        adresses: data.adresses || [],
      },
    };
  } catch (error) {
    console.error('Erreur lors de l\'import d\'adresse:', error);
    throw error;
  }
}

/**
 * Récupère toutes les adresses créées
 */
export async function getAddresses(): Promise<Adresse[]> {
  try {
    const response = await fetch(getApiUrl(API_ENDPOINTS.ADRESSES), {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      // Si l'endpoint n'existe pas encore (404), retourner un tableau vide
      if (response.status === 404) {
        console.warn('Endpoint /api/adresses non disponible (404). L\'endpoint doit être créé côté Symfony.');
        return [];
      }
      throw new Error(`Erreur API: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : (data['hydra:member'] || []);
  } catch (error) {
    // En cas d'erreur réseau ou autre, retourner un tableau vide plutôt que de lancer une erreur
    console.error('Erreur lors de la récupération des adresses:', error);
    return [];
  }
}

export interface Competence {
  id: number;
  nom: string;
  demande?: {
    id: number;
    texte: string;
  };
}

/**
 * Récupère toutes les compétences créées
 */
export async function getCompetences(): Promise<Competence[]> {
  try {
    const response = await fetch(getApiUrl(API_ENDPOINTS.COMPETENCES), {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      // Si l'endpoint n'existe pas encore (404), retourner un tableau vide
      if (response.status === 404) {
        console.warn('Endpoint /api/competences non disponible (404).');
        return [];
      }
      throw new Error(`Erreur API: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : (data['hydra:member'] || []);
  } catch (error) {
    // En cas d'erreur réseau ou autre, retourner un tableau vide plutôt que de lancer une erreur
    console.error('Erreur lors de la récupération des compétences:', error);
    return [];
  }
}
