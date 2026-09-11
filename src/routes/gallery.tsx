import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { galleryImages, type GalleryImage } from "@/lib/site-data";
import { useLanguage } from "@/lib/language-context";
import { t, translations } from "@/lib/translations";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — Dr. Amanuel Hospital" },
      { name: "description", content: "A look inside Dr. Amanuel Hospital: wards, laboratory, operating theaters and more." },
      { property: "og:title", content: "Gallery — Dr. Amanuel Hospital" },
      { property: "og:url", content: "/gallery" },
    ],
    links: [{ rel: "canonical", href: "/gallery" }],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const { lang } = useLanguage();
  const tr = translations.gallery;
  const [selected, setSelected] = useState<GalleryImage | null>(null);

  return (
    <SiteLayout>
      <PageHero
        breadcrumb={t(tr.breadcrumb, lang)}
        title={t(tr.heroTitle, lang)}
        subtitle={t(tr.heroSub, lang)}
      />
      <section className="py-20">
        <div className="mx-auto max-w-7xl columns-1 gap-5 px-4 sm:columns-2 lg:columns-3 lg:px-8 [&>div]:mb-5">
          {galleryImages.map((img, i) => (
            <Reveal key={img.id} delay={(i % 3) * 60}>
              <button
                onClick={() => setSelected(img)}
                className="img-zoom block w-full rounded-2xl focus-visible:outline-2 focus-visible:outline-ring"
                aria-label={`View larger: ${img.alt}`}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  width={img.width}
                  height={img.height}
                  loading="lazy"
                  className="w-full rounded-2xl object-cover"
                />
              </button>
            </Reveal>
          ))}
        </div>
      </section>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-4xl overflow-hidden rounded-2xl border-none bg-transparent p-0 shadow-none">
          {selected && (
            <>
              <DialogTitle className="sr-only">{selected.alt}</DialogTitle>
              <img
                src={selected.src}
                alt={selected.alt}
                width={selected.width}
                height={selected.height}
                className="max-h-[80vh] w-full rounded-2xl object-contain animate-scale-in"
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}
