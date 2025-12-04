export interface Competence {
  id: number;
  nom: string;
  demande?: {
    id: number;
    texte: string;
  };
}

export interface Demande {
  id: number;
  texte: string;
  groupe?: {
    id: number;
    nom: string;
  };
  competences?: Competence[];
}

export interface User {
  id: number;
  pseudo: string;
  mail: string;
  groupes?: {
    id: number;
    nom: string;
  }[];
}

export interface Groupe {
  id: number;
  nom: string;
  demandes?: Demande[];
  users?: User[];
  usersData?: User[];
}

