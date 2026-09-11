import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight, Star, Search, HeartPulse, Stethoscope, Pill, Ambulance,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Reveal } from "@/components/site/Reveal";
import { StatCounter } from "@/components/site/StatCounter";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious,
} from "@/components/ui/carousel";
import { services } from "@/lib/site-data";
import { useDoctorsPresence } from "@/lib/useDoctorPresence";
import { useLanguage } from "@/lib/language-context";
import { t, translations, translatedFaqs, translatedTestimonials, translatedStats } from "@/lib/translations";
import { cn } from "@/lib/utils";
import heroHospital from "@/assets/building.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dr. Amanuel Hospital — Amanuel Hospital Bishoftu" },
      { name: "description", content: "Official website of Amanuel Hospital in Bishoftu. Providing quality healthcare, emergency services, and medical care at dr amanuel hospital." },
      { name: "keywords", content: "amanuel hospital, amanuel hospital bishoftu, dr amanuel hospital" },
      { property: "og:title", content: "Dr. Amanuel Hospital — Amanuel Hospital Bishoftu" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <SiteLayout>
      <Hero />
      <ServicesPreview />
      <DoctorsPreview />
      <ObnTvSection />
      <TestimonialsSection />
      <FaqSection />
      <CtaBand />
    </SiteLayout>
  );
}

function Hero() {
  const { lang } = useLanguage();
  const tr = translations.hero;
  const stats = translatedStats[lang];

  return (
    <section className="relative flex min-h-[92vh] items-center overflow-hidden">
      <img src={heroHospital} alt="Dr. Amanuel Hospital modern building exterior"
        width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/60 to-foreground/20 dark:from-background/90 dark:via-background/70 dark:to-background/30" />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-32 lg:px-8">
        <div className="max-w-2xl">
          <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight text-white md:text-6xl lg:text-7xl tracking-tight drop-shadow-md">
            {t(tr.title1, lang)}
            <span className="block text-white">
              {t(tr.title2, lang)}
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-slate-100 drop-shadow-sm md:text-lg leading-relaxed">
            {t(tr.subtitle, lang)}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-xl px-8 precise-button">
              <Link to="/booking">
                {t(translations.nav.bookAppt, lang)}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline"
              className="rounded-xl border-primary-foreground/40 bg-transparent px-8 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground precise-button">
              <Link to="/services">
                {t(tr.exploreServices, lang)} <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-6 rounded-2xl sharp-card bg-white dark:bg-slate-950 p-6 md:grid-cols-4 md:p-8 border border-border dark:border-slate-800">
          {stats.map((s) => (
            <StatCounter key={s.label} value={s.value} suffix={s.suffix} label={s.label} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServicesPreview() {
  const { lang } = useLanguage();
  const tr = translations.sections;

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow={t(tr.ourServices, lang)}
            title={t(tr.comprehensiveCare, lang)}
            subtitle={t(tr.comprehensiveSub, lang)}
          />
        </Reveal>
        {/* Replace AI 4-card grid with asymmetrical technical layout */}
        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Primary service takes 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {services.slice(0, 2).map((service, i) => (
              <Reveal key={service.id} delay={i * 60}>
                <div className="group h-full rounded-xl sharp-card technical-focus p-6 bg-card border">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <service.icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-lg font-semibold mb-2">{service.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
                      <Link to="/services"
                        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary transition-all duration-200 hover:gap-2">
                        {t(tr.learnMore, lang)} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          
          {/* Secondary services in structured list */}
          <div className="space-y-4">
            {services.slice(2).map((service, i) => (
              <Reveal key={service.id} delay={(i + 2) * 60}>
                <div className="group sharp-card technical-focus p-4 bg-card border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded bg-secondary text-primary">
                      <service.icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{service.title}</h4>
                      <p className="text-xs text-muted-foreground mono-technical">Available 24/7</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DoctorsPreview() {
  const { lang } = useLanguage();
  const tr = translations.sections;
  const docTr = translations.doctors;
  const { doctors: doctorsList, loading } = useDoctorsPresence();

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow={t(tr.ourTeam, lang)}
            title={t(tr.meetDoctors, lang)}
            subtitle={t(tr.meetDoctorsSub, lang)}
          />
        </Reveal>
        {/* Replace AI card grid with clean technical layout */}
        <div className="mt-12 space-y-8">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-slate-500 font-medium animate-pulse">Loading doctors...</p>
            </div>
          ) : doctorsList.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400 font-medium">No doctors currently listed</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {doctorsList.slice(0, 3).map((doc, i) => (
                <Reveal key={doc.id} delay={i * 60}>
                  <div className="sharp-card technical-focus bg-card border rounded-xl p-6">
                    <div className="aspect-square overflow-hidden rounded-lg mb-4 border border-border">
                      <img
                        src={doc.photo || "/doctor1.jpg"}
                        alt={doc.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/doctor1.jpg";
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display font-semibold text-lg">Dr. {doc.name.replace(/^Dr\.\s*/, '')}</h3>
                        <span className={cn(
                          "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
                          doc.isOnline
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", doc.isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                          {doc.isOnline ? "Online" : "Offline"}
                        </span>
                      </div>
                      <p className="text-sm text-primary font-medium">{doc.specialty || 'General Practice'}</p>
                      <p className="text-xs text-muted-foreground mono-technical">{doc.experience || '5+ years experience'}</p>
                      {doc.bio && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 italic pt-1">
                          "{doc.bio}"
                        </p>
                      )}
                      <div className="flex items-center gap-1 pt-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium mono-technical">4.9</span>
                      </div>
                      <Button asChild variant="outline" className="w-full mt-4 rounded-xl precise-button">
                        <Link to="/booking">
                          {t(docTr.bookAppt, lang)}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
          
          {/* Technical CTA strip */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 sharp-card bg-card border rounded-xl">
            <div>
              <h4 className="font-display font-semibold">All Doctors</h4>
              <p className="text-sm text-muted-foreground mono-technical">
                View complete medical staff directory
              </p>
            </div>
            <Button asChild className="rounded-xl precise-button">
              <Link to="/doctors">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ObnTvSection() {
  const { lang } = useLanguage();
  const tr = translations.sections;

  return (
    <section className="py-20 md:py-28 bg-muted/20">
      <div className="mx-auto max-w-5xl px-4 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow={t(tr.obnEyebrow, lang)}
            title={t(tr.obnTitle, lang)}
            subtitle={t(tr.obnSub, lang)}
          />
        </Reveal>
        <Reveal className="mt-12">
          <div className="overflow-hidden rounded-2xl sharp-card bg-card border">
            <video controls preload="metadata" className="w-full rounded-2xl"
              aria-label="Dr. Amanuel Hospital as featured on OBN Television">
              <source src="/amanvid.mp4" type="video/mp4" />
              {t(translations.common.videoNoSupport, lang)}
            </video>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground mono-technical">
            {t(tr.obnCaption, lang)} —{" "}
            <span className="font-semibold text-foreground">OBN Television</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const { lang } = useLanguage();
  const tr = translations.sections;
  const testimonials = translatedTestimonials[lang];

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-4 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow={t(tr.testimonials, lang)}
            title={t(tr.whatPatientsSay, lang)}
            subtitle={t(tr.patientsSub, lang)}
          />
        </Reveal>
        <Reveal className="mt-12">
          <Carousel opts={{ loop: true }} className="mx-auto max-w-3xl">
            <CarouselContent>
              {testimonials.map((item) => (
                <CarouselItem key={item.name}>
                  <figure className="mx-2 rounded-2xl border border-border bg-card p-8 text-center sharp-card md:p-10">
                    <div className="flex justify-center gap-1" aria-label="5 out of 5 stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-primary text-primary" aria-hidden="true" />
                      ))}
                    </div>
                    <blockquote className="mt-5 text-base text-foreground md:text-lg">
                      "{item.quote}"
                    </blockquote>
                    <figcaption className="mt-5">
                      <p className="font-display font-semibold">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.role}</p>
                    </figcaption>
                  </figure>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </Reveal>
      </div>
    </section>
  );
}

function FaqSection() {
  const { lang } = useLanguage();
  const tr = translations.sections;
  const [query, setQuery] = useState("");
  const faqs = translatedFaqs[lang];
  const filtered = faqs.filter(
    (f) =>
      f.question.toLowerCase().includes(query.toLowerCase()) ||
      f.answer.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <section className="bg-muted/30 py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow={t(tr.faqEyebrow, lang)}
            title={t(tr.faqTitle, lang)}
            subtitle={t(tr.faqSub, lang)}
          />
        </Reveal>
        <Reveal className="mt-8">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <label htmlFor="faq-search" className="sr-only">{t(tr.faqSearch, lang)}</label>
            <Input id="faq-search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={t(tr.faqSearch, lang)} className="rounded-xl pl-10" />
          </div>
          <Accordion type="single" collapsible className="mt-6">
            {filtered.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-border">
                <AccordionTrigger className="text-left font-display text-sm font-semibold md:text-base">
                  {f.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground md:text-base">
                  {f.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {filtered.length === 0 && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t(tr.faqNoResults, lang)} "{query}". {t(tr.faqTry, lang)}
            </p>
          )}
        </Reveal>
      </div>
    </section>
  );
}

function CtaBand() {
  const { lang } = useLanguage();
  const tr = translations.sections;

  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <Reveal>
          <div className="sharp-card relative overflow-hidden rounded-3xl px-6 py-14 text-center md:px-12 md:py-20 bg-white dark:bg-slate-900/90 border border-border dark:border-slate-800 transition-colors">
            <h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white md:text-4xl tracking-tight">
              {t(tr.ctaTitle, lang)}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-600 dark:text-slate-300 font-medium text-sm md:text-lg">
              {t(tr.ctaSub, lang)}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="secondary"
                className="rounded-xl px-8 precise-button bg-blue-600 hover:bg-blue-700 text-white">
                <Link to="/booking">
                  {t(translations.nav.bookAppt, lang)}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline"
                className="rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 px-8 precise-button">
                <Link to="/contact">{t(tr.contactUs, lang)}</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
