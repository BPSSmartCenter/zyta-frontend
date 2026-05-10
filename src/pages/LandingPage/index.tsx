// src/pages/LandingPage/index.tsx
import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import brandLogo from "../../assets/brand.png";
import solarIcon from "../../assets/solar-panel.png";
import boltIcon from "../../assets/CyanBolt.png";
import waterIcon from "../../assets/water-supply.png";
import windIcon from "../../assets/wind-sign.png";
import faceIcon from "../../assets/facerec.png";
import alertIcon from "../../assets/alertCyan.png";

const CONTACT_EMAIL = "bpstech.ai@gmail.com";
const CONTACT_PHONE = "+66 (0) 2 000 0000";

type ProductKey = "solar" | "electric" | "water" | "air" | "facerec" | "alert";

const PRODUCT_ITEMS: Array<{ key: ProductKey; icon: string }> = [
  { key: "solar", icon: solarIcon },
  { key: "electric", icon: boltIcon },
  { key: "water", icon: waterIcon },
  { key: "air", icon: windIcon },
  { key: "facerec", icon: faceIcon },
  { key: "alert", icon: alertIcon },
];

export default function LandingPage() {
  const { t } = useTranslation("landing");
  const year = new Date().getFullYear();

  const scrollTo = React.useCallback((id: string) => {
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar onAnchorClick={scrollTo} />

      <main>
        <Hero
          eyebrow={t("hero.eyebrow")}
          title={t("hero.title")}
          subtitle={t("hero.subtitle")}
          ctaPrimary={t("hero.ctaPrimary")}
          ctaSecondary={t("hero.ctaSecondary")}
          onSecondary={() => scrollTo("products")}
        />

        <Products
          title={t("products.title")}
          subtitle={t("products.subtitle")}
          items={PRODUCT_ITEMS.map((item) => ({
            ...item,
            title: t(`products.items.${item.key}.title`),
            desc: t(`products.items.${item.key}.desc`),
          }))}
        />

        <About
          title={t("about.title")}
          lead={t("about.lead")}
          body={t("about.body")}
          stats={[
            { label: t("about.stats.sites"), value: "120+" },
            { label: t("about.stats.devices"), value: "8,000+" },
            { label: t("about.stats.uptime"), value: "99.9%" },
          ]}
        />

        <Contact
          title={t("contact.title")}
          subtitle={t("contact.subtitle")}
          emailLabel={t("contact.emailLabel")}
          phoneLabel={t("contact.phoneLabel")}
          addressLabel={t("contact.addressLabel")}
          address={t("contact.address")}
          ctaEmail={t("contact.ctaEmail")}
        />
      </main>

      <Footer
        tagline={t("footer.tagline")}
        rights={t("footer.rights", { year })}
        privacy={t("footer.links.privacy")}
        terms={t("footer.links.terms")}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------
function Navbar({ onAnchorClick }: { onAnchorClick: (id: string) => void }) {
  const { t } = useTranslation("landing");
  const [open, setOpen] = React.useState(false);

  const handleAnchor = React.useCallback(
    (id: string) => {
      setOpen(false);
      onAnchorClick(id);
    },
    [onAnchorClick]
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="flex items-center gap-2 text-base font-semibold tracking-tight"
        >
          <img src={brandLogo} alt="BPS" className="h-8 w-8 rounded" />
          <span className="text-slate-900">BPS</span>
          <span className="hidden text-slate-500 sm:inline">
            Command Center
          </span>
        </a>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-8 md:flex"
        >
          <NavLink onClick={() => handleAnchor("products")}>
            {t("nav.products")}
          </NavLink>
          <NavLink onClick={() => handleAnchor("about")}>
            {t("nav.about")}
          </NavLink>
          <NavLink onClick={() => handleAnchor("contact")}>
            {t("nav.contact")}
          </NavLink>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/register"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            {t("nav.register")}
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            {t("nav.login")}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label="Toggle navigation"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 md:hidden"
        >
          <span className="material-icons-outlined text-xl" aria-hidden="true">
            {open ? "close" : "menu"}
          </span>
        </button>
      </div>

      {open ? (
        <div
          id="mobile-nav"
          className="border-t border-slate-200 bg-white md:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
            <MobileNavLink onClick={() => handleAnchor("products")}>
              {t("nav.products")}
            </MobileNavLink>
            <MobileNavLink onClick={() => handleAnchor("about")}>
              {t("nav.about")}
            </MobileNavLink>
            <MobileNavLink onClick={() => handleAnchor("contact")}>
              {t("nav.contact")}
            </MobileNavLink>
            <div className="mt-2 flex items-center gap-3">
              <Link
                to="/register"
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                {t("nav.register")}
              </Link>
              <Link
                to="/login"
                className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-cyan-600"
                onClick={() => setOpen(false)}
              >
                {t("nav.login")}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function NavLink({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
    >
      {children}
    </button>
  );
}

function MobileNavLink({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md px-3 py-2 text-left text-base font-medium text-slate-700 hover:bg-slate-100"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------
function Hero({
  eyebrow,
  title,
  subtitle,
  ctaPrimary,
  ctaSecondary,
  onSecondary,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  onSecondary: () => void;
}) {
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-gradient-to-b from-cyan-50 via-white to-white"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] [background:radial-gradient(60%_60%_at_50%_0%,rgba(34,169,224,0.18)_0%,transparent_70%)]" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 md:grid-cols-2 lg:px-8 lg:py-28">
        <div>
          <p className="inline-flex items-center rounded-full border border-cyan-200 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-700">
            {eyebrow}
          </p>
          <h1 className="mt-6 whitespace-pre-line text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            {subtitle}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              {ctaPrimary}
            </Link>
            <button
              type="button"
              onClick={onSecondary}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {ctaSecondary}
            </button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-cyan-100 to-sky-200 blur-2xl opacity-60" />
          <div className="relative rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50">
                <img src={brandLogo} alt="" className="h-7 w-7" />
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                Live
              </span>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <HeroStat label="Sites" value="120+" />
              <HeroStat label="Devices" value="8k+" />
              <HeroStat label="Uptime" value="99.9%" />
            </div>
            <div className="mt-6 space-y-2">
              <HeroBar label="Solar today" pct={78} tone="emerald" />
              <HeroBar label="Electric peak" pct={62} tone="cyan" />
              <HeroBar label="Air quality" pct={45} tone="amber" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3">
      <div className="text-lg font-bold text-slate-900">{value}</div>
      <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </div>
    </div>
  );
}

function HeroBar({
  label,
  pct,
  tone,
}: {
  label: string;
  pct: number;
  tone: "emerald" | "cyan" | "amber";
}) {
  const fill =
    tone === "emerald"
      ? "bg-emerald-400"
      : tone === "cyan"
        ? "bg-cyan-400"
        : "bg-amber-400";
  return (
    <div>
      <div className="flex justify-between text-xs font-medium text-slate-600">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
function Products({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Array<{ key: ProductKey; icon: string; title: string; desc: string }>;
}) {
  return (
    <section
      id="products"
      className="border-t border-slate-100 bg-slate-50/40 py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h2>
          <p className="mt-3 text-base text-slate-600">{subtitle}</p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.key}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 transition-colors group-hover:bg-cyan-100">
                <img src={item.icon} alt="" className="h-7 w-7 object-contain" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {item.desc}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------
function About({
  title,
  lead,
  body,
  stats,
}: {
  title: string;
  lead: string;
  body: string;
  stats: Array<{ label: string; value: string }>;
}) {
  return (
    <section id="about" className="py-20 lg:py-28">
      <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-lg font-medium text-slate-700">{lead}</p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {body}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center shadow-sm"
            >
              <div className="text-2xl font-bold text-cyan-600 sm:text-3xl">
                {s.value}
              </div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------
function Contact({
  title,
  subtitle,
  emailLabel,
  phoneLabel,
  addressLabel,
  address,
  ctaEmail,
}: {
  title: string;
  subtitle: string;
  emailLabel: string;
  phoneLabel: string;
  addressLabel: string;
  address: string;
  ctaEmail: string;
}) {
  return (
    <section
      id="contact"
      className="border-t border-slate-100 bg-slate-900 py-20 text-white lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h2>
          <p className="mt-3 text-base text-slate-300">{subtitle}</p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          <ContactCard label={emailLabel} value={CONTACT_EMAIL} icon="mail" />
          <ContactCard label={phoneLabel} value={CONTACT_PHONE} icon="phone" />
          <ContactCard label={addressLabel} value={address} icon="place" />
        </div>

        <div className="mt-12 text-center">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center rounded-lg bg-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-400"
          >
            {ctaEmail}
          </a>
        </div>
      </div>
    </section>
  );
}

function ContactCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
        <span className="material-icons-outlined text-[16px]" aria-hidden="true">
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-3 break-words text-base text-white">{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
function Footer({
  tagline,
  rights,
  privacy,
  terms,
}: {
  tagline: string;
  rights: string;
  privacy: string;
  terms: string;
}) {
  return (
    <footer className="bg-slate-950 py-10 text-slate-400">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:px-6 md:flex-row lg:px-8">
        <div className="flex items-center gap-3">
          <img src={brandLogo} alt="BPS" className="h-7 w-7 rounded" />
          <div>
            <div className="text-sm font-semibold text-white">BPS</div>
            <div className="text-xs">{tagline}</div>
          </div>
        </div>

        <nav className="flex items-center gap-6 text-xs">
          <a href="#" className="hover:text-white">
            {privacy}
          </a>
          <a href="#" className="hover:text-white">
            {terms}
          </a>
        </nav>

        <div className="text-xs">{rights}</div>
      </div>
    </footer>
  );
}
