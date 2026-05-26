'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsApi, api, citiesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { TenantPlan, TenantStatus } from '@transpro/shared';
import { Building2, User, CreditCard, Loader2, Eye, EyeOff, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { SearchableSelect, SelectOption } from '@/components/ui/SearchableSelect';

type Tab = 'company' | 'profile' | 'subscription';

const planConfig: Record<TenantPlan, {
  label: string;
  priceMonthly: number;
  features: string[];
  color: string;
}> = {
  BASIC: {
    label: 'Basic',
    priceMonthly: 29_000,
    features: [
      "Jusqu'à 3 véhicules",
      "Jusqu'à 5 chauffeurs",
      'Gestion réservations',
      'Support par email',
    ],
    color: 'bg-gray-100 text-gray-700',
  },
  PROFESSIONAL: {
    label: 'Professional',
    priceMonthly: 79_000,
    features: [
      "Jusqu'à 20 véhicules",
      'Chauffeurs illimités',
      'Plan des sièges en temps réel',
      'Notifications SMS/WhatsApp',
      'Support prioritaire',
    ],
    color: 'bg-brand-100 text-brand-700',
  },
  ENTERPRISE: {
    label: 'Enterprise',
    priceMonthly: 199_000,
    features: [
      'Véhicules illimités',
      'API complète',
      'Tableau de bord analytics avancé',
      'Multi-agences',
      'Account manager dédié',
      'SLA 99.9%',
    ],
    color: 'bg-purple-100 text-purple-700',
  },
};

const tenantStatusConfig: Record<TenantStatus, { label: string; className: string }> = {
  TRIAL: { label: 'Essai gratuit', className: 'bg-blue-100 text-blue-700' },
  ACTIVE: { label: 'Actif', className: 'bg-green-100 text-green-700' },
  SUSPENDED: { label: 'Suspendu', className: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Résilié', className: 'bg-gray-100 text-gray-600' },
};

export default function SettingsPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<Tab>('company');

  const [companyForm, setCompanyForm] = useState({
    name: '',
    sigle: '',
    phone: '',
    address: '',
    cityId: '',
    logo: '' as string | null,
  });
  const [companyFormLoaded, setCompanyFormLoaded] = useState(false);

  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ['tenant-me'],
    queryFn: () => tenantsApi.me() as any,
  });

  const { data: cities = [] } = useQuery<any[]>({
    queryKey: ['cities'],
    queryFn: async () => ((await citiesApi.list()) ?? []) as any[],
    staleTime: 5 * 60 * 1000,
  });
  const cityOptions: SelectOption[] = (cities as any[]).map((c) => ({ value: c.id, label: c.name, sub: c.region ?? undefined }));

  useEffect(() => {
    if (tenant && !companyFormLoaded) {
      const data = tenant as any;
      setCompanyForm({
        name: data.name ?? '',
        sigle: data.sigle ?? '',
        phone: data.phone ?? '',
        address: data.address ?? '',
        cityId: data.cityId ?? '',
        logo: data.logo ?? null,
      });
      setCompanyFormLoaded(true);
    }
  }, [tenant, companyFormLoaded]);

  const updateTenantMutation = useMutation({
    mutationFn: (data: any) => tenantsApi.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-me'] });
      toast.success('Informations de la compagnie mises à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Fichier invalide — image uniquement'); return; }
    if (file.size > 500_000) { toast.error('Logo trop volumineux (max 500 Ko)'); return; }
    const reader = new FileReader();
    reader.onload = () => setCompanyForm((p) => ({ ...p, logo: reader.result as string }));
    reader.readAsDataURL(file);
  }

  function handleCompanySubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = { ...companyForm };
    if (!payload.sigle) delete payload.sigle;
    if (!payload.logo) payload.logo = null;
    updateTenantMutation.mutate(payload);
  }

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/users/change-password', data),
    onSuccess: () => {
      toast.success('Mot de passe modifié avec succès');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: () => {
      toast.error('Erreur — vérifiez votre mot de passe actuel');
    },
  });

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Le mot de passe doit faire au moins 8 caractères');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'company', label: 'Compagnie', icon: <Building2 size={16} /> },
    { key: 'profile', label: 'Mon profil', icon: <User size={16} /> },
    { key: 'subscription', label: 'Abonnement', icon: <CreditCard size={16} /> },
  ];

  const tenantData = tenant as any;
  const currentPlan: TenantPlan = tenantData?.plan ?? TenantPlan.BASIC;
  const currentStatus: TenantStatus = tenantData?.status ?? TenantStatus.TRIAL;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'company' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Profil de la compagnie</h2>

          {tenantLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Plan:</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${planConfig[currentPlan].color}`}>
                    {planConfig[currentPlan].label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Statut:</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${tenantStatusConfig[currentStatus].className}`}>
                    {tenantStatusConfig[currentStatus].label}
                  </span>
                </div>
                {tenantData?.trialEndsAt && currentStatus === TenantStatus.TRIAL && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Fin d&apos;essai:</span>
                    <span className="text-sm font-medium text-gray-700">
                      {dayjs(tenantData.trialEndsAt).format('DD/MM/YYYY')}
                    </span>
                  </div>
                )}
              </div>

              <form onSubmit={handleCompanySubmit} className="space-y-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
                      {companyForm.logo ? (
                        <img src={companyForm.logo} alt="logo" className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="text-gray-300 text-xs text-center leading-tight">Aucun logo</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">
                        <Upload size={14} />
                        Importer un fichier
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
                      </label>
                      {companyForm.logo && (
                        <button
                          type="button"
                          onClick={() => setCompanyForm((p) => ({ ...p, logo: null }))}
                          className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600"
                        >
                          <X size={12} /> Supprimer le logo
                        </button>
                      )}
                      <p className="text-xs text-gray-400">PNG, JPG, SVG · max 500 Ko</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom de la compagnie
                    </label>
                    <input
                      type="text"
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sigle <span className="text-gray-400 font-normal">(abréviation)</span>
                    </label>
                    <input
                      type="text"
                      value={companyForm.sigle}
                      onChange={(e) => setCompanyForm((p) => ({ ...p, sigle: e.target.value.toUpperCase().slice(0, 10) }))}
                      placeholder="ex. STI, CTB, STA"
                      maxLength={10}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase placeholder:normal-case"
                    />
                    <p className="text-xs text-gray-400 mt-0.5">Affiché dans la barre latérale si le nom est long</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={tenantData?.email ?? ''}
                      readOnly
                      className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={companyForm.address}
                      onChange={(e) => setCompanyForm((p) => ({ ...p, address: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                    <SearchableSelect
                      options={cityOptions}
                      value={companyForm.cityId}
                      onChange={(v) => setCompanyForm((p) => ({ ...p, cityId: v }))}
                      placeholder="Choisir une ville..."
                      clearable
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={updateTenantMutation.isPending}
                    className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition disabled:opacity-60"
                  >
                    {updateTenantMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                    Enregistrer
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <div className="border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
                  {user?.firstName ?? '—'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <div className="border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
                  {user?.lastName ?? '—'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
                  {user?.email ?? '—'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <div className="border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
                  {(user as any)?.phone ?? '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Changer le mot de passe</h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-sm">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))
                    }
                    minLength={8}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
                {passwordForm.confirmPassword &&
                  passwordForm.newPassword !== passwordForm.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
                  )}
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition disabled:opacity-60"
                >
                  {changePasswordMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Changer le mot de passe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'subscription' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Votre abonnement</h2>
            <p className="text-sm text-gray-500 mb-5">
              Vous êtes actuellement sur le plan{' '}
              <span className={`font-semibold px-1.5 py-0.5 rounded text-xs ${planConfig[currentPlan].color}`}>
                {planConfig[currentPlan].label}
              </span>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(Object.keys(planConfig) as TenantPlan[]).map((plan) => {
                const config = planConfig[plan];
                const isCurrent = plan === currentPlan;
                return (
                  <div
                    key={plan}
                    className={`rounded-xl border-2 p-5 flex flex-col gap-4 transition ${
                      isCurrent
                        ? 'border-brand-400 bg-brand-50'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900">{config.label}</span>
                        {isCurrent && (
                          <span className="text-xs bg-brand-500 text-white px-2 py-0.5 rounded-full font-medium">
                            Actuel
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {new Intl.NumberFormat('fr-CI').format(config.priceMonthly)}
                        <span className="text-sm font-normal text-gray-500"> FCFA/mois</span>
                      </p>
                    </div>

                    <ul className="space-y-2 flex-1">
                      {config.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-brand-500 mt-0.5">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {!isCurrent && (
                      <button
                        onClick={() =>
                          toast.info('Contactez notre équipe pour changer de plan : support@transpro.ci')
                        }
                        className="w-full bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-lg text-sm font-medium transition"
                      >
                        Passer à {config.label}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-gray-400 mt-4 text-center">
              Pour changer de plan, contactez notre équipe commerciale à{' '}
              <a href="mailto:support@transpro.ci" className="text-brand-500 hover:underline">
                support@transpro.ci
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
