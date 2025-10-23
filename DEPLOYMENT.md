# Guide de Déploiement - StockManager sur Vercel

## 🚀 Déploiement sur Vercel

### 1. Préparation du Projet

#### Vérifications Préalables

```bash
# 1. Vérifier que le build fonctionne
npm run build

# 2. Tester localement
npm run start

# 3. Vérifier les variables d'environnement
cat .env.local
```

#### Variables d'Environnement Requises

```env
DATABASE_URL="postgresql://username:password@host:port/database"
DIRECT_URL="postgresql://username:password@host:port/database"
```

### 2. Déploiement via Vercel CLI

#### Installation de Vercel CLI

```bash
npm install -g vercel
```

#### Connexion à Vercel

```bash
vercel login
```

#### Déploiement

```bash
# Premier déploiement
vercel

# Déploiements suivants
vercel --prod
```

### 3. Déploiement via Interface Vercel

#### Étapes

1. **Connecter le Repository**

   - Aller sur [vercel.com](https://vercel.com)
   - Se connecter avec GitHub
   - Importer le projet `stock-manager`

2. **Configuration du Projet**

   - **Framework Preset** : Next.js
   - **Root Directory** : `./`
   - **Build Command** : `npm run build`
   - **Output Directory** : `.next`

3. **Variables d'Environnement**

   - Ajouter `DATABASE_URL`
   - Ajouter `DIRECT_URL`

4. **Déploiement**
   - Cliquer sur "Deploy"
   - Attendre la fin du build
   - Tester l'application

### 4. Configuration de la Base de Données

#### Option 1: Vercel Postgres

```bash
# Installer Vercel Postgres
vercel storage create postgres

# Obtenir les variables d'environnement
vercel env pull .env.local
```

#### Option 2: Service Externe

- **Neon** : https://neon.tech
- **Supabase** : https://supabase.com
- **Railway** : https://railway.app

### 5. Migration de la Base de Données

#### Après le Déploiement

```bash
# Générer le client Prisma
npx prisma generate

# Appliquer les migrations
npx prisma db push

# Initialiser l'utilisateur admin
curl -X POST https://your-app.vercel.app/api/init
```

### 6. Configuration Post-Déploiement

#### Vérifications

1. **Test de l'Application**

   - Visiter l'URL de déploiement
   - Vérifier la redirection vers `/login`
   - Tester la connexion avec `admin@stockmanager.com` / `admin123`

2. **Test des APIs**

   ```bash
   # Test du dashboard
   curl https://your-app.vercel.app/api/dashboard

   # Test de l'authentification
   curl -X POST https://your-app.vercel.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@stockmanager.com","password":"admin123"}'
   ```

3. **Test des Fonctionnalités**
   - Créer un produit
   - Effectuer une vente
   - Ajouter un client
   - Vérifier les rapports

### 7. Optimisations de Production

#### Configuration Vercel

```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "regions": ["iad1"]
}
```

#### Variables d'Environnement Recommandées

```env
# Base de données
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Sécurité (optionnel)
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://your-app.vercel.app"

# Monitoring (optionnel)
VERCEL_ANALYTICS_ID="your-analytics-id"
```

### 8. Monitoring et Maintenance

#### Surveillance

- **Vercel Analytics** : Performance et erreurs
- **Logs** : `vercel logs`
- **Métriques** : Dashboard Vercel

#### Maintenance

- **Mises à jour** : `npm update`
- **Sécurité** : Audit des dépendances
- **Backup** : Sauvegarde régulière de la DB

### 9. Résolution de Problèmes

#### Erreurs Courantes

**Build Failed**

```bash
# Vérifier les erreurs de TypeScript
npm run build

# Vérifier les imports
npm run lint
```

**Database Connection Error**

```bash
# Vérifier la DATABASE_URL
echo $DATABASE_URL

# Tester la connexion
npx prisma db push
```

**Authentication Issues**

```bash
# Vérifier l'initialisation
curl -X POST https://your-app.vercel.app/api/init

# Vérifier les logs
vercel logs
```

### 10. URLs de Test

#### Après Déploiement

- **Application** : `https://your-app.vercel.app`
- **Login** : `https://your-app.vercel.app/login`
- **Dashboard** : `https://your-app.vercel.app/dashboard`
- **API** : `https://your-app.vercel.app/api/dashboard`

#### Tests Automatisés

```bash
# Script de test post-déploiement
curl -I https://your-app.vercel.app/
curl -I https://your-app.vercel.app/login
curl -I https://your-app.vercel.app/api/dashboard
```

## ✅ Checklist de Déploiement

- [ ] Build local réussi (`npm run build`)
- [ ] Tests locaux passés (`npm run start`)
- [ ] Variables d'environnement configurées
- [ ] Base de données accessible
- [ ] Déploiement Vercel réussi
- [ ] Migration de la DB appliquée
- [ ] Utilisateur admin initialisé
- [ ] Tests de l'application en production
- [ ] Monitoring configuré
- [ ] Documentation mise à jour

## 🎉 Félicitations !

Votre application StockManager est maintenant déployée et prête à être utilisée !

### Prochaines Étapes

1. **Formation des utilisateurs** : Guide d'utilisation
2. **Sauvegarde** : Stratégie de backup
3. **Monitoring** : Surveillance des performances
4. **Évolutions** : Nouvelles fonctionnalités
