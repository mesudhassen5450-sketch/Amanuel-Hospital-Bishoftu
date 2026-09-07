import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { translations } from "@/lib/translations";
import { useDoctorsPresence } from "@/lib/useDoctorPresence";
import { Video, Calendar, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { AvailableDoctorsModal } from "@/components/telemedicine/AvailableDoctorsModal";

export const Route = createFileRoute("/doctors")({
  head: () => ({
    meta: [
      { title: "Our Doctors — Dr. Amanuel Hospital" },
      { name: "description", content: "Meet the experienced physicians and specialists of Dr. Amanuel Hospital, Bishoftu." },
      { property: "og:title", content: "Our Doctors — Dr. Amanuel Hospital" },
      { property: "og:url", content: "/doctors" },
    ],
    links: [{ rel: "canonical", href: "/doctors" }],
  }),
  component: DoctorsPage,
});

function DoctorsPage() {
  const { lang } = useLanguage();
  const tr = translations.doctors;
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');
  const { doctors: doctorsList, onlineDoctors, offlineDoctors, loading } = useDoctorsPresence();
  const [expandedBios, setExpandedBios] = useState<Set<string>>(new Set());

  const toggleBio = (id: string) => {
    setExpandedBios((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Use live database doctors directly
  const displayedDoctors =
    filter === 'online'
      ? onlineDoctors
      : filter === 'offline'
      ? offlineDoctors
      : doctorsList;

  // Merge live database doctors with details
  const translatedDoctorsList = displayedDoctors.map((doc) => {
    return {
      ...doc,
      name: doc.name.startsWith("Dr.") ? doc.name.replace("Dr. ", "") : doc.name,
      specialty: doc.specialty || 'General Practice',
      experience: doc.experience
        ? (typeof doc.experience === 'number' ? `${doc.experience}+ years experience` : String(doc.experience))
        : '5+ years experience',
      availableToday: doc.isOnline ?? true,
    };
  });

  // Show loading state while fetching doctors
  if (loading) {
    return (
      <SiteLayout>
        <PageHero
          breadcrumb={t(tr.breadcrumb, lang)}
          title={t(tr.heroTitle, lang)}
          subtitle={t(tr.heroSub, lang)}
        />
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <p className="text-slate-500 font-semibold animate-pulse">Loading specialists...</p>
            </div>
          </div>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <PageHero
        breadcrumb={t(tr.breadcrumb, lang)}
        title={t(tr.heroTitle, lang)}
        subtitle={t(tr.heroSub, lang)}
      />
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          {/* Title & Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
                Our Medical Specialists
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                Connect instantly with online doctors or schedule a visit with our medical team.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All ({doctorsList.length})
              </button>
              <button
                onClick={() => setFilter('online')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  filter === 'online'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Online ({onlineDoctors.length})
              </button>
              <button
                onClick={() => setFilter('offline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === 'offline'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Offline ({offlineDoctors.length})
              </button>
            </div>
          </div>

          {/* Doctor Cards Grid / Empty State */}
          {translatedDoctorsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center my-8">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400">
                <Calendar className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Doctors Currently Listed</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                There are currently no specialists registered in the system. When doctors are registered in the Admin Panel, they will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {translatedDoctorsList.map((doc, i) => (
            <Reveal key={doc.id} delay={(i % 3) * 70}>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  {/* Doctor Avatar + Status Badge */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={doc.photo}
                          alt={doc.name}
                          className="w-14 h-14 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          onError={(e) => {
                            // Use doctor1.jpg from public directory as fallback
                            e.currentTarget.src = "/doctor1.jpg";
                          }}
                        />
                        {/* Corner Online Indicator */}
                        <span
                          className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                            doc.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">
                          Dr. {doc.name}
                        </h3>
                        <p className="text-blue-600 dark:text-blue-400 text-xs font-medium">
                          {doc.specialty}
                        </p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    {doc.isOnline ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-xs font-medium rounded-full shrink-0">
                        Offline
                      </span>
                    )}
                  </div>

                  {/* Doctor Bio / Summary */}
                  {doc.bio && (
                    <div className="mt-1 mb-3">
                      <p
                        className={cn(
                          "text-xs text-slate-600 dark:text-slate-400 italic leading-relaxed transition-all duration-300",
                          !expandedBios.has(doc.id) && "line-clamp-2"
                        )}
                      >
                        {doc.bio}
                      </p>
                      {doc.bio.length > 80 && (
                        <button
                          onClick={() => toggleBio(doc.id)}
                          className="text-[11px] font-semibold text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-0.5 transition-colors focus:outline-none"
                        >
                          {expandedBios.has(doc.id) ? "less ▲" : "more ▼"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Details & Pricing */}
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl mb-4">
                    <span>{doc.experience}</span>
                    <span className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="h-3 w-3 fill-amber-500" />
                      4.9
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      100 ETB
                    </span>
                  </div>
                </div>

                {/* Dynamic Action Button Based on Presence */}
                {doc.isOnline ? (
                  <Button
                    onClick={() => setVideoModalOpen(true)}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Video className="h-4 w-4"/>
                    Start Instant Video Call
                  </Button>
                ) : (
                  <Button asChild className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-2">
                    <Link to="/booking">
                      <Calendar className="h-4 w-4"/>
                      Book Scheduled Visit
                    </Link>
                  </Button>
                )}
              </div>
            </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
      
      <AvailableDoctorsModal open={videoModalOpen} onOpenChange={setVideoModalOpen} />
    </SiteLayout>
  );
}
