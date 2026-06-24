'use client';

import { LegalShell } from '@/components/legal/LegalShell';
import { useBranding } from '@/lib/branding';

export default function ApiTermsPage() {
  const { appName } = useBranding();
  return (
    <LegalShell title="Conditions d'utilisation de l'API" updated="24 juin 2026">
      <p>
        Les présentes conditions régissent l'accès et l'utilisation de l'API {appName}
        (« l'API ») par tout développeur, entreprise ou application tierce (« vous »).
        En créant un compte développeur ou en utilisant une clé API, vous acceptez ces conditions.
      </p>

      <h2>1. Compte et clés API</h2>
      <p>
        Vous êtes responsable de la confidentialité de vos clés API (test et production) et de toute
        activité réalisée avec celles-ci. Les clés ne doivent jamais être exposées côté client
        (navigateur, application mobile). Vous nous informez sans délai de toute compromission.
      </p>

      <h2>2. Environnements et accès production</h2>
      <p>
        L'accès débute en mode <strong>sandbox</strong> (clés de test, données simulées). L'accès
        <strong> production</strong> est soumis à validation et à la vérification de votre email.
        Nous pouvons accorder, refuser ou révoquer l'accès production à notre discrétion.
      </p>

      <h2>3. Quotas et limitation de débit</h2>
      <ul>
        <li>Chaque plan impose un quota mensuel de requêtes et une limite de débit (rafale) par clé.</li>
        <li>Un dépassement entraîne des réponses <code>429</code>. Respectez les en-têtes <code>X-RateLimit-*</code>.</li>
        <li>L'usage abusif (contournement de quotas, scraping massif) peut entraîner une suspension.</li>
      </ul>

      <h2>4. Usage acceptable</h2>
      <p>Vous vous engagez à ne pas :</p>
      <ul>
        <li>porter atteinte à l'intégrité, la sécurité ou la disponibilité du service ;</li>
        <li>collecter ou exposer des données personnelles au-delà du strict nécessaire à votre cas d'usage ;</li>
        <li>revendre l'accès brut à l'API sans autorisation écrite ;</li>
        <li>utiliser l'API à des fins illégales ou trompeuses.</li>
      </ul>

      <h2>5. Données et confidentialité</h2>
      <p>
        L'API peut exposer des données de transport et, selon les scopes, des données de passagers.
        Vous traitez ces données conformément à notre{' '}
        <a href="/legal/privacy">politique de confidentialité</a> et à la réglementation applicable
        (voir l'accord de traitement des données / DPA inclus).
      </p>

      <h2>6. Disponibilité et modifications</h2>
      <p>
        L'API est fournie « en l'état ». Nous pouvons faire évoluer les endpoints en respectant une
        politique de versioning (<code>/api/v1</code>) et une période de dépréciation annoncée. Nous
        pouvons modifier ces conditions ; l'usage continu vaut acceptation.
      </p>

      <h2>7. Résiliation</h2>
      <p>
        Vous pouvez cesser d'utiliser l'API à tout moment. Nous pouvons suspendre ou résilier votre
        accès en cas de violation des présentes conditions.
      </p>

      <h2>8. Limitation de responsabilité</h2>
      <p>
        Dans les limites permises par la loi, {appName} ne saurait être tenu responsable des dommages
        indirects résultant de l'utilisation ou de l'indisponibilité de l'API.
      </p>

      <p className="text-sm text-gray-400 pt-4 border-t border-gray-100">
        Document type fourni à titre indicatif — à faire valider par un conseil juridique avant mise en production publique.
      </p>
    </LegalShell>
  );
}
