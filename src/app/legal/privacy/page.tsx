'use client';

import { LegalShell } from '@/components/legal/LegalShell';
import { useBranding } from '@/lib/branding';

export default function PrivacyPage() {
  const { appName } = useBranding();
  return (
    <LegalShell title="Politique de confidentialité & traitement des données (DPA)" updated="24 juin 2026">
      <p>
        Cette politique décrit comment {appName} traite les données personnelles dans le cadre de
        l'API tierce, et l'accord de traitement des données (DPA) applicable entre {appName}
        (« Responsable de traitement ») et vous, développeur/partenaire (« Sous-traitant »).
      </p>

      <h2>1. Données concernées</h2>
      <ul>
        <li><strong>Données de compte développeur</strong> : nom, email, société, journaux d'usage.</li>
        <li><strong>Données de transport</strong> : voyages, gares, itinéraires (non personnelles).</li>
        <li><strong>Données de passagers</strong> (selon scopes) : nom, téléphone, email, réservations.</li>
      </ul>

      <h2>2. Finalités et base légale</h2>
      <p>
        Les données sont traitées pour fournir le service API, sécuriser l'accès, facturer les plans et
        respecter nos obligations légales. Le traitement des données de passagers via l'API est limité
        à l'exécution du cas d'usage que vous déclarez.
      </p>

      <h2>3. Engagements du partenaire (sous-traitant)</h2>
      <ul>
        <li>ne traiter les données de passagers que sur instruction et pour la finalité convenue ;</li>
        <li>appliquer des mesures de sécurité appropriées (chiffrement en transit, contrôle d'accès) ;</li>
        <li>ne pas conserver les données au-delà du nécessaire et permettre leur suppression ;</li>
        <li>notifier {appName} sans délai en cas de violation de données ;</li>
        <li>ne pas transférer les données hors d'un cadre légal approprié.</li>
      </ul>

      <h2>4. Opt-in des compagnies</h2>
      <p>
        Les données cross-compagnie ne sont exposées que pour les compagnies ayant explicitement
        activé l'API publique. Les consumers rattachés à une compagnie n'accèdent qu'aux données de
        celle-ci.
      </p>

      <h2>5. Conservation</h2>
      <p>
        Les journaux d'usage de l'API sont conservés à des fins de quota, de facturation et de sécurité.
        Les données de compte sont conservées tant que le compte est actif.
      </p>

      <h2>6. Droits des personnes</h2>
      <p>
        Les passagers disposent de droits d'accès, de rectification et de suppression de leurs données.
        Toute demande relayée via vous doit nous être transmise dans les meilleurs délais.
      </p>

      <h2>7. Sécurité</h2>
      <p>
        Authentification par clé hachée (SHA-256), signatures de webhooks (HMAC), liste blanche d'IP
        optionnelle, et limitation de débit. Les secrets ne sont affichés qu'une seule fois.
      </p>

      <h2>8. Contact</h2>
      <p>Pour toute question relative à la protection des données, contactez l'équipe {appName}.</p>

      <p className="text-sm text-gray-400 pt-4 border-t border-gray-100">
        Document type fourni à titre indicatif — à faire valider par un conseil juridique (RGPD / loi ivoirienne sur les données personnelles) avant mise en production publique.
      </p>
    </LegalShell>
  );
}
