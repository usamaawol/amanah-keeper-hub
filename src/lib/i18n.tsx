import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "ar" | "om";

type Dict = Record<string, { en: string; ar: string; om?: string }>;

export const translations: Dict = {
  appName: { en: "Amanah Library", ar: "مكتبة الأمانة", om: "Mana Kitaabaa Amanah" },
  appTagline: {
    en: "Trust-based Islamic library management",
    ar: "نظام إدارة المكتبات الإسلامية القائم على الأمانة",
    om: "Bulchiinsa Mana Kitaabaa Islaamaa kan amanamummaa irratti hundaa'e",
  },
  // nav
  home: { en: "Home", ar: "الرئيسية", om: "Mana" },
  about: { en: "About", ar: "حول", om: "Waa'ee" },
  contact: { en: "Contact", ar: "تواصل", om: "Quunnamtii" },
  signIn: { en: "Sign In", ar: "تسجيل الدخول", om: "Seeni" },
  signOut: { en: "Sign Out", ar: "تسجيل الخروج", om: "Ba'i" },
  dashboard: { en: "Dashboard", ar: "لوحة التحكم", om: "Gabatee Bulchiinsaa" },
  borrowRecords: { en: "Borrow Records", ar: "سجلات الإعارة", om: "Galmee Ergisaa" },
  addBorrow: { en: "Add Borrow Record", ar: "إضافة إعارة", om: "Galmee Ergisaa Dabaluu" },
  reservations: { en: "Reservations", ar: "الحجوزات", om: "Qabannoo" },
  readers: { en: "Reader Profiles", ar: "ملفات القراء", om: "Profaayilii Dubbiftootaa" },
  notifications: { en: "Notifications", ar: "الإشعارات", om: "Beeksisa" },
  aiAssistant: { en: "AI Assistant", ar: "المساعد الذكي", om: "Gargaaraa AI" },
  history: { en: "History", ar: "السجل", om: "Seenaa" },
  settings: { en: "Settings", ar: "الإعدادات", om: "Qindaa'ina" },
  // home
  heroTitle: { en: "Manage your Islamic library with trust", ar: "أدر مكتبتك الإسلامية بأمانة" },
  heroSubtitle: {
    en: "Track borrowed books, reservations and readers — even offline. AI-powered insights for your library.",
    ar: "تتبع الكتب المعارة والحجوزات والقراء — حتى دون اتصال. رؤى مدعومة بالذكاء الاصطناعي لمكتبتك.",
  },
  getStarted: { en: "Get Started", ar: "ابدأ الآن" },
  learnMore: { en: "Learn More", ar: "اعرف المزيد" },
  featuresTitle: { en: "Everything your library needs", ar: "كل ما تحتاجه مكتبتك" },
  featOffline: { en: "Works Offline", ar: "يعمل دون اتصال" },
  featOfflineDesc: { en: "Full access to your records without internet after login.", ar: "وصول كامل لسجلاتك دون إنترنت بعد تسجيل الدخول." },
  featAi: { en: "AI Assistant", ar: "مساعد ذكي" },
  featAiDesc: { en: "Ask questions about your library in Arabic or English.", ar: "اطرح أسئلة عن مكتبتك بالعربية أو الإنجليزية." },
  featQueue: { en: "Reservation Queues", ar: "قوائم الحجز" },
  featQueueDesc: { en: "Manage waiting lists and notify the next reader.", ar: "أدر قوائم الانتظار وأبلغ القارئ التالي." },
  featHistory: { en: "Permanent History", ar: "سجل دائم" },
  featHistoryDesc: { en: "Every borrow and return is stored forever.", ar: "كل إعارة وإرجاع يُحفظ للأبد." },
  // about
  aboutTitle: { en: "About Amanah Library System", ar: "حول نظام مكتبة الأمانة" },
  aboutBody: {
    en: "Amanah is a personal, offline-first library management system built for Islamic libraries. Every user gets their own private workspace — your borrowings, readers, reservations, history and notifications are visible only to you. Sign in with Google and start managing your library instantly.",
    ar: "الأمانة نظام شخصي لإدارة المكتبات يعمل دون اتصال أولاً، مصمم للمكتبات الإسلامية. لكل مستخدم مساحة عمل خاصة به — إعاراتك وقراؤك وحجوزاتك وسجلك وإشعاراتك مرئية لك وحدك. سجّل الدخول عبر Google وابدأ إدارة مكتبتك فوراً.",
  },
  // contact
  contactTitle: { en: "Contact & Support", ar: "التواصل والدعم" },
  contactMessage: {
    en: "If you would like support, have questions, or need help using the system, please contact the developer on Telegram:",
    ar: "إذا كنت ترغب في الدعم، أو لديك أسئلة، أو تحتاج مساعدة في استخدام النظام، يرجى التواصل مع المطوّر عبر تيليجرام:",
  },
  contactMessage2: {
    en: "We will respond as soon as possible.",
    ar: "سنرد عليك في أقرب وقت ممكن.",
  },
  openTelegram: { en: "Message on Telegram", ar: "راسلنا على تيليجرام" },
  // auth
  signInGoogle: { en: "Continue with Google", ar: "المتابعة باستخدام Google" },
  signInDesc: { en: "Sign in or sign up with Google to access your private library workspace.", ar: "سجّل الدخول أو أنشئ حساباً عبر Google للوصول إلى مساحة مكتبتك الخاصة." },
  signUpHint: { en: "New here? Signing in with Google also creates your account instantly — no approval needed.", ar: "جديد هنا؟ تسجيل الدخول عبر Google ينشئ حسابك فوراً — دون الحاجة لموافقة." },
  signInTab: { en: "Sign In", ar: "تسجيل الدخول" },
  signUpTab: { en: "Sign Up", ar: "إنشاء حساب" },
  createAccount: { en: "Create Account", ar: "إنشاء حساب" },
  email: { en: "Email", ar: "البريد الإلكتروني" },
  password: { en: "Password", ar: "كلمة المرور" },
  libraryNamePlaceholder: { en: "e.g. Al-Furqan Library", ar: "مثال: مكتبة الفرقان" },
  signUpDesc: { en: "Create your account with email and your library name.", ar: "أنشئ حسابك بالبريد الإلكتروني واسم مكتبتك." },
  signInEmailDesc: { en: "Sign in to access your private library workspace.", ar: "سجّل الدخول للوصول إلى مساحة مكتبتك الخاصة." },
  orContinueWith: { en: "or", ar: "أو" },
  fillAllFields: { en: "Please fill in all fields.", ar: "يرجى ملء جميع الحقول." },
  passwordTooShort: { en: "Password must be at least 6 characters.", ar: "يجب أن تكون كلمة المرور 6 أحرف على الأقل." },
  invalidEmail: { en: "Please enter a valid email address.", ar: "يرجى إدخال بريد إلكتروني صحيح." },
  // dashboard cards
  activeBorrowings: { en: "Active Borrowings", ar: "الإعارات النشطة", om: "Ergisaa Hojii irra jiru" },
  returnedBooks: { en: "Returned Books", ar: "الكتب المُعادة", om: "Kitaabilee Deebi'an" },
  overdueBooks: { en: "Overdue Books", ar: "الكتب المتأخرة", om: "Kitaabilee Yeroon Darbeef" },
  todaysActivity: { en: "Today's Activity", ar: "نشاط اليوم", om: "Hojii Har'aa" },
  totalReaders: { en: "Total Readers", ar: "إجمالي القراء", om: "Dubbiftootaa Walii" },
  recentActivity: { en: "Recent Activity", ar: "النشاط الأخير", om: "Hojii Dhiheenya" },
  quickSearch: { en: "Quick search…", ar: "بحث سريع…", om: "Barbaadii saffisaa…" },
  askAi: { en: "Ask AI", ar: "اسأل الذكاء", om: "AI gaafadhu" },
  author: { en: "Author", ar: "المؤلف" },
  phoneNumber: { en: "Phone Number", ar: "رقم الهاتف", om: "Lakkoofsa Bilbilaa" },
  remarks: { en: "Remarks", ar: "ملاحظات إضافية" },
  // contact admin
  contactAdmin: { en: "Contact Admin", ar: "تواصل مع المشرف", om: "Bulchaa Quunnami" },
  messagePlaceholder: { en: "Write your message to the administrator...", ar: "اكتب رسالتك إلى المشرف...", om: "Ergaa kee bulchaaf barreessi..." },
  sendMessage: { en: "Send Message", ar: "إرسال الرسالة", om: "Ergaa Ergi" },
  messageSent: { en: "Your message has been sent to the super admin.", ar: "تم إرسال رسالتك إلى المشرف العام.", om: "Ergaan kee bulchaa ol'aanaaf ergameera." },
  messageError: { en: "Failed to send message. Please try again.", ar: "فشل إرسال الرسالة. يرجى المحاولة مرة أخرى.", om: "Ergaa erguun hin danda'amne. Maaloo irra deebi'ii yaali." },
  bookNameArabic: { en: "Book Name (Arabic)", ar: "اسم الكتاب (عربي)" },
  bookNameEnglish: { en: "Book Name (English)", ar: "اسم الكتاب (إنجليزي)" },
  sharhName: { en: "Sharh Name (Optional)", ar: "اسم الشرح (اختياري)" },
  juzNumber: { en: "Juz Number(s)", ar: "رقم/أرقام الجزء" },
  juzHint: { en: "e.g. 1, 2, 3 — write one or several", ar: "مثال: ١، ٢، ٣ — اكتب جزءًا أو عدة أجزاء" },
  bookType: { en: "Book Type", ar: "نوع الكتاب" },
  singleBook: { en: "Single Book", ar: "كتاب مفرد" },
  multiJuz: { en: "Multi-Juz / Sharh", ar: "متعدد الأجزاء / شرح" },
  singleBookHint: { en: "One volume, no Sharh or Juz needed", ar: "مجلد واحد، بدون شرح أو جزء" },
  multiJuzHint: { en: "Has Sharh and multiple Juz", ar: "له شرح وعدة أجزاء" },
  borrowDate: { en: "Borrow Date", ar: "تاريخ الإعارة" },
  expectedReturn: { en: "Expected Return", ar: "تاريخ الإرجاع المتوقع" },
  actualReturn: { en: "Actual Return", ar: "تاريخ الإرجاع الفعلي" },
  status: { en: "Status", ar: "الحالة" },
  notes: { en: "Notes", ar: "ملاحظات" },
  // statuses
  Borrowed: { en: "Borrowed", ar: "معار", om: "Ergifame" },
  Reading: { en: "Reading", ar: "قيد القراءة", om: "Dubbisaa jira" },
  Returned: { en: "Returned", ar: "مُعاد", om: "Deebi'e" },
  Overdue: { en: "Overdue", ar: "متأخر", om: "Yeroon darbeera" },
  // actions
  markReturned: { en: "Mark as Returned", ar: "تحديد كمُعاد", om: "Deebi'e jedhi" },
  undoReturn: { en: "Undo Return", ar: "تراجع عن الإرجاع", om: "Deebii siri" },
  confirmReturn: { en: "Are you sure you want to mark this as returned?", ar: "هل أنت متأكد أنك تريد تحديد هذا كمُعاد؟", om: "Deebi'e jechuuf mirkaneessitaa?" },
  save: { en: "Save", ar: "حفظ", om: "Kuusi" },
  cancel: { en: "Cancel", ar: "إلغاء", om: "Dhiisi" },
  add: { en: "Add", ar: "إضافة", om: "Dabaluu" },
  reserve: { en: "Reserve", ar: "حجز", om: "Qabadhu" },
  search: { en: "Search", ar: "بحث", om: "Barbaadi" },
  all: { en: "All", ar: "الكل", om: "Hunda" },
  send: { en: "Send", ar: "إرسال", om: "Ergi" },
  // reservations
  currentHolder: { en: "Current Holder", ar: "الحامل الحالي" },
  queue: { en: "Queue", ar: "قائمة الانتظار" },
  addToQueue: { en: "Add reader to queue", ar: "إضافة قارئ للقائمة" },
  notifyNext: { en: "Notify next reader", ar: "إبلاغ القارئ التالي" },
  noReservations: { en: "No reservations yet.", ar: "لا توجد حجوزات بعد." },
  // readers
  totalBorrowed: { en: "Total Borrowed", ar: "إجمالي الإعارات" },
  returned: { en: "Returned", ar: "المُعاد" },
  currentlyBorrowed: { en: "Currently Borrowed", ar: "المُعار حالياً" },
  // ai
  aiPlaceholder: { en: "Ask about your library…", ar: "اسأل عن مكتبتك…", om: "Waa'ee mana kitaabaa kee gaafadhu…" },
  aiNeedsInternet: { en: "AI requires an internet connection.", ar: "يتطلب الذكاء الاصطناعي اتصالاً بالإنترنت.", om: "AI interneetii barbaada." },
  aiNeedsKey: { en: "Add your OpenRouter API key in Settings to use the AI assistant.", ar: "أضف مفتاح OpenRouter في الإعدادات لاستخدام المساعد الذكي.", om: "Furmaata OpenRouter qindaa'ina keessatti galchi." },
  aiIntro: { en: "I answer only from your library records. Try asking who borrowed a book or which books are overdue.", ar: "أجيب فقط من سجلات مكتبتك. جرّب أن تسأل من استعار كتاباً أو ما الكتب المتأخرة.", om: "Galmee mana kitaabaa kee irraa qofa deebisa. Eenyutu kitaaba fudhate yookaan kitaabni kan baay'ate gaafadhu." },
  aiSend: { en: "Send", ar: "إرسال", om: "Ergi" },
  aiThinking: { en: "Thinking…", ar: "جارٍ التفكير…", om: "Yaadaa jira…" },
  aiError: { en: "Something went wrong. Please try again.", ar: "حدث خطأ ما. حاول مرة أخرى.", om: "Wanti dogoggore jira. Irra deebi'ii yaali." },
  aiRateLimited: { en: "You're sending messages too quickly. Please wait a moment.", ar: "أنت ترسل رسائل بسرعة كبيرة. يرجى الانتظار لحظة.", om: "Ergaa baay'ee saffisaan erguutu jira. Yeroo muraasa eegadhu." },
  aiTimeout: { en: "The AI took too long to respond. Please try again.", ar: "استغرق الذكاء الاصطناعي وقتاً طويلاً للرد. حاول مرة أخرى.", om: "AI yeroo dheeraa fudhate. Irra deebi'ii yaali." },
  aiNotConfigured: { en: "The AI assistant is not configured. Please contact the administrator.", ar: "لم يتم إعداد المساعد الذكي. يرجى التواصل مع المسؤول.", om: "Gargaaraan AI qindaa'uu hin dandeenye. Bulchaa quunnamuu yaalii." },
  // admin-only
  adminOnlyTitle: { en: "Admins only", ar: "للمسؤولين فقط" },
  adminOnlyBody: {
    en: "This section is restricted to the system administrator.",
    ar: "هذا القسم مخصص لمسؤول النظام فقط.",
  },
  // settings
  apiKeyLabel: { en: "OpenRouter API Key", ar: "مفتاح OpenRouter" },
  apiModelLabel: { en: "AI Model", ar: "نموذج الذكاء" },
  firebaseLabel: { en: "Firebase Config (JSON)", ar: "إعداد Firebase (JSON)" },
  libraryName: { en: "Library Name", ar: "اسم المكتبة" },
  appearance: { en: "Appearance", ar: "المظهر" },
  language: { en: "Language", ar: "اللغة" },
  theme: { en: "Theme", ar: "السمة" },
  light: { en: "Light", ar: "فاتح" },
  dark: { en: "Dark", ar: "داكن" },
  saved: { en: "Saved", ar: "تم الحفظ" },
  // misc
  online: { en: "Online", ar: "متصل", om: "Interneetirra" },
  offline: { en: "Offline", ar: "غير متصل", om: "Interneetii malee" },
  syncing: { en: "Syncing…", ar: "جارٍ المزامنة…", om: "Walsimsiisaa…" },
  synced: { en: "Synced", ar: "تمت المزامنة", om: "Walsimsiifame" },
  lastSynced: { en: "Last synced", ar: "آخر مزامنة", om: "Walsimsiisa dhumaa" },
  pendingChanges: { en: "pending", ar: "قيد الانتظار", om: "eegaa jira" },
  empty: { en: "Nothing here yet.", ar: "لا يوجد شيء هنا بعد.", om: "Wanti hanga ammaatti hin jiru." },
  loading: { en: "Loading…", ar: "جارٍ التحميل…", om: "Fe'aa jira…" },
  today: { en: "Today", ar: "اليوم", om: "Har'a" },
  print: { en: "Print", ar: "طباعة", om: "Maxxansi" },
  downloadPDF: { en: "Download PDF", ar: "تحميل PDF", om: "PDF Buufadhu" },
  borrowReport: { en: "Borrow Report", ar: "تقرير الإعارات", om: "Gabaasa Ergisaa" },
  totalBooks: { en: "Total Books", ar: "إجمالي الكتب", om: "Waliigala Kitaabaa" },
  generatedOn: { en: "Generated on", ar: "تم الإنشاء في", om: "Kan dhiyaate" },
  seedDemo: { en: "Load demo data", ar: "تحميل بيانات تجريبية", om: "Deetaa fakkeenya fe'i" },
  days: { en: "days", ar: "أيام", om: "guyyaa" },
  overdueBy: { en: "overdue by", ar: "متأخر بـ", om: "yeroon darbeera" },
  dueTomorrow: { en: "due tomorrow", ar: "يُستحق غداً", om: "boru yeroon isaa" },
  // AI placeholder
  aiComingSoonTitle: { en: "AI Assistant", ar: "المساعد الذكي" },
  aiComingSoonBody: {
    en: "AI Assistant is ready for integration. Please provide your OpenRouter API key and AI configuration details to enable this feature.",
    ar: "المساعد الذكي جاهز للتكامل. يرجى تقديم مفتاح OpenRouter وتفاصيل إعداد الذكاء الاصطناعي لتفعيل هذه الميزة.",
  },
  // setup / configuration
  setupTitle: { en: "Setup & Configuration", ar: "الإعداد والتهيئة" },
  setupIntro: {
    en: "Before deployment, connect the application to the following services. Credentials are never hardcoded — use environment variables.",
    ar: "قبل النشر، اربط التطبيق بالخدمات التالية. لا تُخزَّن البيانات في الكود — استخدم متغيرات البيئة.",
  },
  setupFirebaseProject: { en: "Firebase Project", ar: "مشروع Firebase" },
  setupFirebaseAuth: { en: "Firebase Authentication (Google)", ar: "مصادقة Firebase (Google)" },
  setupFirestore: { en: "Firestore Database", ar: "قاعدة بيانات Firestore" },
  setupEnvVars: { en: "Environment Variables", ar: "متغيرات البيئة" },
  setupOpenRouter: { en: "OpenRouter API", ar: "واجهة OpenRouter" },
  setupFutureAi: { en: "Future AI Features", ar: "ميزات الذكاء المستقبلية" },
  setupRequired: { en: "Required", ar: "مطلوب" },
  setupOptional: { en: "Optional", ar: "اختياري" },
  envNote: {
    en: "Set Firebase keys via environment variables (VITE_FIREBASE_*) or paste your Firebase config JSON below for local testing.",
    ar: "عيّن مفاتيح Firebase عبر متغيرات البيئة (VITE_FIREBASE_*) أو الصق إعداد Firebase بصيغة JSON أدناه للاختبار المحلي.",
  },
  // auth extras
  accountExists: {
    en: "An account with this email already exists. Please sign in instead.",
    ar: "يوجد حساب بهذا البريد الإلكتروني بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.",
  },
  optional: { en: "optional", ar: "اختياري" },
  // profile / account
  myAccount: { en: "My Account", ar: "حسابي" },
  userName: { en: "Your Name", ar: "اسمك" },
  emailReadOnly: { en: "Email (cannot be changed)", ar: "البريد الإلكتروني (لا يمكن تغييره)" },
  // contact form
  contactIntro: {
    en: "Have a question, a report, or an idea? Send us a message and the system administrator will get back to you.",
    ar: "هل لديك سؤال أو بلاغ أو فكرة؟ أرسل لنا رسالة وسيرد عليك مسؤول النظام.",
  },
  yourName: { en: "Your Name", ar: "اسمك" },
  yourEmail: { en: "Your Email", ar: "بريدك الإلكتروني" },
  messageCategory: { en: "Category", ar: "الفئة" },
  catReport: { en: "Report a problem", ar: "الإبلاغ عن مشكلة" },
  catIdea: { en: "Suggest an idea", ar: "اقتراح فكرة" },
  catQuestion: { en: "Ask a question", ar: "طرح سؤال" },
  catOther: { en: "Other", ar: "أخرى" },
  yourMessage: { en: "Your Message", ar: "رسالتك" },
  messageFailed: { en: "Could not send your message. Please try again.", ar: "تعذّر إرسال رسالتك. حاول مرة أخرى." },
  // support inbox (super admin)
  supportInbox: { en: "Support Inbox", ar: "صندوق الدعم" },
  inboxEmpty: { en: "No messages yet.", ar: "لا توجد رسائل بعد." },
  markResolved: { en: "Mark resolved", ar: "تحديد كمحلول" },
  reopen: { en: "Reopen", ar: "إعادة فتح" },
  open: { en: "Open", ar: "مفتوح" },
  resolved: { en: "Resolved", ar: "محلول" },
  // conversations
  recentConversations: { en: "Recent Conversations", ar: "المحادثات الأخيرة", om: "Marii Dhiheenya" },
  newConversation: { en: "New conversation", ar: "محادثة جديدة", om: "Marii Haaraa" },
  yesterday: { en: "Yesterday", ar: "أمس", om: "Kaleessa" },
  lastWeek: { en: "Last Week", ar: "الأسبوع الماضي", om: "Torban Darbe" },
  older: { en: "Older", ar: "أقدم", om: "Kan Duraa" },
  delete: { en: "Delete", ar: "حذف", om: "Haquu" },
  // super admin
  superAdmin: { en: "Super Admin", ar: "المشرف العام", om: "Bulchaa Ol'aanaa" },
  superAdminDashboard: {
    en: "Super Admin Control Center",
    ar: "لوحة تحكم المشرف العام",
    om: "Giddugala Bulchaa Ol'aanaa",
  },
  superAdminWelcome: {
    en: "You have full system access. Manage users, libraries, and platform settings.",
    ar: "لديك وصول كامل للنظام. إدارة المستخدمين والمكتبات وإعدادات المنصة.",
    om: "Eeyyama sirna guutuu qabda. Fayyadamtoota, mana kitaabaa fi qindaa'inoota bulchi.",
  },
  manageUsers: { en: "Manage Users", ar: "إدارة المستخدمين", om: "Fayyadamtoota Bulchi" },
  systemOverview: { en: "System Overview", ar: "نظرة عامة على النظام", om: "Ilaalcha Sirnaa" },
  totalUsers: { en: "Total Users", ar: "إجمالي المستخدمين", om: "Fayyadamtoota Walii" },
  totalLibraries: { en: "Total Libraries", ar: "إجمالي المكتبات", om: "Mana Kitaabaa Walii" },
  totalBorrowRecords: { en: "Total Borrow Records", ar: "إجمالي سجلات الإعارة", om: "Galmee Ergisaa Walii" },
  totalReservations: { en: "Total Reservations", ar: "إجمالي الحجوزات", om: "Qabannoo Walii" },
  totalConversations: { en: "Total AI Conversations", ar: "إجمالي محادثات الذكاء", om: "Marii AI Walii" },
  activeUsersToday: { en: "Active Users Today", ar: "المستخدمون النشطون اليوم", om: "Fayyadamtoota Har'aa" },
  registeredUsers: { en: "Registered Users", ar: "المستخدمون المسجلون", om: "Fayyadamtoota Galmaa'an" },
  deleteHistoryTitle: { en: "Delete History Record", ar: "حذف سجل من التاريخ" },
  deleteHistoryMessage: { en: "Are you sure you want to delete this history record? This action cannot be undone.", ar: "هل أنت متأكد أنك تريد حذف هذا السجل من التاريخ؟ لا يمكن التراجع عن هذا الإجراء." },
  deleteConfirm: { en: "Delete", ar: "حذف" },
  // edit borrow
  editBorrow: { en: "Edit Record", ar: "تعديل السجل", om: "Galmee Gulaali" },
  editBorrowTitle: { en: "Edit Borrow Record", ar: "تعديل سجل الإعارة", om: "Galmee Ergisaa Gulaali" },
  edit: { en: "Edit", ar: "تعديل", om: "Gulaali" },
  recordNotFound: { en: "Record not found.", ar: "السجل غير موجود.", om: "Galmeen hin argamne." },
  editSuccess: { en: "Record updated successfully.", ar: "تم تحديث السجل بنجاح.", om: "Galmeen milkaa'inaan haaromfame." },
  editError: { en: "Failed to update record. Please try again.", ar: "فشل تحديث السجل. حاول مرة أخرى.", om: "Galmee haaromsuu hin dandeenye. Irra deebi'ii yaali." },
  confirmUnsaved: { en: "You have unsaved changes. Discard them?", ar: "لديك تغييرات غير محفوظة. هل تريد تجاهلها؟", om: "Jijjiirama hin kuufamne qabda. Dhiistaa?" },
};


interface I18nContextValue {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  t: (key: keyof typeof translations) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("amanah-lang")) as Lang | null;
    if (stored === "en" || stored === "ar" || stored === "om") setLangState(stored);
  }, []);

  useEffect(() => {
    const handler = () => {
      const stored = localStorage.getItem("amanah-settings");
      if (stored) {
        const { language: cloudLang } = JSON.parse(stored);
        if (cloudLang === "en" || cloudLang === "ar" || cloudLang === "om") {
          setLangState(cloudLang);
        }
      }
    };
    window.addEventListener("amanah-settings-changed", handler);
    return () => window.removeEventListener("amanah-settings-changed", handler);
  }, []);

  // Only Arabic is RTL; English and Afaan Oromo are LTR.
  const dir: "ltr" | "rtl" = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem("amanah-lang", l);
      // Also update settings store for sync
      const raw = localStorage.getItem("amanah-settings");
      const settings = raw ? JSON.parse(raw) : {};
      localStorage.setItem("amanah-settings", JSON.stringify({ ...settings, language: l }));
    }
  }, []);

  // Cycle en -> ar -> om -> en.
  const toggleLang = useCallback(
    () => setLang(lang === "en" ? "ar" : lang === "ar" ? "om" : "en"),
    [lang, setLang],
  );

  const t = useCallback(
    // Fall back to English when a key has no translation for the current language.
    (key: keyof typeof translations) =>
      translations[key]?.[lang] ?? translations[key]?.en ?? String(key),
    [lang],
  );

  const value = useMemo(() => ({ lang, dir, setLang, toggleLang, t }), [lang, dir, setLang, toggleLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
