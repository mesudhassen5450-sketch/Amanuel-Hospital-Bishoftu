import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { services } from "@/lib/site-data";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { t, translations, translatedServices } from "@/lib/translations";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Medical Services — Dr. Amanuel Hospital" },
      { name: "description", content: "Emergency, medical, surgical, pediatric, gynecology and obstetrics, ENT, and orthopedic surgical services at Dr. Amanuel Hospital, Bishoftu." },
      { property: "og:title", content: "Medical Services — Dr. Amanuel Hospital" },
      { property: "og:url", content: "/services" },
    ],
    links: [{ rel: "canonical", href: "/services" }],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const { lang } = useLanguage();
  const tr = translations.services;

  // Merge translated text with icons from site-data (keyed by index, order is fixed)
  const translatedList = translatedServices[lang].map((s, i) => ({
    ...s,
    icon: services.find((item) => item.id === s.id)?.icon ?? services[i].icon,
  }));

  return (
    <SiteLayout>
      <PageHero
        breadcrumb={t(tr.breadcrumb, lang)}
        title={t(tr.heroTitle, lang)}
        subtitle={t(tr.heroSub, lang)}
      />
      <section className="py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 sm:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {translatedList.map((service, i) => (
            <Reveal key={service.id} delay={(i % 3) * 70}>
              <ServiceCard service={service} />
            </Reveal>
          ))}
        </div>
        <div className="mx-auto mt-14 max-w-7xl px-4 text-center lg:px-8">
          <Button asChild size="lg" className="rounded-xl px-8">
            <Link to="/booking">
              {t(tr.bookAppt, lang)}
            </Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}

type ServiceItem = { id: string; title: string; description: string; detail: string; icon: React.ElementType };

const aroundTheClockServiceIds = new Set([
  "emergency-services",
  "surgical-services",
  "emergency-surgery-delivery",
  "orthopedic-services",
]);

function ServiceCard({ service }: { service: ServiceItem }) {
  const { lang } = useLanguage();
  const tr = translations.sections;
  const [open, setOpen] = useState(false);
  const isAroundTheClock = aroundTheClockServiceIds.has(service.id);

  return (
    <div className="group h-full rounded-2xl border border-border bg-card p-6 hover-lift">
      <span className="grid h-13 w-13 place-items-center rounded-xl bg-secondary p-3 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
        <service.icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <h2 className="font-display text-xl font-semibold">{service.title}</h2>
        {isAroundTheClock && (
          <Badge variant="secondary" className="rounded-lg font-semibold">
            24/7
          </Badge>
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{service.description}</p>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <p className="mt-3 rounded-xl bg-secondary/60 p-4 text-sm text-foreground/80">{service.detail}</p>
        </CollapsibleContent>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="mt-3 rounded-xl px-3 text-primary hover:text-primary">
            {open ? t(tr.showLess, lang) : t(tr.learnMore, lang)}
            <ChevronDown className={cn("ml-1 h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
          </Button>
        </CollapsibleTrigger>
      </Collapsible>
    </div>
  );
}
