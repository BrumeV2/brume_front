# Environnements, Déploiement et Intégration Continue (CI/CD)

Ce document décrit l'architecture des environnements, la configuration de l'infrastructure sur la machine virtuelle, la chaîne de livraison continue (CI/CD) et les protocoles opérationnels pour l'application frontend Brume (Angular 21).

---

## 1. Architecture Globale

La plateforme Brume est hébergée sur une machine virtuelle Linux (Ubuntu) accessible au sein du réseau sécurisé de l'établissement (10.2.192.7).

```mermaid
flowchart TD
    client["Client Web (Navigateur)"] -->|HTTPS :443| caddy["Caddy (Reverse Proxy & TLS)"]
    caddy -->|app.ybrume.duckdns.org| front["Conteneur Front (Nginx / Angular 21)"]
    caddy -->|api.ybrume.duckdns.org| back["Conteneur Back (NestJS 11 / Node 22)"]
    back -->|Port 5432 (Réseau db interne)| postgres[("PostgreSQL 17 (Volume pgdata)")]

    subgraph Reseau Web
        caddy
        front
        back
    end

    subgraph Reseau DB (internal: true)
        back
        postgres
    end
```

### Règles de sécurité réseau
- **Point d'entrée unique :** Seul le conteneur Caddy publie les ports 80 et 443 sur l'hôte.
- **Front-end statique conteneurisé :** L'application Angular 21 est compilée en production et servie par un serveur Nginx allégé au sein du réseau interne `web`.
- **Terminaison TLS automatique :** Caddy obtient et renouvelle automatiquement les certificats TLS Let's Encrypt via le challenge DNS-01 DuckDNS.

---

## 2. Configuration Front-end et Environnements

Le frontend gère deux profils d'environnement :
- `src/environments/environment.ts` : Développement local.
- `src/environments/environment.prod.ts` : Déploiement de préproduction / production.

```typescript
export const environment = {
  production: true,
  apiBaseUrl: 'https://api.ybrume.duckdns.org/api',
  useMocks: false, // Basculé sur l'API NestJS réelle
};
```

> **Mode Mock (`useMocks`) :** Lorsqu'il est activé (`true`), le frontend simule l'utilisateur en mémoire dans le navigateur. Il est désormais configuré à `false` sur l'environnement déployé pour communiquer directement avec l'API NestJS.

---

## 3. Chaîne CI/CD (GitHub Actions)

### Stratégie de branches
- **Branches de développement (`dev`) et Pull Requests :**
  - Exécution du job `verify` : exécution des 92 tests unitaires Vitest, publication du rapport dans GitHub Actions, vérification de la compilation Angular (`npm run build`).
  - Aucun build Docker ni déploiement n'est déclenché.
- **Branche principale (`main`) :**
  - Validation complète des tests et du build.
  - Construction de l'image Docker multi-plateforme (`linux/amd64`).
  - Publication des images sur GitHub Container Registry (`ghcr.io/brumev2/brume_front:latest` et `:staging`).
  - Déploiement automatique sur la VM via le runner auto-hébergé.

### Configuration du Runner sur la Machine Virtuelle
- **Emplacement :** `/opt/filrouge/actions-runner/`
- **Utilisateur système :** `deploy` (groupes `users`, `docker`)
- **Service systemd :** `actions.runner.BrumeV2.filrouge-deploy.service`
- **Configuration Organisation GitHub :**
  - Dans les paramètres de l'organisation `BrumeV2` (`Settings > Actions > Runner groups > Default`), l'option **"Allow public repositories"** est activée.

---

## 4. Authentification Google OAuth (SSO)

L'authentification Google OAuth 2.0 fonctionne de bout en bout avec le backend :
1. L'utilisateur clique sur « Continuer avec Google » depuis `/connexion` ou `/inscription`.
2. Le frontend redirige le navigateur vers `https://api.ybrume.duckdns.org/api/auth/google`.
3. L'API initialise la transaction PKCE et redirige vers Google.
4. Après consentement, Google renvoie vers `https://api.ybrume.duckdns.org/api/auth/google/callback`, qui pose le cookie de session sécurisé `brume_session` (`HttpOnly`, `Secure`, `SameSite=Lax`).
5. L'utilisateur est redirigé vers l'application frontend sur `https://app.ybrume.duckdns.org/compte`.

---

## 5. Procédures Opérationnelles

### Déploiement automatique
Le déploiement est entièrement automatique lors de chaque fusion sur la branche **`main`**.

### Déploiement manuel sur la machine virtuelle
Pour déployer manuellement le frontend ou relancer le service :
```bash
# Connexion SSH
ssh ynov_brume_vm

# Exécuter le déploiement du front uniquement
/opt/filrouge/deploy.sh front
```

### Consultation des journaux (Logs)
```bash
cd /opt/filrouge
sudo docker compose logs -f front    # Logs Nginx du frontend
sudo docker compose ps               # État de santé des conteneurs
```

### Procédure de Retour Arrière (Rollback)
Pour revenir à une version précédente du frontend :
1. Récupérer le tag SHA du commit précédent sur GHCR (`ghcr.io/brumev2/brume_front:<commit-sha>`).
2. Mettre à jour l'image dans `/opt/filrouge/compose.yml`.
3. Exécuter `/opt/filrouge/deploy.sh front`.
