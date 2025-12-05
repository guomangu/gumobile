#!/bin/bash
# Script pour committer tous les fichiers modifiés et nouveaux automatiquement

# Si un message de commit est fourni, l'utiliser
if [ -z "$1" ]; then
    echo "Usage: ./git-commit-all.sh \"message de commit\""
    echo "Exemple: ./git-commit-all.sh \"mon message de commit\""
    exit 1
fi

# Ajouter tous les fichiers modifiés et nouveaux
echo "Ajout de tous les fichiers modifiés et nouveaux..."
git add -A

# Vérifier s'il y a des changements à committer
if git diff --staged --quiet; then
    echo "Aucun changement à committer."
    exit 0
fi

# Créer le commit avec le message fourni
echo "Création du commit avec le message: $1"
git commit -m "$1"

# Afficher le statut
echo ""
echo "Statut actuel:"
git status

