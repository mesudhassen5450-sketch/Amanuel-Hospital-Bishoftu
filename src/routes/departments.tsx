import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { departments } from "@/lib/site-data";
import { useLanguage } from "@/lib/language-context";
import { t, translations, translatedDepartments } from "@/lib/translations";

export const Route = createFileRoute("/departments")({
  head: () => ({
    meta: [
      { title: "Departments — Dr. Amanuel Hospital" },
      { name: "description", content: "Clinical specialties at Dr. Amanuel Hospital: internal medicine, general surgery, orthopedic surgery, obstetrics and gynecology, ENT, ophthalmology, neurosurgery, pediatric surgery, dermatology, and psychiatry." },
      { property: "og:title", content: "Departments — Dr. Amanuel Hospital" },
      { property: "og:url", content: "/departments" },
    ],
    links: [{ rel: "canonical", href: "/departments" }],
  }),
  component: DepartmentsPage,
});

function DepartmentsPage() {
  const { lang } = useLanguage();
  const tr = translations.departments;

  // Merge translated names/descriptions with the icons from site-data
  const depts = translatedDepartments[lang].map((d, i) => ({
    ...d,
    icon: departments.find((item) => item.name === translatedDepartments.en[i]?.name)?.icon ?? departments[i].icon,
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
          {depts.map((dept, i) => (
            <Reveal key={dept.name} delay={(i % 3) * 70}>
              <div className="group h-full rounded-2xl border border-border bg-card p-6 hover-lift">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                  <dept.icon className="h-7 w-7 transition-transform duration-300 group-hover:animate-pulse-soft" aria-hidden="true" />
                </span>
                <h2 className="mt-4 font-display text-xl font-semibold">{dept.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{dept.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
