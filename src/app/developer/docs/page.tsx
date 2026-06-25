'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import {
  Copy, Check, BookOpen, ArrowRight, ExternalLink, Terminal,
  KeyRound, Boxes, Webhook, Rocket, ShieldCheck, FileCode2,
} from 'lucide-react';
import { useBranding } from '@/lib/branding';

const API_BASE = 'https://api.transpro-ci.com/api/v1';

// ── Coloration syntaxique légère (contenu 100 % curé, échappé en amont) ────────
function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
const TOKEN =
  /("(?:[^"\\]|\\.)*"(?=\s*:))|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b(?:true|false|null)\b)|(-?\b\d+(?:\.\d+)?\b)/g;
function highlight(code: string) {
  return esc(code).replace(TOKEN, (m, key, str, bool, num) => {
    if (key) return `<span class="text-sky-300">${m}</span>`;
    if (str) return `<span class="text-emerald-300">${m}</span>`;
    if (bool) return `<span class="text-violet-300">${m}</span>`;
    if (num) return `<span class="text-amber-300">${m}</span>`;
    return m;
  });
}

// ── Bloc de code (onglets + copie) ─────────────────────────────────────────────
function CodeBlock({ tabs }: { tabs: { label: string; code: string }[] }) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const code = tabs[Math.min(active, tabs.length - 1)].code;
  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="rounded-xl overflow-hidden border border-gray-800 bg-[#0d1117] my-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-800 pl-1.5 pr-3">
        <div className="flex">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setActive(i)}
              className={clsx(
                'px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition',
                i === active ? 'border-brand-400 text-white' : 'border-transparent text-gray-400 hover:text-gray-200',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={copy} className="text-gray-400 hover:text-white inline-flex items-center gap-1.5 text-xs font-medium">
          {copied ? <><Check size={13} className="text-green-400" /> Copié</> : <><Copy size={13} /> Copier</>}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-gray-200">
        <code dangerouslySetInnerHTML={{ __html: highlight(code) }} />
      </pre>
    </div>
  );
}

function Method({ m }: { m: string }) {
  const c =
    m === 'GET' ? 'bg-emerald-100 text-emerald-700'
    : m === 'POST' ? 'bg-blue-100 text-blue-700'
    : 'bg-gray-100 text-gray-700';
  return <span className={clsx('text-[11px] font-bold px-2 py-0.5 rounded tracking-wide shrink-0', c)}>{m}</span>;
}

function EndpointHead({ method, path, scope }: { method: string; path: string; scope?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm mt-5">
      <Method m={method} />
      <span className="text-gray-800 break-all">{path}</span>
      {scope && (
        <span className="ml-auto text-[11px] text-gray-400 font-sans">
          scope <code className="text-gray-600 font-mono">{scope}</code>
        </span>
      )}
    </div>
  );
}

function Params({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-sm border border-gray-100 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-gray-50 text-left text-xs text-gray-500">
            <th className="px-3 py-2 font-semibold">Paramètre</th>
            <th className="px-3 py-2 font-semibold">Type</th>
            <th className="px-3 py-2 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((r) => (
            <tr key={r[0]}>
              <td className="px-3 py-2 font-mono text-gray-800 whitespace-nowrap">{r[0]}</td>
              <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{r[1]}</td>
              <td className="px-3 py-2 text-gray-600">{r[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] text-gray-600 leading-relaxed mb-3">{children}</p>;
}
function C({ children }: { children: React.ReactNode }) {
  return <code className="text-[13px] font-mono bg-gray-100 text-gray-800 rounded px-1.5 py-0.5">{children}</code>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-gray-900 mt-6 mb-2">{children}</h3>;
}
function Section({ id, title, icon, children }: { id: string; title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 mb-16">
      <h2 className="flex items-center gap-2.5 text-2xl font-bold text-gray-900 mb-4">
        {icon}{title}
      </h2>
      {children}
    </section>
  );
}
function Callout({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' }) {
  const c = tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-brand-200 bg-brand-50/60 text-gray-700';
  return <div className={clsx('rounded-xl border p-3.5 text-sm my-4', c)}>{children}</div>;
}

// ── Navigation ────────────────────────────────────────────────────────────────
const NAV: { group: string; items: { id: string; label: string }[] }[] = [
  {
    group: 'Démarrage',
    items: [
      { id: 'introduction', label: 'Introduction' },
      { id: 'demarrage-rapide', label: 'Démarrage rapide' },
      { id: 'authentification', label: 'Authentification' },
    ],
  },
  {
    group: 'Concepts',
    items: [
      { id: 'plans-scopes', label: 'Plans, scopes & quotas' },
      { id: 'reponses', label: 'Format des réponses' },
      { id: 'erreurs', label: 'Erreurs' },
      { id: 'pagination', label: 'Pagination' },
      { id: 'perimetre', label: 'Périmètre des données' },
      { id: 'idempotence', label: 'Idempotence' },
    ],
  },
  {
    group: 'Référence API',
    items: [
      { id: 'voyages', label: 'Voyages' },
      { id: 'gares-itineraires', label: 'Gares & itinéraires' },
      { id: 'reservations', label: 'Réservations' },
      { id: 'colis', label: 'Colis' },
      { id: 'meta', label: 'Méta' },
    ],
  },
  {
    group: 'Webhooks',
    items: [
      { id: 'webhooks', label: 'Événements' },
      { id: 'signature', label: 'Vérifier la signature' },
    ],
  },
  {
    group: 'Aller plus loin',
    items: [
      { id: 'sandbox', label: 'Sandbox (mode test)' },
      { id: 'sdk', label: 'SDK & clients' },
      { id: 'bonnes-pratiques', label: 'Bonnes pratiques' },
      { id: 'versioning', label: 'Versioning' },
    ],
  },
];
const ALL_IDS = NAV.flatMap((g) => g.items.map((i) => i.id));

export default function ApiDocsPage() {
  const { appName, logoUrl } = useBranding();
  const [active, setActive] = useState('introduction');

  // Scroll-spy : surligne la section visible.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    );
    ALL_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/developer/docs" className="flex items-center gap-2.5">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={appName} className="w-7 h-7 rounded-lg object-contain" />
            ) : (
              <div className="bg-brand-500 text-white rounded-lg p-1.5"><BookOpen size={16} /></div>
            )}
            <div className="leading-tight">
              <p className="font-bold text-gray-900 text-sm">{appName} API</p>
              <p className="text-[11px] text-gray-400 -mt-0.5">Documentation développeur</p>
            </div>
          </Link>
          <nav className="flex items-center gap-1.5 sm:gap-3 text-sm">
            <a href={`${API_BASE.replace('/api/v1', '')}/developers`} target="_blank" rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition">
              <ExternalLink size={14} /> Swagger
            </a>
            <Link href="/developer/console" className="hidden sm:inline-flex text-gray-500 hover:text-gray-900 transition">Console</Link>
            <Link href="/developer/register"
              className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white px-3.5 py-2 rounded-lg text-sm font-semibold transition">
              Obtenir une clé <ArrowRight size={15} />
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-5 lg:px-8 flex gap-10">
        {/* Sidebar */}
        <aside className="hidden lg:block w-60 shrink-0 sticky top-14 self-start h-[calc(100vh-3.5rem)] overflow-y-auto py-8 pr-2">
          <nav className="space-y-6">
            {NAV.map((g) => (
              <div key={g.group}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">{g.group}</p>
                <ul className="space-y-0.5">
                  {g.items.map((it) => (
                    <li key={it.id}>
                      <a href={`#${it.id}`}
                        className={clsx(
                          'block px-2.5 py-1.5 rounded-lg text-[13.5px] transition',
                          active === it.id ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50',
                        )}
                      >
                        {it.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 max-w-3xl py-10">
          {/* Hero */}
          <div className="mb-12">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 bg-brand-50 rounded-full px-2.5 py-1 mb-3">
              <Rocket size={13} /> API REST · v1
            </span>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Documentation API {appName}</h1>
            <p className="text-lg text-gray-500 mt-3 leading-relaxed">
              Intégrez le transport interurbain à vos applications : recherche de voyages, gares,
              itinéraires, réservations et suivi de colis — le tout via une API REST simple et typée.
            </p>
          </div>

          {/* Introduction */}
          <Section id="introduction" title="Introduction" icon={<BookOpen size={22} className="text-brand-500" />}>
            <P>
              L'API {appName} expose les données et opérations des compagnies de transport partenaires.
              Toutes les requêtes se font en HTTPS vers la base d'URL suivante, les endpoints publics
              étant préfixés par <C>/ext</C> :
            </P>
            <CodeBlock tabs={[{ label: 'Base URL', code: `${API_BASE}/ext` }]} />
            <P>
              Les réponses sont au format JSON et enveloppées de façon standard (voir
              <a href="#reponses" className="text-brand-600 hover:underline"> Format des réponses</a>).
              Pour commencer, créez un compte développeur et générez une clé en quelques secondes.
            </P>
            <Link href="/developer/register"
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition mt-1">
              <KeyRound size={16} /> Créer un compte développeur
            </Link>
          </Section>

          {/* Démarrage rapide */}
          <Section id="demarrage-rapide" title="Démarrage rapide" icon={<Terminal size={22} className="text-brand-500" />}>
            <P>Trois étapes pour votre premier appel :</P>
            <ol className="list-decimal list-inside text-[15px] text-gray-600 space-y-1.5 mb-4">
              <li>Inscrivez-vous sur <Link href="/developer/register" className="text-brand-600 hover:underline">l'espace développeur</Link>.</li>
              <li>Générez une clé <strong>de test</strong> (<C>tpk_test_…</C>) depuis la console.</li>
              <li>Appelez l'API en passant votre clé dans le header <C>X-API-Key</C>.</li>
            </ol>
            <CodeBlock
              tabs={[
                {
                  label: 'cURL',
                  code: `curl "${API_BASE}/ext/trips?origin=Abidjan&destination=Bouake&date=2026-07-01" \\
  -H "X-API-Key: tpk_test_xxxxxxxxxxxxxxxxxxxx"`,
                },
                {
                  label: 'JavaScript',
                  code: `const res = await fetch(
  "${API_BASE}/ext/trips?origin=Abidjan&destination=Bouake&date=2026-07-01",
  { headers: { "X-API-Key": process.env.TRANSPRO_API_KEY } }
);
const { data } = await res.json();
console.log(data);`,
                },
                {
                  label: 'SDK (TS)',
                  code: `import { TransProClient } from "@transpro/sdk";

const client = new TransProClient({ apiKey: process.env.TRANSPRO_API_KEY });
const trips = await client.searchTrips({
  origin: "Abidjan", destination: "Bouake", date: "2026-07-01",
});`,
                },
              ]}
            />
          </Section>

          {/* Authentification */}
          <Section id="authentification" title="Authentification" icon={<ShieldCheck size={22} className="text-brand-500" />}>
            <P>
              Chaque requête doit inclure votre clé API dans le header <C>X-API-Key</C>. Les clés de
              <strong> production</strong> commencent par <C>tpk_live_</C>, les clés de <strong>test</strong> par <C>tpk_test_</C>.
            </P>
            <CodeBlock tabs={[{ label: 'Header', code: `X-API-Key: tpk_live_xxxxxxxxxxxxxxxxxxxx` }]} />
            <Callout tone="warn">
              Ne stockez jamais votre clé côté client (navigateur, application mobile). Appelez l'API
              depuis votre backend. En cas de fuite, révoquez la clé et générez-en une nouvelle depuis la console.
            </Callout>
          </Section>

          {/* Plans, scopes & quotas */}
          <Section id="plans-scopes" title="Plans, scopes & quotas" icon={<Boxes size={22} className="text-brand-500" />}>
            <P>Chaque endpoint exige un <strong>scope</strong>, accordé selon votre <strong>plan</strong> :</P>
            <div className="overflow-x-auto my-3">
              <table className="w-full text-sm border border-gray-100 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500">
                    <th className="px-3 py-2 font-semibold">Plan</th>
                    <th className="px-3 py-2 font-semibold">Quota mensuel</th>
                    <th className="px-3 py-2 font-semibold">Scopes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <tr><td className="px-3 py-2 font-mono">STARTER</td><td className="px-3 py-2 text-gray-500">5 000 req</td><td className="px-3 py-2 text-gray-600"><C>trips:read</C> <C>stations:read</C> <C>routes:read</C> <C>parcels:read</C></td></tr>
                  <tr><td className="px-3 py-2 font-mono">BUSINESS</td><td className="px-3 py-2 text-gray-500">50 000 req</td><td className="px-3 py-2 text-gray-600">+ <C>bookings:read</C> <C>bookings:write</C> <C>parcels:write</C></td></tr>
                  <tr><td className="px-3 py-2 font-mono">ENTERPRISE</td><td className="px-3 py-2 text-gray-500">illimité</td><td className="px-3 py-2 text-gray-600">tous les scopes</td></tr>
                </tbody>
              </table>
            </div>
            <H3>Headers de quota</H3>
            <P>Chaque réponse porte l'état de votre quota :</P>
            <Params
              rows={[
                ['X-RateLimit-Limit', 'int | unlimited', 'Quota mensuel de votre plan'],
                ['X-RateLimit-Remaining', 'int', 'Requêtes restantes ce mois-ci'],
                ['X-RateLimit-Reset', 'unix', 'Réinitialisation du quota (timestamp s)'],
              ]}
            />
            <P>
              Au dépassement : <C>HTTP 429</C> avec un header <C>Retry-After</C> (secondes). Un burst
              trop rapide (60 req / 10 s) renvoie également un <C>429</C>.
            </P>
          </Section>

          {/* Réponses */}
          <Section id="reponses" title="Format des réponses" icon={<FileCode2 size={22} className="text-brand-500" />}>
            <P>Toutes les réponses suivent une enveloppe standard :</P>
            <CodeBlock
              tabs={[{
                label: 'Succès',
                code: `{
  "success": true,
  "data": { },
  "timestamp": "2026-07-01T07:00:00.000Z"
}`,
              }]}
            />
            <P>Le SDK officiel déballe automatiquement le champ <C>data</C> pour vous.</P>
          </Section>

          {/* Erreurs */}
          <Section id="erreurs" title="Erreurs">
            <P>En cas d'échec, la réponse contient <C>success: false</C> et un message :</P>
            <CodeBlock
              tabs={[{
                label: 'Erreur',
                code: `{
  "success": false,
  "statusCode": 404,
  "message": "Voyage introuvable",
  "timestamp": "2026-07-01T07:00:00.000Z"
}`,
              }]}
            />
            <Params
              rows={[
                ['401', 'Unauthorized', 'Clé API manquante, invalide, révoquée ou expirée'],
                ['403', 'Forbidden', 'IP non autorisée ou scope insuffisant'],
                ['404', 'Not Found', 'Ressource introuvable'],
                ['409', 'Conflict', 'Requête idempotente déjà en cours de traitement'],
                ['422', 'Unprocessable', 'Paramètres invalides'],
                ['429', 'Too Many Requests', 'Quota ou débit dépassé (voir Retry-After)'],
              ]}
            />
          </Section>

          {/* Pagination */}
          <Section id="pagination" title="Pagination">
            <P>
              Les endpoints de liste acceptent <C>limit</C> (1–100, défaut 50) et <C>offset</C>.
              Paginez plutôt que de tout charger en une fois.
            </P>
            <CodeBlock tabs={[{ label: 'cURL', code: `curl "${API_BASE}/ext/stations?limit=20&offset=40" \\
  -H "X-API-Key: tpk_live_xxxxxxxxxxxxxxxxxxxx"` }]} />
          </Section>

          {/* Périmètre */}
          <Section id="perimetre" title="Périmètre des données">
            <P>
              Une clé rattachée à une compagnie ne voit que les données de <strong>cette</strong> compagnie.
              Une clé <strong>cross-compagnie</strong> ne voit que les compagnies ayant explicitement
              activé l'API publique (opt-in). Le filtrage est appliqué automatiquement à tous les endpoints.
            </P>
          </Section>

          {/* Idempotence */}
          <Section id="idempotence" title="Idempotence">
            <P>
              Sur les requêtes <C>POST</C>, envoyez un header <C>Idempotency-Key</C> (un UUID que vous
              générez). Un rejeu avec la même clé renvoie la <strong>réponse d'origine</strong> sans
              créer de doublon ; une requête identique encore en cours renvoie <C>409</C>.
            </P>
            <CodeBlock tabs={[{ label: 'cURL', code: `curl -X POST "${API_BASE}/ext/bookings" \\
  -H "X-API-Key: tpk_live_xxxxxxxxxxxxxxxxxxxx" \\
  -H "Idempotency-Key: 9f1c8b1e-3b2a-4c1d-9e6f-2a7b8c9d0e1f" \\
  -H "Content-Type: application/json" \\
  -d '{ "tripId": "cmtrip123", "passengerName": "Awa Kone", "passengerPhone": "+2250700000000", "seatNumbers": ["A1"] }'` }]} />
          </Section>

          {/* Voyages */}
          <Section id="voyages" title="Voyages" icon={<Rocket size={22} className="text-brand-500" />}>
            <EndpointHead method="GET" path="/ext/trips" scope="trips:read" />
            <P>Recherche les voyages disponibles pour un trajet et une date.</P>
            <Params
              rows={[
                ['origin', 'string', "Ville de départ (ex. Abidjan)"],
                ['destination', 'string', "Ville d'arrivée"],
                ['date', 'string', 'Date de départ au format YYYY-MM-DD'],
                ['passengers', 'int', 'Nombre de places souhaitées (défaut 1)'],
                ['limit / offset', 'int', 'Pagination'],
              ]}
            />
            <CodeBlock
              tabs={[
                { label: 'cURL', code: `curl "${API_BASE}/ext/trips?origin=Abidjan&destination=Bouake&date=2026-07-01&passengers=2" \\
  -H "X-API-Key: tpk_live_xxxxxxxxxxxxxxxxxxxx"` },
                { label: 'Réponse', code: `{
  "success": true,
  "data": [
    {
      "id": "cmtrip123",
      "departureAt": "2026-07-01T08:00:00.000Z",
      "estimatedArrivalAt": "2026-07-01T12:30:00.000Z",
      "status": "SCHEDULED",
      "price": 8000,
      "availableSeats": 23,
      "totalSeats": 50,
      "route": {
        "name": "Abidjan - Bouake",
        "distanceKm": 345,
        "durationMinutes": 270,
        "originCity": { "name": "Abidjan" },
        "destinationCity": { "name": "Bouake" }
      },
      "vehicle": { "brand": "Mercedes", "model": "Sprinter", "capacity": 50 },
      "tenant": { "name": "Transport Express", "slug": "transport-express" }
    }
  ],
  "timestamp": "2026-07-01T07:00:00.000Z"
}` },
              ]}
            />
            <EndpointHead method="GET" path="/ext/trips/:id" scope="trips:read" />
            <P>Détails d'un voyage, incluant les arrêts intermédiaires et le contact de la compagnie.</P>
          </Section>

          {/* Gares & itinéraires */}
          <Section id="gares-itineraires" title="Gares & itinéraires" icon={<Boxes size={22} className="text-brand-500" />}>
            <EndpointHead method="GET" path="/ext/stations" scope="stations:read" />
            <P>Liste les gares actives (coordonnées, ville, compagnie). Accepte <C>limit</C> / <C>offset</C>.</P>
            <EndpointHead method="GET" path="/ext/routes" scope="routes:read" />
            <P>Liste les itinéraires actifs (villes, distance, durée, prix de base).</P>
            <CodeBlock tabs={[{ label: 'Réponse', code: `{
  "success": true,
  "data": [
    {
      "id": "cmroute1",
      "name": "Abidjan - Bouake",
      "distanceKm": 345,
      "durationMinutes": 270,
      "basePrice": 8000,
      "originCity": { "name": "Abidjan" },
      "destinationCity": { "name": "Bouake" },
      "tenant": { "name": "Transport Express", "slug": "transport-express" }
    }
  ],
  "timestamp": "2026-07-01T07:00:00.000Z"
}` }]} />
          </Section>

          {/* Réservations */}
          <Section id="reservations" title="Réservations" icon={<KeyRound size={22} className="text-brand-500" />}>
            <EndpointHead method="POST" path="/ext/bookings" scope="bookings:write" />
            <P>
              Crée une réservation au statut <C>PENDING</C> (expire après 15 min) et renvoie un lien de
              paiement <C>payment.url</C>. Utilisez un header <C>Idempotency-Key</C> pour éviter les doublons.
            </P>
            <Params
              rows={[
                ['tripId', 'string', 'Identifiant du voyage'],
                ['passengerName', 'string', 'Nom complet du passager'],
                ['passengerPhone', 'string', 'Téléphone au format E.164 (+225…)'],
                ['passengerEmail', 'string?', 'Email du passager (optionnel)'],
                ['seatNumbers', 'string[]', 'Sièges réservés (ex. ["A1","A2"])'],
              ]}
            />
            <CodeBlock
              tabs={[
                { label: 'cURL', code: `curl -X POST "${API_BASE}/ext/bookings" \\
  -H "X-API-Key: tpk_live_xxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tripId": "cmtrip123",
    "passengerName": "Awa Kone",
    "passengerPhone": "+2250700000000",
    "seatNumbers": ["A1", "A2"]
  }'` },
                { label: 'SDK (TS)', code: `const booking = await client.createBooking({
  tripId: "cmtrip123",
  passengerName: "Awa Kone",
  passengerPhone: "+2250700000000",
  seatNumbers: ["A1", "A2"],
});
// Rediriger l'utilisateur vers booking.payment.url` },
                { label: 'Réponse', code: `{
  "success": true,
  "data": {
    "id": "cmbook123",
    "reference": "TPXLZK9F2A",
    "status": "PENDING",
    "totalAmount": 16000,
    "currency": "XOF",
    "expiresAt": "2026-07-01T08:15:00.000Z",
    "createdAt": "2026-07-01T08:00:00.000Z",
    "payment": {
      "url": "https://pay.geniuspay.ci/checkout/abc123",
      "reference": "PMT_abc123",
      "expiresAt": "2026-07-01T08:15:00.000Z"
    }
  },
  "timestamp": "2026-07-01T08:00:00.000Z"
}` },
              ]}
            />
            <EndpointHead method="GET" path="/ext/bookings/:reference" scope="bookings:read" />
            <P>Récupère une réservation par sa référence (statut, voyage, paiement, passager).</P>
          </Section>

          {/* Colis */}
          <Section id="colis" title="Colis" icon={<Boxes size={22} className="text-brand-500" />}>
            <EndpointHead method="GET" path="/ext/parcels/:code" scope="parcels:read" />
            <P>Suit un colis par son code de tracking (statut, expéditeur, destinataire, voyage associé).</P>
            <CodeBlock tabs={[{ label: 'Réponse', code: `{
  "success": true,
  "data": {
    "trackingCode": "PCL-8KD2M",
    "description": "Documents",
    "weightKg": 2.5,
    "status": "IN_TRANSIT",
    "senderName": "Awa Kone",
    "recipientName": "Yao Kouassi",
    "recipientPhone": "+2250700000000",
    "station": { "name": "Gare d'Adjame", "city": { "name": "Abidjan" } },
    "trip": {
      "status": "DEPARTED",
      "route": { "originCity": { "name": "Abidjan" }, "destinationCity": { "name": "Bouake" } }
    }
  },
  "timestamp": "2026-07-01T07:00:00.000Z"
}` }]} />
          </Section>

          {/* Méta */}
          <Section id="meta" title="Méta">
            <EndpointHead method="GET" path="/ext/me" />
            <P>Renvoie les informations du consumer associé à la clé et le détail de la clé courante (scopes, environnement).</P>
            <CodeBlock tabs={[{ label: 'Réponse', code: `{
  "success": true,
  "data": {
    "consumer": { "id": "cmc1", "name": "Mon app", "plan": "STARTER", "accessStatus": "SANDBOX" },
    "key": {
      "name": "Serveur backend",
      "environment": "TEST",
      "scopes": ["trips:read", "stations:read", "routes:read", "parcels:read"],
      "expiresAt": null
    }
  },
  "timestamp": "2026-07-01T07:00:00.000Z"
}` }]} />
          </Section>

          {/* Webhooks */}
          <Section id="webhooks" title="Webhooks" icon={<Webhook size={22} className="text-brand-500" />}>
            <P>
              Configurez une <C>webhookUrl</C> dans la console. {appName} y enverra une requête <C>POST</C>
              à chaque événement. Un secret de signature <C>whsec_…</C> est généré pour vérifier l'authenticité.
            </P>
            <Params
              rows={[
                ['BOOKING_CONFIRMED', 'event', "Paiement d'une réservation confirmé"],
                ['BOOKING_CANCELLED', 'event', 'Réservation annulée (expiration ou voyage annulé)'],
                ['TRIP_DELAYED', 'event', 'Voyage retardé'],
                ['TRIP_CANCELLED', 'event', 'Voyage annulé par la compagnie'],
                ['PARCEL_STATUS_CHANGED', 'event', "Statut d'un colis modifié"],
              ]}
            />
            <H3>Requête reçue</H3>
            <P>Headers : <C>X-TransPro-Event</C>, <C>X-TransPro-Delivery</C>, <C>X-TransPro-Timestamp</C>, <C>X-TransPro-Signature</C>.</P>
            <CodeBlock tabs={[{ label: 'Payload', code: `{
  "id": "whd_8f2a1c",
  "event": "BOOKING_CONFIRMED",
  "createdAt": "2026-07-01T08:05:00.000Z",
  "data": {
    "reference": "TPXLZK9F2A",
    "status": "CONFIRMED",
    "tripId": "cmtrip123"
  }
}` }]} />
            <Callout>
              Répondez <C>2xx</C> rapidement. En cas d'échec, {appName} réessaie jusqu'à <strong>6 fois</strong>
              avec backoff (1 min → 24 h). Soyez idempotent en vous basant sur <C>X-TransPro-Delivery</C>.
            </Callout>
          </Section>

          {/* Signature */}
          <Section id="signature" title="Vérifier la signature">
            <P>
              La signature est un HMAC-SHA256 de <C>{'"{timestamp}.{corps brut}"'}</C> avec votre
              <C>webhookSecret</C>. Comparez <C>sha256=&lt;hmac&gt;</C> au header reçu (comparaison à temps constant).
            </P>
            <CodeBlock
              tabs={[
                { label: 'Node.js', code: `import crypto from "crypto";

function verify(rawBody, timestamp, signature, secret) {
  const expected = "sha256=" + crypto
    .createHmac("sha256", secret)
    .update(timestamp + "." + rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}` },
                { label: 'SDK (TS)', code: `import { verifyWebhookSignature } from "@transpro/sdk";

const ok = verifyWebhookSignature({
  rawBody, secret: process.env.TRANSPRO_WEBHOOK_SECRET,
  timestamp: req.headers["x-transpro-timestamp"],
  signature: req.headers["x-transpro-signature"],
});
if (!ok) return res.status(400).end();` },
              ]}
            />
          </Section>

          {/* Sandbox */}
          <Section id="sandbox" title="Sandbox (mode test)" icon={<Terminal size={22} className="text-brand-500" />}>
            <P>Générez une clé de test (<C>tpk_test_…</C>) pour intégrer sans risque :</P>
            <ul className="list-disc list-inside text-[15px] text-gray-600 space-y-1.5 mb-4">
              <li>Les endpoints de <strong>lecture</strong> fonctionnent sur les données réelles.</li>
              <li>Les clés de test <strong>ne décomptent pas</strong> le quota (<C>X-RateLimit-Limit: unlimited</C>).</li>
              <li>Chaque réponse porte <C>X-TransPro-Environment: test</C>.</li>
              <li><C>POST /ext/bookings</C> renvoie une réservation <strong>simulée</strong> (<C>test: true</C>) — aucune persistance.</li>
            </ul>
            <H3>Tester vos webhooks</H3>
            <EndpointHead method="POST" path="/ext/test/trigger-webhook" />
            <P>Envoie un événement d'exemple signé vers votre <C>webhookUrl</C>. Réservé aux clés de test.</P>
            <CodeBlock tabs={[{ label: 'cURL', code: `curl -X POST "${API_BASE}/ext/test/trigger-webhook" \\
  -H "X-API-Key: tpk_test_xxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{ "event": "BOOKING_CONFIRMED" }'` }]} />
          </Section>

          {/* SDK */}
          <Section id="sdk" title="SDK & clients" icon={<FileCode2 size={22} className="text-brand-500" />}>
            <P>
              Un <strong>SDK TypeScript officiel</strong> sans dépendance fournit un client typé pour tous
              les endpoints <C>/ext</C> ainsi que <C>verifyWebhookSignature</C>.
            </P>
            <CodeBlock tabs={[{ label: 'TypeScript', code: `import { TransProClient } from "@transpro/sdk";

const client = new TransProClient({
  apiKey: process.env.TRANSPRO_API_KEY,
  // baseUrl: "${API_BASE}", // optionnel
});

const trips = await client.searchTrips({ origin: "Abidjan", destination: "Bouake", date: "2026-07-01" });
const me = await client.me();` }]} />
            <P>
              Une spécification <strong>OpenAPI 3.0</strong> est servie à <C>/developers-json</C> — générez un
              client dans n'importe quel langage avec openapi-generator :
            </P>
            <CodeBlock tabs={[{ label: 'Shell', code: `openapi-generator-cli generate \\
  -i ${API_BASE.replace('/api/v1', '')}/developers-json \\
  -g python -o ./sdk-py` }]} />
          </Section>

          {/* Bonnes pratiques */}
          <Section id="bonnes-pratiques" title="Bonnes pratiques" icon={<ShieldCheck size={22} className="text-brand-500" />}>
            <ul className="list-disc list-inside text-[15px] text-gray-600 space-y-1.5">
              <li><strong>Mettez en cache</strong> les listes peu changeantes (<C>/stations</C>, <C>/routes</C>).</li>
              <li><strong>Paginez</strong> avec <C>limit</C> / <C>offset</C>.</li>
              <li><strong>Surveillez</strong> <C>X-RateLimit-Remaining</C> pour anticiper les <C>429</C>.</li>
              <li><strong>Appelez l'API depuis votre backend</strong> — jamais avec la clé exposée côté client.</li>
              <li><strong>Rejouez en sécurité</strong> les <C>POST</C> avec <C>Idempotency-Key</C>.</li>
            </ul>
          </Section>

          {/* Versioning */}
          <Section id="versioning" title="Versioning">
            <P>
              L'API est versionnée par URL (<C>/api/v1</C>). Les changements incompatibles introduiront
              <C>/api/v2</C> avec une période de dépréciation annoncée à l'avance.
            </P>
            <div className="mt-8 rounded-2xl border border-gray-100 bg-gray-50 p-6 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900">Prêt à intégrer ?</p>
                <p className="text-sm text-gray-500 mt-0.5">Créez votre compte et obtenez une clé de test en quelques secondes.</p>
              </div>
              <Link href="/developer/register"
                className="shrink-0 inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition">
                Commencer <ArrowRight size={15} />
              </Link>
            </div>
          </Section>

          <footer className="border-t border-gray-100 pt-6 mt-12 text-sm text-gray-400 flex items-center justify-between">
            <span>© {new Date().getFullYear()} {appName}</span>
            <a href={`${API_BASE.replace('/api/v1', '')}/developers`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-gray-600">
              Référence Swagger <ExternalLink size={13} />
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}
