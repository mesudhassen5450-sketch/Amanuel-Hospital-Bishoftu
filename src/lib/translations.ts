export type Lang = "en" | "am" | "or";

export const translations = {
  // ── NAV ──────────────────────────────────────────────────────────────────
  nav: {
    home:        { en: "Home",        am: "መነሻ",       or: "Mana" },
    about:       { en: "About",       am: "ስለ እኛ",     or: "Waa'ee Keenya" },
    services:    { en: "Services",    am: "አገልግሎቶች",   or: "Tajaajilaa" },
    doctors:     { en: "Doctors",     am: "ዶክተሮች",     or: "Doktarota" },
    departments: { en: "Departments", am: "ክፍሎች",      or: "Kutaalee" },
    gallery:     { en: "Gallery",     am: "ምስሎች",      or: "Galeriin" },
    contact:     { en: "Contact",     am: "አድራሻ",      or: "Qunnamtii" },
    aiAssistant: { en: "AI Assistant",am: "AI ረዳት",    or: "AI Gargaaraa" },
    bookAppt:    { en: "Book Appointment", am: "ቀጠሮ ያዙ", or: "Beellama Qabadhu" },
    menu:        { en: "Menu",        am: "ምናሌ",       or: "Sarara" },
  },

  // ── HERO ─────────────────────────────────────────────────────────────────
  hero: {
    badge:      { en: "Portfolio demo — not the official hospital website", am: "የፖርትፎሊዮ ሙከራ — ይህ ኦፊሴላዊ የሆስፒታሉ ድረ-ገጽ አይደለም", or: "Mul'ata portfolio — marsariitii mana yaalaa miti" },
    title1:     { en: "Dr. Amanuel Hospital", am: "ጥራት ያለው ጤና አገልግሎት", or: "Tajaajila Fayyaa Qulqulluu" },
    title2:     { en: "in Bishoftu",          am: "የሚታመን",              or: "Amanamuudha" },
    subtitle:   { en: "Providing compassionate healthcare with experienced professionals, modern medical technology, and patient-centered services.", am: "ልምድ ያላቸው ባለሙያዎች፣ ዘመናዊ የሕክምና ቴክኖሎጂ እና ታካሚን ያማከለ አገልግሎት ያቀርባሉ።", or: "Ogeessota muuxannoo qaban, teknolojii fayyaa ammayyaa fi tajaajila dhukkubsataa xiyyeeffate dhiyeessuu." },
    exploreServices: { en: "Explore Services", am: "አገልግሎቶችን ይመልከቱ", or: "Tajaajilaalee Ilaali" },
  },

  // ── STATS ────────────────────────────────────────────────────────────────
  stats: {
    emergency:  { en: "Emergency Service",    am: "የአደጋ ጊዜ አገልግሎት",   or: "Tajaajila Ariifachiisaa" },
    doctors:    { en: "Experienced Doctors",  am: "ልምድ ያላቸው ዶክተሮች",   or: "Doktarota Muuxannoo Qaban" },
    equipment:  { en: "Modern Equipment",     am: "ዘመናዊ መሣሪያዎች",       or: "Meeshaalee Ammayyaa" },
    patients:   { en: "Patients Served",      am: "የታከሙ ታካሚዎች",        or: "Dhukkubsattootni Tajaajilaman" },
  },

  // ── SECTIONS – HOME ──────────────────────────────────────────────────────
  sections: {
    ourServices:    { en: "Our Services",           am: "አገልግሎቶቻችን",       or: "Tajaajilaalee Keenya" },
    comprehensiveCare: { en: "Comprehensive Care Under One Roof", am: "ሁሉን አቀፍ ጤና አገልግሎት በአንድ ቦታ", or: "Kunuunsa Guutuu Bakka Tokkotti" },
    comprehensiveSub:  { en: "From emergency care to specialized treatment, our departments work together for your health.", am: "ከአደጋ ጊዜ ህክምና እስከ ልዩ ልዩ ሕክምና፣ ክፍሎቻችን ለጤናዎ አብረው ይሰራሉ።", or: "Kunuunsa ariifachiisaa hanga yaalii addaatti, kutaaleen keenya fayyaa keessaniif waliin hojjetu." },
    learnMore:      { en: "Learn more",             am: "የበለጠ ይወቁ",         or: "Dabalata Baradhu" },
    showLess:       { en: "Show less",              am: "ባነሰ ያሳዩ",          or: "Xiqqeessi" },
    ourTeam:        { en: "Our Team",               am: "ቡድናችን",             or: "Gaachana Keenya" },
    meetDoctors:    { en: "Meet Our Experienced Doctors", am: "ልምድ ያላቸውን ዶክተሮቻችንን ይተዋወቁ", or: "Doktaroota Muuxannoo Qaban Keenya Beekaa" },
    meetDoctorsSub: { en: "Dedicated specialists committed to your health and wellbeing.", am: "ለጤናዎ እና ለጤንነቶ ቀናኢ ልዩ ልዩ ባለሙያዎች።", or: "Ogeessotni fayyaa fi fayya-qabeessummaa keessaniif of-kenne." },
    viewAllDoctors: { en: "View all doctors",       am: "ሁሉም ዶክተሮችን ይመልከቱ", or: "Doktaroota Hunda Ilaali" },
    availableToday: { en: "Available Today",        am: "ዛሬ ይገኛሉ",           or: "Har'a Argama" },
    obnEyebrow:     { en: "As Seen on OBN Television", am: "በ OBN ቴሌቪዥን ላይ የታየ", or: "OBN Televishinii Irratti Mul'ate" },
    obnTitle:       { en: "OBN Television Coverage",   am: "OBN ቴሌቪዥን ሽፋን",     or: "Gabaasa OBN Televishinii" },
    obnSub:         { en: "Watch our hospital as featured on OBN Television — bringing quality healthcare to the community.", am: "ሆስፒታላችን በ OBN ቴሌቪዥን ላይ እንደታየ ይመልከቱ — ለማህበረሰቡ ጥራት ያለው ጤና አገልግሎት ያቀርባሉ።", or: "Mana yaalaa keenya OBN Televishinii irratti agarsifame ilaali — tajaajila fayyaa qulqulluu hawaasaaf dhiyeessa." },
    obnCaption:     { en: "Dr. Amanuel Hospital — as featured on OBN Television", am: "ዶ/ር አማኑኤል ሆስፒታል — በ OBN ቴሌቪዥን ላይ እንደታየ", or: "Hospitaala Dr. Amanuel — OBN Televishinii irratti agarsifame" },
    testimonials:   { en: "Testimonials",           am: "የታካሚ ምስክርነቶች",     or: "Ragaalee Dhukkubsattootaa" },
    whatPatientsSay:{ en: "What Our Patients Say",  am: "ታካሚዎቻችን የሚሉት",     or: "Dhukkubsattootni Keenya Maal Jedhu" },
    patientsSub:    { en: "Real stories from the community we serve — patients who experienced our care firsthand.", am: "እናገለግለዋለን ከምንለው ማህበረሰብ ውስጥ እውነተኛ ታሪኮች — ህክምናችንን በቀጥታ የሄዱ ታካሚዎች።", or: "Seenaalee dhugaa hawaasa tajaajillu irraa — dhukkubsattootni kunuunsa keenya ofii isaaniitiin argatan." },
    faqEyebrow:     { en: "FAQ",                    am: "ተደጋጋሚ ጥያቄዎች",      or: "Gaafilee Yeroo Hedduu Gaafataman" },
    faqTitle:       { en: "Frequently Asked Questions", am: "ተደጋጋሚ ጥያቄዎችና መልሶቻቸው", or: "Gaafilee Yeroo Hedduu Gaafataman" },
    faqSub:         { en: "Answers to the questions we hear most often.", am: "በጣም ብዙ ጊዜ ለምንሰማቸው ጥያቄዎች መልሶች።", or: "Deebii gaafilee yeroo hedduu dhageenyu." },
    faqSearch:      { en: "Search questions…",      am: "ጥያቄዎችን ፈልጉ…",      or: "Gaafilee Barbaadi…" },
    faqNoResults:   { en: "No questions match", am: "ምንም ጥያቄ አልተገኘም", or: "Gaafiin hin argamne" },
    faqTry:         { en: "Try a different search.", am: "ሌላ ፍለጋ ሞክሩ።", or: "Barbaada biraa yaalii." },
    ctaTitle:       { en: "Your Health, Our Priority", am: "ጤናዎ፣ ቅድሚያ የምንሰጠው", or: "Fayyaa Keessan, Dursa Keenya" },
    ctaSub:         { en: "Book an appointment today and experience compassionate, modern healthcare in Bishoftu.", am: "ዛሬ ቀጠሮ ይያዙ እና በቢሾፍቱ ሰብዓዊ ዘመናዊ ህክምናን ይሞክሩ።", or: "Har'a beellama qabadhu fi kunuunsa fayyaa ammayyaa Bishooftuu keessatti muuxi." },
    contactUs:      { en: "Contact Us",             am: "አግኙን",               or: "Nu Qunnamaa" },
  },

  // ── ABOUT PAGE ───────────────────────────────────────────────────────────
  about: {
    breadcrumb:  { en: "About",          am: "ስለ እኛ",       or: "Waa'ee Keenya" },
    heroTitle:   { en: "About Dr. Amanuel Hospital", am: "ስለ ዶ/ር አማኑኤል ሆስፒታል", or: "Waa'ee Hospitaala Dr. Amanuel" },
    heroSub:     { en: "A patient-centered general hospital serving Bishoftu and the surrounding communities with compassion and modern medicine.", am: "ቢሾፍቱን እና አካባቢዋን ማህበረሰቦች ሰብዓዊነትና ዘመናዊ ሕክምናን ባዋሃዱ የሚያገለግሉ ታካሚ ማዕከላዊ ሆስፒታል።", or: "Hospitaala waliigalaa Bishooftuu fi hawaasa naannoo isii compassion fi qorannoo ammayyaan tajaajilu." },
    whoWeAre:    { en: "Who We Are",     am: "እኛ ማን ነን",    or: "Eenyu Akka Taane" },
    caring:      { en: "Caring for Bishoftu Since 2011", am: "ቢሾፍቱን ከ2011 ጀምሮ እናክባሙ", or: "Bishooftuu 2011 Irraa Kaasee Kunuunsa" },
    introPara:   { en: "Dr. Amanuel Hospital is a general hospital located in Bishoftu (Debre Zeyit), Ethiopia. Our team of experienced physicians, nurses and support staff work together to deliver quality healthcare that is accessible, affordable and centered on the patient.", am: "ዶ/ር አማኑኤል ሆስፒታል በቢሾፍቱ (ደብረ ዘይት)፣ ኢትዮጵያ የሚገኝ ጠቅላላ ሆስፒታል ነው። ልምድ ያላቸው ሐኪሞቻችን፣ ነርሶቻችን እና ረዳቶቻችን ተደራሽ፣ ተመጣጣኝ ዋጋ ያለው እና ታካሚ ማዕከላዊ ጥራት ያለው ጤና አገልግሎት ለማቅረብ አብረው ይሰራሉ።", or: "Hospitaalli Dr. Amanuel Bishooftuu (Debre Zeyit), Itoophiyaa keessa argama. Gaachanni keenya ogeessota qoricha, narsotaa fi hojjettootaa muuxannoo qaban ni hojjetu tajaajila fayyaa qulqulluu, kan argamuu fi kan dhukkubsataa xiyyeeffate dhiyeessuuf." },
    ourMission:  { en: "Our Mission",   am: "ተልዕኮአችን",     or: "Kallattii Keenya" },
    missionText: { en: "To provide compassionate, high-quality and affordable healthcare to our community using modern medical technology and evidence-based practice.", am: "ዘመናዊ የሕክምና ቴክኖሎጂ እና ማስረጃ ላይ የተመሰረተ ልምምድ ተጠቅሞ ለማህበረሰባችን ሰብዓዊ፣ ጥራት ያለው እና ተመጣጣኝ ዋጋ ያለው ጤና አገልግሎት ማቅረብ።", or: "Teknolojii fayyaa ammayyaa fi hojii ragaa irratti hundaa'uun hawaasa keenya tajaajila fayyaa compassion, qulqulluu fi gatii madaalawaan dhiyeessu." },
    ourVision:   { en: "Our Vision",    am: "ራዕያችን",        or: "Mul'ata Keenya" },
    visionText:  { en: "To be the most trusted healthcare provider in central Ethiopia, recognized for clinical excellence and outstanding patient experience.", am: "ለሕሙማን ልቀት እና ልዩ ተሞክሮ እውቅና ያለው፣ በማዕከላዊ ኢትዮጵያ በጣም የሚታመን የጤና አገልግሎት ሰጪ መሆን።", or: "Olaantummaa clinikaa fi muuxannoo dhukkubsataa olaanaadhaan beekamee, dhiyeessaa tajaajila fayyaa amanamuudha caaluudha." },
    coreValues:  { en: "Core Values",   am: "መሠረታዊ እሴቶች", or: "Gatii Hundee" },
    guidesUs:    { en: "What Guides Us Every Day", am: "በየቀኑ የሚመራን", or: "Guyyaa Guyyaan Nu Qajeelchu" },
    ourJourney:  { en: "Our Journey",   am: "ጉዞአችን",        or: "Imala Keenya" },
    milestones:  { en: "Milestones Along the Way", am: "በጉዞ ላይ ምልክት ነጥቦች", or: "Tarkaanfiiwwan Imala Keessa" },
    achievements:{ en: "Achievements",  am: "ስኬቶቻችን",       or: "Milkaa'inoota Keenya" },
    whyChooseUs: { en: "Why Patients Choose Us", am: "ታካሚዎቹ ለምን እኛን ይመርጣሉ", or: "Maaliif Dhukkubsattootni Nu Filatu" },
    exploreGallery: { en: "Explore our gallery", am: "ምስሎቻችንን ይመልከቱ", or: "Galeriin Keenya Ilaali" },
    values: {
      compassionTitle: { en: "Compassion", am: "ሰብዓዊነት",  or: "Compassion" },
      compassionText:  { en: "We treat every patient with dignity, empathy and respect.", am: "እያንዳንዱን ታካሚ በክብር፣ ርህራሄ እና አክብሮት እናስተናግዳለን።", or: "Dhukkubsataa hundaa kabaja, gaddifachuu fi kabajaan ni yaalina." },
      excellenceTitle: { en: "Excellence",  am: "ምርጥነት",    or: "Ol'aantummaa" },
      excellenceText:  { en: "We hold ourselves to the highest clinical and service standards.", am: "ለከፍተኛ ክሊኒካዊ እና አገልግሎት ደረጃዎች እናቆምናለን።", or: "Sadarkaa clinikaa fi tajaajilaa olaanaa dhaan of-qaba." },
      integrityTitle:  { en: "Integrity",   am: "ሐቀኝነት",    or: "Amantummaa" },
      integrityText:   { en: "We act honestly and transparently in everything we do.", am: "በምናደርገው ሁሉ በሐቀኝነት እና ግልፅነት እናደርጋለን።", or: "Waan hunda keessatti dhugummaan fi iftoominaan ni hojjenna." },
      innovationTitle: { en: "Innovation",  am: "ፈጠራ",       or: "Haaroomsa" },
      innovationText:  { en: "We continually invest in modern equipment and training.", am: "ዘወትር በዘመናዊ መሣሪያዎችና ስልጠና ላይ ኢንቨስት እናደርጋለን።", or: "Meeshaalee ammayyaa fi leenjiitti ni inveestu." },
    },
  },

  // ── SERVICES PAGE ────────────────────────────────────────────────────────
  services: {
    breadcrumb:  { en: "Services",    am: "አገልግሎቶች",   or: "Tajaajilaa" },
    heroTitle:   { en: "Our Medical Services", am: "የህክምና አገልግሎቶቻችን", or: "Tajaajila Fayyaa Keenya" },
    heroSub:     { en: "What patients can receive at Amanuel Hospital — including 24/7 emergency, surgical, and confirmed clinical services.", am: "ታካሚዎች በአማኑኤል ሆስፒታል ሊያገኙ የሚችሉት አገልግሎት — 24/7 የአደጋ ጊዜ፣ የቀዶ ጥገና እና የተረጋገጡ የህክምና አገልግሎቶችን ጨምሮ።", or: "Tajaajila dhukkubsattootni Hospitaala Amanuel irratti argachuu danda'an — tajaajila ariifachiisaa 24/7, qoricha, fi tajaajila yaalaa mirkanaa'e dabalatee." },
    bookAppt:    { en: "Book an Appointment", am: "ቀጠሮ ያዙ", or: "Beellama Qabadhu" },
  },

  // ── DOCTORS PAGE ─────────────────────────────────────────────────────────
  doctors: {
    breadcrumb:  { en: "Doctors",     am: "ዶክተሮች",     or: "Doktarota" },
    heroTitle:   { en: "Meet Our Doctors", am: "ዶክተሮቻችንን ይተዋወቁ", or: "Doktaroota Keenya Beekaa" },
    heroSub:     { en: "Experienced, compassionate specialists dedicated to your health.", am: "ልምድ ያላቸው፣ ሰብዓዊ ልዩ ባለሙያዎች ለጤናዎ ቀናኢ።", or: "Ogeessotni muuxannoo qaban, compassion fi fayyaa keessaniif of-kennan." },
    bookAppt:    { en: "Book Appointment", am: "ቀጠሮ ያዙ", or: "Beellama Qabadhu" },
    available:   { en: "Available Today", am: "ዛሬ ይገኛሉ", or: "Har'a Argama" },
  },

  // ── DEPARTMENTS PAGE ──────────────────────────────────────────────────────
  departments: {
    breadcrumb:  { en: "Departments", am: "ክፍሎች",      or: "Kutaalee" },
    heroTitle:   { en: "Clinical Departments", am: "ክሊኒካዊ ክፍሎች", or: "Kutaalee Clinikaa" },
    heroSub:     { en: "Clinical specialties and departments available at Amanuel Hospital.", am: "በአማኑኤል ሆስፒታል የሚገኙ ክሊኒካዊ ስፔሻሊቲዎች እና ክፍሎች።", or: "Ogeessummaa clinikaa fi kutaalee Hospitaala Amanuel irratti argaman." },
  },

  // ── GALLERY PAGE ─────────────────────────────────────────────────────────
  gallery: {
    breadcrumb:  { en: "Gallery",      am: "ምስሎች",      or: "Galeriin" },
    heroTitle:   { en: "Inside Our Hospital", am: "ሆስፒታላችን ውስጥ", or: "Hospitaala Keenya Keessa" },
    heroSub:     { en: "A glimpse of our facilities, technology and the care we provide every day.", am: "በየቀኑ የምናቀርበው የጤና አገልግሎት፣ ቴክኖሎጂ እና ተቋሙን አጠቃላይ እይታ።", or: "Ijaarsa keenya, teknolojii fi kunuunsa guyyaa guyyaa dhiyeessu hunda ijaan ilaaluu." },
  },

  // ── CONTACT PAGE ─────────────────────────────────────────────────────────
  contact: {
    breadcrumb:   { en: "Contact",      am: "አድራሻ",       or: "Qunnamtii" },
    heroTitle:    { en: "Get in Touch",  am: "ይገናኙን",       or: "Nu Qunnamaa" },
    heroSub:      { en: "Questions, feedback or appointment requests — we'd love to hear from you.", am: "ጥያቄዎች፣ አስተያየቶች ወይም የቀጠሮ ጥያቄዎች — ከእርስዎ መስማት እንፈልጋለን።", or: "Gaafii, yaada ykn gaaffii beellamaa — isin dhagahuu barbaanna." },
    phone:        { en: "Phone",         am: "ስልክ",          or: "Bilbila" },
    email:        { en: "Email",         am: "ኢሜይል",         or: "Imeelii" },
    location:     { en: "Location",      am: "አካባቢ",          or: "Bakka" },
    workingHours: { en: "Working Hours", am: "የሥራ ሰዓቶች",    or: "Sa'aatii Hojii" },
    formName:     { en: "Full name",     am: "ሙሉ ስም",         or: "Maqaa Guutuu" },
    formNamePh:   { en: "Your name",     am: "ስምዎን ያስገቡ",    or: "Maqaa keessan" },
    formEmail:    { en: "Email",         am: "ኢሜይል",          or: "Imeelii" },
    formSubject:  { en: "Subject",       am: "ርዕሰ ጉዳይ",       or: "Mata-Duree" },
    formSubjectPh:{ en: "How can we help?", am: "እንዴት ልንረዳ እንችላለን?", or: "Akkamitti gargaaruu dandeenyaa?" },
    formMessage:  { en: "Message",       am: "መልዕክት",          or: "Ergaa" },
    formMessagePh:{ en: "Write your message…", am: "መልዕክትዎን ይጻፉ…", or: "Ergaa keessan barreessaa…" },
    sendMessage:  { en: "Send Message",  am: "መልዕክት ላክ",      or: "Ergaa Ergi" },
    messageSent:  { en: "Message sent!", am: "መልዕክቱ ተልኳል!",   or: "Ergaan Ergame!" },
    thankYou:     { en: "Thank you for reaching out. Our team will respond within one business day.", am: "ስለተገናኙን አመሰግናለን። ቡድናችን በአንድ የሥራ ቀን ውስጥ ምላሽ ይሰጣል።", or: "Qunnamuuf galatoomi. Gareen keenya guyyaa hojii tokko keessatti deebii kenna." },
    errName:      { en: "Please enter your name.", am: "ስምዎን ያስገቡ።", or: "Maqaa keessan galchaa." },
    errEmail:     { en: "Please enter a valid email address.", am: "ትክክለኛ ኢሜይል አድራሻ ያስገቡ።", or: "Teessoo imeelii sirrii galchaa." },
    errMessage:   { en: "Message should be at least 10 characters.", am: "መልዕክቱ ቢያንስ 10 ቁምፊዎች ሊኖሩት ይገባል።", or: "Ergaan xiqqaate mataduree 10 qabaachuu qaba." },
  },

  // ── APPOINTMENT DIALOG ───────────────────────────────────────────────────
  appt: {
    title:        { en: "Book an Appointment",    am: "ቀጠሮ ይያዙ",           or: "Beellama Qabadhu" },
    description:  { en: "Fill in your details and we'll confirm your appointment by phone.", am: "ዝርዝሮችዎን ይሙሉ እና ቀጠሮዎን በስልክ እናረጋግጣለን።", or: "Odeeffannoo keessan guutaa fi beellama keessan bilbilaan ni mirkaneessina." },
    fullName:     { en: "Full name",              am: "ሙሉ ስም",               or: "Maqaa Guutuu" },
    fullNamePh:   { en: "Your full name",         am: "ሙሉ ስምዎን ያስገቡ",       or: "Maqaa guutuu keessan" },
    phone:        { en: "Phone number",           am: "የስልክ ቁጥር",            or: "Lakkoofsa Bilbilaa" },
    department:   { en: "Department",             am: "ክፍል",                   or: "Kutaa" },
    deptPh:       { en: "Select",                 am: "ይምረጡ",                 or: "Filadhu" },
    preferredDate:{ en: "Preferred date",         am: "የሚፈልጉት ቀን",           or: "Guyyaa Filatame" },
    note:         { en: "Note (optional)",        am: "ማስታወሻ (አማራጭ)",        or: "Yaadannoo (dirqama miti)" },
    notePh:       { en: "Briefly describe your concern", am: "ጉዳዩን በአጭሩ ይግለጹ", or: "Dhimmaa keessan gabaabsaa ibsaa" },
    submit:       { en: "Request Appointment",    am: "ቀጠሮ ይጠይቁ",            or: "Beellama Gaafadhu" },
    received:     { en: "Request received!",      am: "ጥያቄ ተቀብሏል!",          or: "Gaafatni Fudhatame!" },
    receivedDesc: { en: "Our reception team will confirm your appointment by phone shortly.", am: "የቀጠሮ ቡድናችን ቀጠሮዎን ብዙም ሳይቆይ በስልክ ያረጋግጣል።", or: "Gareen simichaa keenya beellama keessan yeroo gabaabaa keessatti bilbilaan ni mirkaneessa." },
    done:         { en: "Done",                   am: "ተጠናቋል",                or: "Xumurameera" },
    errName:      { en: "Please enter your full name.", am: "ሙሉ ስምዎን ያስገቡ።", or: "Maqaa guutuu keessan galchaa." },
    errPhone:     { en: "Please enter a valid phone number.", am: "ትክክለኛ የስልክ ቁጥር ያስገቡ።", or: "Lakkoofsa bilbilaa sirrii galchaa." },
    errDept:      { en: "Please select a department.", am: "ክፍል ይምረጡ።",      or: "Kutaa filadhu." },
    errDate:      { en: "Please choose a preferred date.", am: "ቀን ይምረጡ።",   or: "Guyyaa barbaaddu filadhu." },
  },

  // ── FOOTER ───────────────────────────────────────────────────────────────
  footer: {
    tagline:      { en: "Compassionate healthcare with experienced professionals and modern medical technology in Bishoftu, Ethiopia.", am: "ልምድ ያላቸው ባለሙያዎችና ዘመናዊ የሕክምና ቴክኖሎጂ ባዋሃዱ ሰብዓዊ ጤና አገልግሎት በቢሾፍቱ፣ ኢትዮጵያ።", or: "Kunuunsa fayyaa compassion, ogeessota muuxannoo qaban fi teknolojii fayyaa ammayyaa waliin Bishooftuu, Itoophiyaa keessatti." },
    quickLinks:   { en: "Quick Links",   am: "ፈጣን አገናኞች",  or: "Hidhata Ariifataa" },
    aboutUs:      { en: "About Us",      am: "ስለ እኛ",        or: "Waa'ee Keenya" },
    ourDoctors:   { en: "Our Doctors",   am: "ዶክተሮቻችን",      or: "Doktaroota Keenya" },
    servicesLabel:{ en: "Services",      am: "አገልግሎቶች",      or: "Tajaajilaa" },
    emergency:    { en: "Emergency & Newsletter", am: "አደጋ & ዜና ደብዳቤ", or: "Ariifachiisaa & Oduu" },
    emergencyHotline: { en: "24/7 Emergency hotline", am: "24/7 አደጋ ስልክ", or: "Sarara Bilbilaa Ariifachiisaa 24/7" },
    emailPh:      { en: "Your email",    am: "ኢሜይልዎ",         or: "Imeelii keessan" },
    join:         { en: "Join",          am: "ተቀላቀሉ",          or: "Makamaa" },
    subscribed:   { en: "Thanks for subscribing!", am: "ስለተቀላቀሉ አመሰግናለን!", or: "Galmaa'uuf galatoomi!" },
    copyright:    { en: "Dr. Amanuel Hospital — Bishoftu, Ethiopia.", am: "ዶ/ር አማኑኤል ሆስፒታል — ቢሾፍቱ፣ ኢትዮጵያ።", or: "Hospitaala Dr. Amanuel — Bishooftuu, Itoophiyaa." },
  },

  // ── PAGE HERO – breadcrumb "Home" ────────────────────────────────────────
  common: {
    home:         { en: "Home",    am: "መነሻ",   or: "Mana" },
    videoNoSupport: { en: "Your browser does not support the video tag.", am: "አሳሹ ቪዲዮ አይደግፍም።", or: "Browserri keessan viidiyoo hin deeggartu." },
  },

} as const;

/** Picks the right string for the active language */
export function t(entry: { en: string; am: string; or: string } | undefined, lang: Lang): string {
  if (!entry) return "";
  return entry[lang] ?? entry.en ?? "";
}

// Re-export translated FAQs, testimonials, and stats labels for use in index.tsx
export const translatedFaqs = {
  en: [
    { question: "What are the hospital's working hours?",          answer: "Our outpatient departments operate Monday to Saturday from 8:00 AM to 8:00 PM. The emergency department is open 24 hours a day, 7 days a week." },
    { question: "Do I need an appointment to see a doctor?",       answer: "Walk-ins are welcome for general consultations, but we recommend booking an appointment to reduce your waiting time, especially for specialist visits." },
    { question: "Does the hospital accept health insurance?",      answer: "We work with several insurance providers and employer health schemes. Please contact our reception with your insurance details to confirm coverage." },
    { question: "Is there a 24/7 emergency service?",             answer: "Yes. Our emergency department is staffed around the clock with emergency physicians, nurses and ambulance coordination." },
    { question: "Can I get laboratory tests without a referral?",  answer: "Selected routine tests are available on request. For specialized tests we recommend a consultation first so results can be properly interpreted." },
    { question: "How do I get my medical records or test results?",answer: "Test results can be collected at the laboratory reception or sent to your doctor directly. Medical record requests are handled by our administration office." },
  ],
  am: [
    { question: "የሆስፒታሉ የሥራ ሰዓቶች ምን ዓይነት ናቸው?",        answer: "የሕክምና ክፍሎቻችን ከሰኞ እስከ ቅዳሜ ከ8:00 ጠዋት እስከ 8:00 ማታ ይሰራሉ። የአደጋ ክፍሉ በቀን 24 ሰዓት፣ በሳምንት 7 ቀን ክፍት ነው።" },
    { question: "ዶክተር ለማየት ቀጠሮ ያስፈልጋል?",               answer: "ለጠቅላላ ምርመራ ያለቀጠሮ ሊመጡ ይችላሉ፣ ነገር ግን ቀጠሮ ቢያዙ የጥበቃ ጊዜዎን ይቀንሳሉ፤ በተለይ ልዩ ሐኪሞችን ለማየት።" },
    { question: "ሆስፒታሉ የጤና ኢንሹራንስ ይቀበላል?",            answer: "ከተለያዩ የኢንሹራንስ አቅራቢዎችና የሰራተኛ ጤና ዕቅዶች ጋር እንሰራለን። ሽፋንዎን ለማረጋገጥ ካርዱን ይዘው ወደ ሪሴፕሽን ያቅርቡ።" },
    { question: "24/7 የአደጋ አገልግሎት አለ?",                 answer: "አዎ። የአደጋ ክፍሉ ሁልጊዜ የሕክምና ባለሙያዎች፣ ነርሶችና አምቡላንስ አስተባባሪዎች አሉ።" },
    { question: "ያለ ሐኪም ሪፈራ ቤተ ሙከራ ምርመራ ማደርግ ይቻላል?", answer: "የተወሰኑ ተራ ምርመራዎች ያለ ሪፈራ ይደረጋሉ። ለልዩ ምርመራዎች ቅድሚያ ምክክር ይደረጋል።" },
    { question: "የሕክምና ሪከርዴዬን ወይም ውጤቶቼን እንዴት አገኛለሁ?", answer: "ምርመራ ውጤቶች ከቤተ ሙከራ ሪሴፕሽን ሊወሰዱ ወይም ቀጥታ ለሐኪምዎ ሊላኩ ይችላሉ። የሕክምና ሪከርዴ ጥያቄዎች በአስተዳደር ቢሮ ይስተናገዳሉ።" },
  ],
  or: [
    { question: "Sa'aatiin hojii hospitaalaa maal fa'i?",            answer: "Kutaaleen keenya Wiixata hanga Sanbata sa'aatii 8:00 ganama hanga 8:00 halkan ni hojjetu. Kutaan ariifachiisaa guyyaa 24, torbee 7 cufaa hin jiru." },
    { question: "Dookitara argachuuf beellama qabaachu qaba?",       answer: "Miseensota beellama malee gara mana yaalaa dhufuun ni danda'ama, garuu beellama qabaachuun yeroo eeggannaa ni hir'isa, addatti ogeessota argachuuf." },
    { question: "Hospitaalichi inshuraansii fayyaa fudhata?",        answer: "Dhiyeessitota inshuraansii fi karoora fayyaa hojjettootaa hedduun ni hojjenna. Karoodha keessan fuudhaa gara simichaa dhufaa mirkaneessaa." },
    { question: "Tajaajilli ariifachiisaa 24/7 jiraa?",              answer: "Eeyyee. Kutaan ariifachiisaa ogeessota qoricha, narsota fi koordineetara ambulaansii waliin yeroo hunda cufaa hin jiru." },
    { question: "Maree xiinxala malee qorannoo laboratooriif dhufuu ni danda'amaa?", answer: "Qorannoo herreega baay'ee gaafannaan ni argama. Qorannoo addaaf duursanii mari'achuun ni gorfama." },
    { question: "Galmee fayyaa koo ykn bu'aa qorannoo akkamiin argadha?", answer: "Bu'aan qorannoo simichaa laboratoorii irraa fudhatamuu ykn gara doktara keessanitti ergamuu danda'a. Gaaffii galmee dhukkumsaa waajjira bulchiinsaan ni furamti." },
  ],
};

export const translatedTestimonials = {
  en: [
    { name: "Tigist A.",    role: "Maternity patient",          quote: "The maternity team made my delivery safe and comfortable. The midwives were with me every step of the way — I felt truly cared for." },
    { name: "Getachew M.", role: "Surgery patient",             quote: "From admission to discharge, everything was professional and clean. My operation went smoothly and the follow-up care was excellent." },
    { name: "Hiwot K.",    role: "Parent of pediatric patient", quote: "My daughter was treated so gently in the pediatric ward. The doctors explained everything clearly and she recovered quickly." },
    { name: "Bekele T.",   role: "Emergency patient",           quote: "I arrived at midnight with severe pain and was seen within minutes. The 24/7 emergency service truly saved my life." },
  ],
  am: [
    { name: "ትጊስት አ.",   role: "የወሊድ ታካሚ",        quote: "የወሊድ ቡድኑ ምጤን ደህና እና ምቹ አድርጓል። አዋላጆቹ ከጀምሮ እስከ መጨረሻ ድረስ ከጎኔ ነበሩ — እውነቱን ሲጠነቀቁ ተሰምቶኛል።" },
    { name: "ጌታቸው ም.",  role: "የቀዶ ጥገና ታካሚ",      quote: "ከመግቢያ እስከ መውጫ ሁሉ ሙያዊና ንጹህ ነበር። ቀዶ ጥገናዬ ያለ ችግር ሄደ፣ ድኅረ ህክምና እንክብካቤም እጅጉን ጥሩ ነበር።" },
    { name: "ህዋት ክ.",   role: "የህፃናት ታካሚ ወላጅ",   quote: "ሴት ልጄ በህፃናት ክፍሉ በጣም ጥንቃቄ ታከሟት። ዶክተሮቹ ሁሉን ነገር ግልጽ አድርገው አስረዱ፤ እርሷም ፈጥና ዳነች።" },
    { name: "በቀለ ተ.",   role: "የአደጋ ጊዜ ታካሚ",     quote: "እኩለ ሌሊት ከፍተኛ ህመም ይዞኝ ሄድኩ፤ ባጭር ደቂቃዎች ውስጥ ታየኝ። 24/7 አደጋ አገልግሎቱ ህይወቴን አዳናል።" },
  ],
  or: [
    { name: "Tigist A.",    role: "Dhukkubsattuu da'umsaa",     quote: "Gareen da'umsaa da'uumsa koo nagaa fi miiraan guute. Hoosistuun hamma dhumatti biraa turte — dhugumaan kunuunfamuu nan dhaga'e." },
    { name: "Getachew M.", role: "Dhukkubsataa qoricha",        quote: "Seenuu hanga bahuutti hundi ogummaa fi qulqulluu ture. Qoricha kootti ni milkaa'e, kunuunsi booda kennames baay'ee gaari ture." },
    { name: "Hiwot K.",    role: "Maatii dhukkubsataa daa'imaa", quote: "Intala koo kutaa daa'immanii keessatti baayyee jajjabinaan yaalani. Doktarootni hunda ifatti ibsan, ishiinis dafee fayyite." },
    { name: "Bekele T.",   role: "Dhukkubsataa ariifachiisaa",  quote: "Halkan walakkaa dhukkuba hamaadhaan dhufe, daqiiqoota muraasa keessatti argame. Tajaajilli ariifachiisaa 24/7 lubbu koo baraare." },
  ],
};

export const translatedStats = {
  en: [
    { label: "Emergency Service",    value: 24, suffix: "/7" },
    { label: "Experienced Doctors",  value: 35, suffix: "+" },
    { label: "Modern Equipment Units", value: 120, suffix: "+" },
    { label: "Patients Served",      value: 85000, suffix: "+" },
  ],
  am: [
    { label: "የአደጋ አገልግሎት",      value: 24, suffix: "/7" },
    { label: "ልምድ ያላቸው ዶክተሮች",  value: 35, suffix: "+" },
    { label: "ዘመናዊ መሣሪያዎች",      value: 120, suffix: "+" },
    { label: "የታከሙ ታካሚዎች",       value: 85000, suffix: "+" },
  ],
  or: [
    { label: "Tajaajila Ariifachiisaa", value: 24, suffix: "/7" },
    { label: "Doktarota Muuxannoo",     value: 35, suffix: "+" },
    { label: "Meeshaalee Ammayyaa",     value: 120, suffix: "+" },
    { label: "Dhukkubsattootni Yaalaman", value: 85000, suffix: "+" },
  ],
};

export const translatedDepartments = {
  en: [
    { name: "Internal Medicine",       description: "Clinical specialty in internal medicine." },
    { name: "General Surgery",         description: "Clinical specialty in general surgery." },
    { name: "Orthopedic Surgery",      description: "Clinical specialty in orthopedic surgery." },
    { name: "Obstetrics & Gynecology", description: "Clinical specialty in obstetrics and gynecology." },
    { name: "ENT",                     description: "Ear, nose, and throat specialty." },
    { name: "Ophthalmology",           description: "Eye care and ophthalmology specialty." },
    { name: "Neurosurgery",            description: "Clinical specialty in neurosurgery." },
    { name: "Pediatric Surgery",       description: "Clinical specialty in pediatric surgery." },
    { name: "Dermatology",             description: "Clinical specialty in dermatology." },
    { name: "Psychiatry",              description: "Clinical specialty in psychiatry." },
  ],
  am: [
    { name: "የውስጥ ሕክምና",                    description: "የውስጥ ሕክምና ክሊኒካዊ ስፔሻሊቲ።" },
    { name: "አጠቃላይ ቀዶ ጥገና",                 description: "የአጠቃላይ ቀዶ ጥገና ክሊኒካዊ ስፔሻሊቲ።" },
    { name: "የአጥንት ቀዶ ጥገና",                  description: "የአጥንት ቀዶ ጥገና ክሊኒካዊ ስፔሻሊቲ።" },
    { name: "የወሊድና የሴቶች ሕክምና",               description: "የወሊድና የሴቶች ሕክምና ክሊኒካዊ ስፔሻሊቲ።" },
    { name: "የጆሮ፣ አፍንጫ እና ጉሮሮ (ENT)",         description: "የጆሮ፣ አፍንጫ እና ጉሮሮ ስፔሻሊቲ።" },
    { name: "የዐይን ሕክምና",                      description: "የዐይን እንክብካቤ እና የዐይን ሕክምና ስፔሻሊቲ።" },
    { name: "የነርቭ ቀዶ ጥገና",                    description: "የነርቭ ቀዶ ጥገና ክሊኒካዊ ስፔሻሊቲ።" },
    { name: "የህፃናት ቀዶ ጥገና",                   description: "የህፃናት ቀዶ ጥገና ክሊኒካዊ ስፔሻሊቲ።" },
    { name: "የቆዳ ሕክምና",                       description: "የቆዳ ሕክምና ክሊኒካዊ ስፔሻሊቲ።" },
    { name: "ሳይካትሪ",                           description: "የሳይካትሪ ክሊኒካዊ ስፔሻሊቲ።" },
  ],
  or: [
    { name: "Qoricha Keessaa",                 description: "Ogeessummaa clinikaa qoricha keessaa." },
    { name: "Qoricha Waliigalaa",              description: "Ogeessummaa clinikaa qoricha waliigalaa." },
    { name: "Qoricha Lafee",                   description: "Ogeessummaa clinikaa qoricha lafee." },
    { name: "Da'umsa fi Fayyaa Dubartii",      description: "Ogeessummaa clinikaa da'umsaa fi fayyaa dubartii." },
    { name: "ENT",                             description: "Ogeessummaa gurra, funyaanii fi laaguu." },
    { name: "Qoricha Ija",                     description: "Kunuunsa ija fi ogeessummaa qoricha ija." },
    { name: "Qoricha Sammuu",                  description: "Ogeessummaa clinikaa qoricha sammuu." },
    { name: "Qoricha Daa'immanii",             description: "Ogeessummaa clinikaa qoricha daa'immanii." },
    { name: "Qoricha Goggogaa",                description: "Ogeessummaa clinikaa qoricha goggogaa." },
    { name: "Saayikaayitirii",                 description: "Ogeessummaa clinikaa saayikaayitirii." },
  ],
};

export const translatedServices = {
  en: [
    { id: "emergency-services",        title: "Emergency Services",              description: "24/7 emergency services are available at the hospital.", detail: "Amanuel Hospital provides emergency services 24 hours a day, 7 days a week." },
    { id: "medical-services",          title: "Medical Services",                description: "General medical care provided by the hospital.", detail: "The hospital provides general medical care for patients who need medical services." },
    { id: "surgical-services",         title: "Surgical Services",               description: "24-hour surgical services are available at the hospital.", detail: "Amanuel Hospital provides surgical services around the clock, 24 hours a day." },
    { id: "pediatric-services",        title: "Pediatric Services",              description: "Medical care for children.", detail: "The hospital provides medical care for children." },
    { id: "gynecology-obstetrics",     title: "Gynecology & Obstetrics",         description: "Women's health, obstetric, and gynecological care.", detail: "The hospital provides women's health care, including obstetric and gynecological services." },
    { id: "ent-services",              title: "ENT Services",                    description: "ENT services through specialists, including tonsillectomy and other ENT services.", detail: "The hospital provides ear, nose, and throat (ENT) services through specialists. This includes tonsillectomy and other ENT services." },
    { id: "emergency-surgery-delivery", title: "Emergency Surgeries & Deliveries", description: "All emergency surgeries and deliveries are available 24/7.", detail: "Emergency surgeries and emergency deliveries are available 24 hours a day, 7 days a week." },
    { id: "orthopedic-services",       title: "Orthopedic Surgical Services",    description: "Orthopedic surgical services are available 24/7.", detail: "The hospital provides orthopedic surgical services 24 hours a day, 7 days a week." },
  ],
  am: [
    { id: "emergency-services",        title: "የአደጋ ጊዜ አገልግሎት",                 description: "የ24/7 የአደጋ ጊዜ አገልግሎት በሆስፒታሉ ይገኛል።", detail: "አማኑኤል ሆስፒታል የአደጋ ጊዜ አገልግሎት በቀን 24 ሰዓት፣ በሳምንት 7 ቀን ያቀርባል።" },
    { id: "medical-services",          title: "የህክምና አገልግሎቶች",                  description: "ሆስፒታሉ የሚያቀርበው አጠቃላይ የህክምና እንክብካቤ።", detail: "ሆስፒታሉ ለታካሚዎች አጠቃላይ የህክምና እንክብካቤ ያቀርባል።" },
    { id: "surgical-services",         title: "የቀዶ ጥገና አገልግሎቶች",               description: "የ24 ሰዓት የቀዶ ጥገና አገልግሎት በሆስፒታሉ ይገኛል።", detail: "አማኑኤል ሆስፒታል የቀዶ ጥገና አገልግሎት በቀን 24 ሰዓት ያቀርባል።" },
    { id: "pediatric-services",        title: "የህፃናት አገልግሎት",                   description: "ለህፃናት የሚደረግ የህክምና እንክብካቤ።", detail: "ሆስፒታሉ ለህፃናት የህክምና እንክብካቤ ያቀርባል።" },
    { id: "gynecology-obstetrics",     title: "የሴቶች ጤናና ወሊድ",                  description: "የሴቶች ጤና፣ የወሊድ እና የማህፀን ሕክምና።", detail: "ሆስፒታሉ የሴቶች ጤና እንክብካቤ ያቀርባል፤ የወሊድ እና የማህፀን ሕክምናን ጨምሮ።" },
    { id: "ent-services",              title: "የጆሮ፣ አፍንጫ እና ጉሮሮ አገልግሎት",      description: "በስፔሻሊስቶች የሚሰጥ የENT አገልግሎት፤ ቶንሲሌክቶሚ እና ሌሎች የENT አገልግሎቶችን ጨምሮ።", detail: "ሆስፒታሉ በስፔሻሊስቶች በኩል የጆሮ፣ አፍንጫ እና ጉሮሮ (ENT) አገልግሎት ያቀርባል። ይህ ቶንሲሌክቶሚ እና ሌሎች የENT አገልግሎቶችን ያካትታል።" },
    { id: "emergency-surgery-delivery", title: "የአደጋ ጊዜ ቀዶ ጥገናና ወሊድ",          description: "ሁሉም የአደጋ ጊዜ ቀዶ ጥገናዎች እና ወሊዶች በ24/7 ይገኛሉ።", detail: "የአደጋ ጊዜ ቀዶ ጥገናዎች እና የአደጋ ጊዜ ወሊዶች በቀን 24 ሰዓት፣ በሳምንት 7 ቀን ይገኛሉ።" },
    { id: "orthopedic-services",       title: "የአጥንት ቀዶ ጥገና አገልግሎቶች",         description: "የአጥንት ቀዶ ጥገና አገልግሎቶች በ24/7 ይገኛሉ።", detail: "ሆስፒታሉ የአጥንት ቀዶ ጥገና አገልግሎት በቀን 24 ሰዓት፣ በሳምንት 7 ቀን ያቀርባል።" },
  ],
  or: [
    { id: "emergency-services",        title: "Tajaajila Ariifachiisaa",          description: "Tajaajilli ariifachiisaa 24/7 hospitaala irratti ni argama.", detail: "Hospitaalli Amanuel tajaajila ariifachiisaa sa'aatii 24 guyyaatti, torbee keessatti guyyaa 7 dhiyeessa." },
    { id: "medical-services",          title: "Tajaajila Yaalii",                 description: "Kunuunsa yaalaa waliigalaa hospitaalichi dhiyeessu.", detail: "Hospitaalichi dhukkubsattootaaf kunuunsa yaalaa waliigalaa dhiyeessa." },
    { id: "surgical-services",         title: "Tajaajila Qoricha",                description: "Tajaajilli qoricha sa'aatii 24 hospitaala irratti ni argama.", detail: "Hospitaalli Amanuel tajaajila qoricha sa'aatii 24 guyyaatti dhiyeessa." },
    { id: "pediatric-services",        title: "Tajaajila Daa'immanii",            description: "Kunuunsa yaalaa daa'immaniif kennamu.", detail: "Hospitaalichi daa'immaniif kunuunsa yaalaa dhiyeessa." },
    { id: "gynecology-obstetrics",     title: "Fayyaa Dubartii fi Da'uumsa",      description: "Kunuunsa fayyaa dubartii, da'umsaa fi yaalii dubartootaa.", detail: "Hospitaalichi kunuunsa fayyaa dubartii dhiyeessa, tajaajila da'umsaa fi yaalii dubartootaa dabalatee." },
    { id: "ent-services",              title: "Tajaajila Gurra, Funyaanii fi Laaguu", description: "Tajaajila ENT ogeessota addaa irraa, tonsillectomy fi tajaajila ENT biroo dabalatee.", detail: "Hospitaalichi tajaajila gurra, funyaanii fi laaguu (ENT) ogeessota addaa irraa dhiyeessa. Kun tonsillectomy fi tajaajila ENT biroo of keessaa qaba." },
    { id: "emergency-surgery-delivery", title: "Qoricha fi Da'uumsa Ariifachiisaa", description: "Qorichoonni ariifachiisaa fi da'uumsi ariifachiisaa hundi 24/7 ni argamu.", detail: "Qorichoonni ariifachiisaa fi da'uumsi ariifachiisaa sa'aatii 24 guyyaatti, torbee keessatti guyyaa 7 ni argamu." },
    { id: "orthopedic-services",       title: "Tajaajila Qoricha Lafee",          description: "Tajaajilli qoricha lafee 24/7 ni argama.", detail: "Hospitaalichi tajaajila qoricha lafee sa'aatii 24 guyyaatti, torbee keessatti guyyaa 7 dhiyeessa." },
  ],
};

export const translatedDoctors = {
  en: [
    { specialty: "General Surgeon · Medical Director", experience: "18+ years experience" },
    { specialty: "Pediatrician",                       experience: "10+ years experience" },
    { specialty: "Internal Medicine Specialist",       experience: "22+ years experience" },
    { specialty: "Obstetrician & Gynecologist",        experience: "14+ years experience" },
    { specialty: "Radiologist",                        experience: "9+ years experience"  },
    { specialty: "Emergency Medicine Physician",       experience: "8+ years experience"  },
  ],
  am: [
    { specialty: "አጠቃላይ ቀዶ ሐኪም · የህክምና ዳይሬክተር", experience: "18+ ዓመት ልምድ" },
    { specialty: "የሕፃናት ሐኪም",                      experience: "10+ ዓመት ልምድ" },
    { specialty: "የውስጥ ሕክምና ስፔሻሊስት",              experience: "22+ ዓመት ልምድ" },
    { specialty: "የወሊድ ሐኪምና የሴቶች ሕክምና ባለሙያ",    experience: "14+ ዓመት ልምድ" },
    { specialty: "ራዲዮሎጂስት",                        experience: "9+ ዓመት ልምድ"  },
    { specialty: "አደጋ ጊዜ ሕክምና ሐኪም",               experience: "8+ ዓመት ልምድ"  },
  ],
  or: [
    { specialty: "Ogeessa Qoricha Mukkeen · Daarektara Fayyaa", experience: "Muuxannoo 18+ waggaa" },
    { specialty: "Ogeessa Daa'immanii",                          experience: "Muuxannoo 10+ waggaa" },
    { specialty: "Ogeessa Qoricha Keessaa",                      experience: "Muuxannoo 22+ waggaa" },
    { specialty: "Ogeessa Ulfaa fi Fayyaa Dubartii",             experience: "Muuxannoo 14+ waggaa" },
    { specialty: "Radiyolojistii",                               experience: "Muuxannoo 9+ waggaa"  },
    { specialty: "Ogeessa Qoricha Ariifachiisaa",                experience: "Muuxannoo 8+ waggaa"  },
  ],
};
