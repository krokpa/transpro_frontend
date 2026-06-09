import type { Step } from 'react-joyride';

// ── Clés localStorage ─────────────────────────────────────────────────────────

const KEY = (role: string) => `transpro_walkthrough_v1_${role}`;

export function isWalkthroughDone(role: string): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(KEY(role)) === '1';
}

export function markWalkthroughDone(role: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY(role), '1');
}

export function resetWalkthrough(role: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY(role));
}

// ── Steps par rôle ────────────────────────────────────────────────────────────

export const ownerSteps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    title: '👋 Bienvenue sur TransPro CI',
    content: 'Découvrez les fonctionnalités clés de votre espace de gestion de compagnie de transport.',
  },
  {
    target: '[data-walkthrough="nav-dashboard"]',
    placement: 'right',
    title: 'Tableau de bord',
    content: 'Visualisez en temps réel les performances de votre compagnie : revenus, taux d\'occupation et activité récente.',
  },
  {
    target: '[data-walkthrough="nav-trips"]',
    placement: 'right',
    title: 'Voyages',
    content: 'Planifiez, modifiez et suivez tous vos voyages. Consultez l\'occupation par trajet et gérez les statuts en direct.',
  },
  {
    target: '[data-walkthrough="nav-billetterie"]',
    placement: 'right',
    title: 'Billetterie',
    content: 'Vendez des billets directement au guichet, choisissez les sièges et imprimez les tickets en un clic.',
  },
  {
    target: '[data-walkthrough="nav-vehicles"]',
    placement: 'right',
    title: 'Flotte',
    content: 'Gérez votre parc de véhicules et suivez l\'état de chaque bus. Consultez l\'historique de maintenance.',
  },
  {
    target: '[data-walkthrough="nav-drivers"]',
    placement: 'right',
    title: 'Chauffeurs',
    content: 'Suivez vos chauffeurs, leurs permis, évaluations et disponibilités. Assignez-les facilement aux voyages.',
  },
  {
    target: '[data-walkthrough="nav-settings"]',
    placement: 'right',
    title: 'Paramètres',
    content: 'Configurez votre compagnie, vos gares, les modèles de tickets et les règles de réservation.',
  },
];

export const agentSteps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    title: '👋 Bienvenue à votre gare',
    content: 'Voici un tour rapide de votre espace agent pour gérer les départs, billets et encaissements.',
  },
  {
    target: '[data-walkthrough="nav-dashboard"]',
    placement: 'right',
    title: 'Tableau de bord',
    content: 'Suivez l\'activité de votre gare : voyages du jour, passagers embarqués et chiffre d\'affaires.',
  },
  {
    target: '[data-walkthrough="nav-trips"]',
    placement: 'right',
    title: 'Voyages',
    content: 'Consultez tous les voyages au départ de votre gare et gérez leur état d\'embarquement en temps réel.',
  },
  {
    target: '[data-walkthrough="nav-guichet"]',
    placement: 'right',
    title: 'Guichet',
    content: 'Créez des réservations pour les passagers sur place, sélectionnez leur siège et imprimez le billet.',
  },
  {
    target: '[data-walkthrough="nav-scanner"]',
    placement: 'right',
    title: 'Scanner',
    content: 'Validez les billets à l\'embarquement en scannant le QR code. Consultez le manifeste de chaque voyage.',
  },
  {
    target: '[data-walkthrough="nav-caisse"]',
    placement: 'right',
    title: 'Caisse',
    content: 'Suivez les encaissements de votre gare, clôturez les caisses et exportez les rapports journaliers.',
  },
];
