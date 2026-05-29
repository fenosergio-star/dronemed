# DroneMed Madagascar — Livre de Soutenance

## 2. Références aux Codes les Plus Valuables

> Liste des fichiers et patterns clés à citer dans votre mémoire. Chaque entrée est structurée pour une citation rapide.

### 2.1 Arbre AVL — Gestion d'Inventaire
| Aspect | Référence |
|--------|-----------|
| **Fichier** | `server/src/core/avl-tree.ts` |
| **Classe** | `AVLInventoryTree` (ligne 15) |
| **Méthodes clés** | `insertNode` (l.70), `rebalance` (l.51), `getExpiringBetween` (l.149), `rotateStock` (l.220) |
| **Valeur architecturale** | Arbre AVL complet avec rotations gauche/droite, équilibrage par facteur de balance, requêtes par intervalle de dates. Utilisé en mémoire comme index d'inventaire côté serveur, complémentaire aux requêtes SQL. Complexité O(log n) en insertion/suppression. |

### 2.2 File de Priorité (Binary Max-Heap) — Ordonnancement des Commandes
| Aspect | Référence |
|--------|-----------|
| **Fichier** | `server/src/core/priority-queue.ts` |
| **Classe** | `DeliveryPriorityQueue` (l.14) |
| **Méthodes clés** | `enqueue` (l.75), `dequeue` (l.81), `calculatePriority` (l.40), `recalibrateAll` (l.157) |
| **Valeur architecturale** | Tas binaire max avec scoring médical : `urgenceScore + waitingBonus`. Les urgences critiques (100) passent avant les routines (20). Un bonus d'attente (+30 max) évite la famine. Politique de priorité dynamique modifiable en vol. |

### 2.3 A* Pathfinding — Routage des Drones
| Aspect | Référence |
|--------|-----------|
| **Fichier** | `server/src/core/astar.ts` |
| **Classe** | `AStarRouter` (l.30) |
| **Méthodes clés** | `findRoute` (l.181), `heuristic` (l.155), `getTraversalCost` (l.147), `checkBatteryForMission` (l.334) |
| **Valeur architecturale** | A* complet sur grille 200×200 avec profil de terrain réel de Madagascar. Fonction de coût combinant : distance Haversine, pénalité d'altitude (>2500m), zones interdites, risque de terrain. Heuristique admissible incluant le dénivelé. Autonomie batterie ajustée à la charge (pénalité 30% à pleine charge). |

### 2.4 Machine d'États — Workflow des Commandes
| Aspect | Référence |
|--------|-----------|
| **Fichier** | `server/src/modules/orders/order-workflow.ts` |
| **Méthodes clés** | validate, assignDrone, dispatch, confirmDelivery, cancel |
| **Valeur architecturale** | Orchestrateur du cycle de vie complet : création → file d'attente → validation → assignation drone → dispatch → confirmation QR → retour. Intègre la file de priorité, le simulateur de drone, et la vérification par QR code. |

### 2.5 Simulateur de Vol Drone
| Aspect | Référence |
|--------|-----------|
| **Fichier** | `server/src/modules/fleet/drone-simulator.ts` |
| **Classe** | `DroneSimulator` (l.24) |
| **Méthodes clés** | `startMission` (l.60), `tick` (l.106), `registerDrone` (l.34) |
| **Valeur architecturale** | Simulation à événements discrets (ticks 2s). Consommation batterie proportionnelle à la distance parcourue. Retour à la base automatique après livraison ou sur batterie critique. Pattern Observer (`onPosition`) pour notifier les clients WebSocket. Singleton partagé dans toute l'application. |

### 2.6 Authentification JWT
| Aspect | Référence |
|--------|-----------|
| **Fichier** | `server/src/middleware/auth.ts` (middleware) |
| **Fichier** | `server/src/modules/auth/auth.controller.ts` (controller) |
| **Méthodes clés** | `jwtAuth` (middleware l.32), `register` (l.12), `login` (l.45) |
| **Valeur architecturale** | Middleware JWT (Bearer token) protégeant les routes. Bcrypt 12 rounds, JWT 7 jours. Le middleware `jwtAuth` vérifie le token et attache `{id, email, role}` à `req.user`. Rôles disponibles : `pharmacien` (accès complet) et `agent` (accès terrain). Le token est stocké côté mobile dans `expo-secure-store`. |

### 2.7 Synchronisation Hors-Ligne (Offline-First)
| Aspect | Référence |
|--------|-----------|
| **Fichiers** | `mobile/src/services/database.ts`, `mobile/src/services/sync.ts` |
| **Méthodes clés** | `saveOrderOffline` (database.ts l.39), `saveIncidentOffline` (l.60), `doSync` (sync.ts l.19), `startAutoSync` (l.11) |
| **Valeur architecturale** | Pattern offline-first classique : stockage local AsyncStorage avec flag `synced` (0=en attente, 1=synchronisé). Stratégie push-then-pull : d'abord envoyer les modifications locales, puis récupérer les données catalogue. Timer 30s en arrière-plan. Tous les appels API sont en try/catch pour une dégradation silencieuse. |

### 2.8 WebSocket Temps Réel
| Aspect | Référence |
|--------|-----------|
| **Serveur** | `server/src/modules/sync/websocket.ts` |
| **Client Admin** | `web-admin/src/services/websocket.ts` |
| **Méthodes clés** | `initWebSocket` (serveur l.7), `connectWebSocket` (client l.14) |
| **Valeur architecturale** | Pub-sub WebSocket pur (sans Socket.IO). Le serveur pousse des mises à jour individuelles (`drone:update`) et des snapshots agrégés (`fleet:snapshot`). Reconnexion automatique côté client avec backoff 5s. Pont temps réel entre le simulateur et le tableau de bord admin. |

### 2.9 Vues PostgreSQL Optimisées
| Aspect | Référence |
|--------|-----------|
| **Fichier** | `server/src/database/schema-postgres.sql` |
| **Vues** | `v_inventory_expiring` (l.174), `v_drone_status` (l.182), `v_active_missions` (l.193) |
| **Valeur architecturale** | Trois vues matérialisant les indicateurs clés : `days_remaining` calculé pour les périmés, `CASE` pour les niveaux de batterie (good/warning/critical), jointures multi-tables pour les missions actives. 20+ index B-tree sur clés étrangères et colonnes de statut. |

### 2.10 Générateur SQL Dynamique (Requêtes Préparées)
| Aspect | Référence |
|--------|-----------|
| **Fichier** | `server/src/database/repository.ts` |
| **Lignes** | 114-129, 171-186 |
| **Valeur architecturale** | Convertit les clés camelCase JS en colonnes snake_case SQL dynamiquement. Construit des clauses SET paramétrées (`$1..$N`) pour les mises à jour partielles, empêchant l'injection SQL tout en permettant des modifications de champs individuels. |

### 2.11 Table de Hachage Sécurisée — Anonymisation Patients
| Aspect | Référence |
|--------|-----------|
| **Fichier** | `server/src/core/hash-table.ts` |
| **Méthodes clés** | insert, get, delete, resize |
| **Valeur architecturale** | Table de hachage avec chaînage séparé et redimensionnement automatique à 75% de charge. Anonymise les champs sensibles (nom, contact, conditions) via SHA-256. Protection RGPD intégrée au cœur du stockage. |

### 2.12 Union-Find (DSU) — Regroupement de Zones
| Aspect | Référence |
|--------|-----------|
| **Fichier** | `server/src/core/union-find.ts` |
| **Méthodes clés** | `find` (compression de chemin), `union` (union by rank), `findOptimalBase` |
| **Valeur architecturale** | Structure Union-Find (Disjoint Set Union) avec compression de chemin et union par rang. Utilisée pour regrouper les centres de santé en zones de couverture de drone. Inclut un algorithme de placement optimal de base drone. |

### 2.13 Internationalisation (i18n) Bilingue
| Aspect | Référence |
|--------|-----------|
| **Mobile** | `mobile/src/i18n/fr.ts`, `mobile/src/i18n/mg.ts` |
| **Web Admin** | `web-admin/src/i18n/fr.ts`, `web-admin/src/i18n/mg.ts` |
| **Valeur architecturale** | Support complet français et malgache sur les deux applications. Architecture par dictionnaire de clés avec basculement dynamique. Switch FR/MG en haut de chaque écran. |

---

## 3. Architecture Technique — Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────┐
│                    📱 App Mobile                         │
│              React Native + Expo SDK 54                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ AsyncStorage (offline) | SecureStore (JWT)       │   │
│  │ expo-location (GPS) | expo-camera (QR + Photo)  │   │
│  │ expo-notifications (Push) | expo-network        │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS REST + WebSocket
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    🖥️ Backend Node.js                    │
│              Express + TypeScript + PostgreSQL            │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Core : AVL Tree | Priority Queue | A* | Hash    │   │
│  │        Table | Union-Find                       │   │
│  │ Modules : Auth | Orders | Fleet | Sync | Reports │   │
│  │ Middleware : JWT | API Key | Device | Error      │   │
│  │ Database : pg Pool | Repository | SQL Views     │   │
│  │ Realtime : WebSocket | Drone Simulator          │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │ pg (node-postgres)
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    🗄️ PostgreSQL                         │
│  9 Tables : users, health_centers, medications,         │
│  inventory, drones, delivery_orders, order_items,       │
│  incident_reports, flight_logs, sync_log                │
│  3 Vues : v_inventory_expiring, v_drone_status,        │
│  v_active_missions                                      │
│  20+ Indexes B-tree                                     │
└─────────────────────────────────────────────────────────┘

Déploiement :
  Backend  → Render.com (Web Service + PostgreSQL)
  Web      → Vercel (SPA React)
  Mobile   → EAS Build (APK/IPA)
```

---

## 4. Rôles Utilisateurs

| Rôle | Permissions |
|------|------------|
| **Pharmacien** | Accès complet au web-admin : gestion inventaire, catalogue médicaments, validation commandes, assignation drones, rapports, statistiques, gestion flotte |
| **Agent** | Accès mobile terrain : création commande, scan QR confirmation, signalement incident, suivi drone temps réel, synchronisation hors-ligne |

> Le rôle `admin` a été supprimé. Toutes ses responsabilités sont dévolues au **pharmacien**.

---

## 5. Statistiques du Projet

| Métrique | Valeur |
|----------|--------|
| Fichiers TypeScript | 70+ |
| Lignes de code | ~15 000 |
| Structures de données | 5 (AVL, Binary Heap, Hash Table, Union-Find, A* Grid) |
| Tables PostgreSQL | 10 |
| Vues PostgreSQL | 3 |
| Index PostgreSQL | 20+ |
| Endpoints API | 40+ |
| Tests | Jest + ts-jest |
| Langues | Français + Malgache |
| Temps réel | WebSocket pur |
| Offline-first | AsyncStorage + sync engine |
| Rôles | 2 : pharmacien (admin) + agent |

---

*Document généré pour support de soutenance — Projet DroneMed Madagascar 2035*
