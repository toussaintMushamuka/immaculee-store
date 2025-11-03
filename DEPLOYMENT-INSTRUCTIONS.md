# Instructions de Déploiement pour Stock Manager

## Problème Résolu

Si les produits n'apparaissent pas en production (0 produit) alors qu'ils sont présents en local, voici les étapes à suivre :

## Solution : Synchronisation de la Base de Données

### Étape 1 : Vérifier les Variables d'Environnement Vercel

1. Allez sur Vercel Dashboard
2. Sélectionnez votre projet
3. Allez dans **Settings > Environment Variables**
4. Vérifiez que vous avez :
   - `DATABASE_URL` : URL de votre base de données PostgreSQL
   - `DIRECT_URL` : URL directe de votre base de données PostgreSQL (sans pooler)

### Étape 2 : Synchroniser le Schéma Prisma avec la Base de Production

**Option A : Push Direct (Recommandé pour Vercel)**

```bash
npx prisma db push
```

**Option B : Migrations Complètes (Recommandé pour la production)**

```bash
# Créer une migration
npx prisma migrate dev --name production-sync

# Appliquer en production
npx prisma migrate deploy
```

### Étape 3 : Générer le Client Prisma

Après chaque modification du schéma, régénérer le client :

```bash
npx prisma generate
```

### Étape 4 : Redéployer sur Vercel

1. **Via Git (Recommandé)** :

   ```bash
   git add .
   git commit -m "Fix: Synchroniser schéma Prisma avec base de données"
   git push origin main
   ```

2. **Via Vercel Dashboard** :
   - Allez sur votre projet Vercel
   - Cliquez sur "Redeploy" pour forcer un nouveau déploiement

## Nouveaux Champs Ajoutés

Le schéma Prisma a été mis à jour avec ces nouveaux champs optionnels dans `Product` :

```prisma
model Product {
  id               String    @id @default(cuid())
  name             String
  purchaseUnit     String
  saleUnit         String
  conversionFactor Int
  stock            Int
  purchaseUnitPrice Float?   // NOUVEAU : Prix par unité d'achat (optionnel)
  purchaseCurrency Currency? // NOUVEAU : Devise du prix d'achat (optionnel)
  createdAt        DateTime  @default(now())
  purchases        Purchase[]
  saleItems        SaleItem[]
}
```

Ces champs sont **optionnels** et permettent de :

- Définir le prix d'achat initial d'un produit
- Calculer le bénéfice même sans historique d'achat
- Gérer les stocks initiaux correctement

## Scripts de Build Mis à Jour

Le `package.json` a été mis à jour avec :

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate"
  }
}
```

Cela garantit que :

1. Le client Prisma est généré après l'installation (`postinstall`)
2. Le client Prisma est régénéré avant chaque build (`build`)

## Vérification Post-Déploiement

Une fois déployé, vérifiez que :

1. **Les produits s'affichent** :

   - Visitez `https://votre-projet.vercel.app/products`
   - Vous devriez voir tous vos produits

2. **Les API fonctionnent** :

   - Testez `/api/products` pour voir la liste
   - Vérifiez les logs Vercel pour les erreurs

3. **Les migrations sont appliquées** :
   - Connectez-vous à votre base PostgreSQL
   - Vérifiez que `Product` a les colonnes `purchaseUnitPrice` et `purchaseCurrency`

## Dépannage

### Problème : Encore 0 produit après déploiement

**Solution 1** : Vérifier la connexion à la base de données

```bash
# Dans votre terminal local
npx prisma studio
```

Cela ouvrira Prisma Studio pour visualiser vos données

**Solution 2** : Vérifier les variables d'environnement Vercel

- Les variables doivent correspondre aux valeurs locales
- Regénérez les variables si nécessaire

**Solution 3** : Vérifier les logs Vercel

- Allez dans **Deployments > [Votre Déploiement] > Logs**
- Recherchez les erreurs liées à Prisma ou à la base de données

### Problème : Erreur de migration

**Solution** : Forcer un reset (⚠️ ATTENTION : Supprime toutes les données)

```bash
npx prisma migrate reset
npx prisma db push
```

## Commandes Utiles

```bash
# Générer le client Prisma
npx prisma generate

# Visualiser la base de données
npx prisma studio

# Appliquer les migrations
npx prisma migrate deploy

# Pousser les changements (sans migration)
npx prisma db push

# Vérifier le schéma
npx prisma validate
```

## Contact

Pour toute question ou problème, consultez les logs Vercel ou contactez le support.





