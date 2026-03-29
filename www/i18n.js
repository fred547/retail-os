/**
 * Posterita i18n — lightweight translation system for static HTML.
 *
 * Usage: Add data-i18n="key" to any element. The JS swaps textContent.
 * For attributes: data-i18n-placeholder="key" swaps placeholder.
 * Language stored in localStorage('posterita-lang').
 */

const LANGUAGES = {
  en: { name: 'English', flag: '🇬🇧' },
  fr: { name: 'Français', flag: '🇫🇷' },
  kr: { name: 'Kreol', flag: '🇲🇺' },
  es: { name: 'Español', flag: '🇪🇸' },
  pt: { name: 'Português', flag: '🇧🇷' },
  hi: { name: 'हिन्दी', flag: '🇮🇳' },
  ar: { name: 'العربية', flag: '🇸🇦' },
  sw: { name: 'Kiswahili', flag: '🇰🇪' },
  zh: { name: '中文', flag: '🇨🇳' },
};

const T = {
  // ─── Hero ───────────────────────────────────────────────
  'hero.title': {
    en: 'Smarter Sales<br/>Start Here',
    fr: 'Des Ventes Plus<br/>Intelligentes',
    kr: 'Lavant Pli Malin<br/>Koumans Isi',
    es: 'Ventas Más<br/>Inteligentes',
    pt: 'Vendas Mais<br/>Inteligentes',
    hi: 'स्मार्ट बिक्री<br/>यहाँ शुरू करें',
    ar: 'مبيعات أذكى<br/>تبدأ هنا',
    sw: 'Mauzo Bora<br/>Yaanza Hapa',
    zh: '更智能的销售<br/>从这里开始',
  },
  'hero.subtitle': {
    en: 'Move from Manual to Digital with Posterita Retail OS. Boost Sales, Track Inventory, and Get Instant Insights — online and offline.',
    fr: 'Passez du manuel au digital avec Posterita Retail OS. Augmentez vos ventes, suivez votre stock et obtenez des analyses instantanées — en ligne et hors ligne.',
    kr: 'Pas depi manual a dijital avek Posterita Retail OS. Ogmant ou lavant, swiv ou stock, ek gagn analiz lor-le-sham — anlign ek or-lign.',
    es: 'Pase de lo manual a lo digital con Posterita Retail OS. Aumente ventas, controle inventario y obtenga análisis instantáneos — con o sin conexión.',
    pt: 'Passe do manual para o digital com Posterita Retail OS. Aumente vendas, controle estoque e obtenha análises instantâneas — online e offline.',
    hi: 'Posterita Retail OS के साथ मैनुअल से डिजिटल पर जाएं। बिक्री बढ़ाएं, इन्वेंट्री ट्रैक करें, और तुरंत इनसाइट्स पाएं — ऑनलाइन और ऑफलाइन।',
    ar: 'انتقل من اليدوي إلى الرقمي مع Posterita Retail OS. عزز المبيعات وتتبع المخزون واحصل على رؤى فورية — عبر الإنترنت وبدونه.',
    sw: 'Hamia kutoka mwongozo hadi dijitali na Posterita Retail OS. Ongeza mauzo, fuatilia hesabu, na upate ufahamu wa papo hapo — mtandaoni na nje ya mtandao.',
    zh: '使用 Posterita Retail OS 从手动转向数字化。提升销售、跟踪库存、获取即时洞察 — 在线和离线。',
  },
  'hero.cta': {
    en: 'Try Free Forever', fr: 'Essayer Gratuitement', kr: 'Esey Gratis', es: 'Pruebe Gratis', pt: 'Experimente Grátis', hi: 'मुफ़्त आज़माएं', ar: 'جرب مجاناً', sw: 'Jaribu Bure', zh: '永久免费试用',
  },
  'hero.cta2': {
    en: 'See Features', fr: 'Voir les fonctionnalités', kr: 'Get Bann Features', es: 'Ver Funciones', pt: 'Ver Recursos', hi: 'सुविधाएँ देखें', ar: 'شاهد الميزات', sw: 'Tazama Vipengele', zh: '查看功能',
  },
  'hero.badge': {
    en: 'Now available on Android, Windows, Mac & Linux',
    fr: 'Disponible sur Android, Windows, Mac et Linux',
    kr: 'Disponib lor Android, Windows, Mac ek Linux',
    es: 'Disponible en Android, Windows, Mac y Linux',
    pt: 'Disponível no Android, Windows, Mac e Linux',
    hi: 'अब Android, Windows, Mac और Linux पर उपलब्ध',
    ar: 'متوفر الآن على أندرويد وويندوز وماك ولينكس',
    sw: 'Sasa inapatikana kwenye Android, Windows, Mac na Linux',
    zh: '现已支持 Android、Windows、Mac 和 Linux',
  },
  'hero.nocreditcard': {
    en: 'No credit card required. Free plan available forever.',
    fr: 'Aucune carte de crédit requise. Plan gratuit pour toujours.',
    kr: 'Pa bizin kart kredit. Plan gratis pou toultan.',
    es: 'No se requiere tarjeta de crédito. Plan gratuito para siempre.',
    pt: 'Sem cartão de crédito. Plano gratuito para sempre.',
    hi: 'क्रेडिट कार्ड आवश्यक नहीं। फ्री प्लान हमेशा के लिए।',
    ar: 'لا حاجة لبطاقة ائتمان. خطة مجانية للأبد.',
    sw: 'Hakuna kadi ya mkopo inayohitajika. Mpango wa bure milele.',
    zh: '无需信用卡。免费计划永久有效。',
  },

  // ─── Social proof ───────────────────────────────────────
  'trust.line': {
    en: 'Trusted by 100+ businesses across Mauritius',
    fr: 'Plus de 100 entreprises nous font confiance à Maurice',
    kr: 'Plis ki 100 biznes fer nou konfians dan Moris',
    es: 'Más de 100 empresas confían en nosotros en Mauricio',
    pt: 'Mais de 100 empresas confiam em nós em Maurício',
    hi: 'मॉरीशस में 100+ व्यवसायों द्वारा विश्वसनीय',
    ar: 'موثوق به من قبل أكثر من 100 شركة في موريشيوس',
    sw: 'Kuaminiwa na biashara 100+ nchini Mauritius',
    zh: '毛里求斯 100+ 企业的信赖之选',
  },

  // ─── Stats ──────────────────────────────────────────────
  'stat.inventory': {
    en: 'Improvement in Inventory Turnover', fr: 'Amélioration de la rotation des stocks', kr: 'Ameliorasion dan rotasion stock', es: 'Mejora en rotación de inventario', pt: 'Melhoria na rotatividade do estoque', hi: 'इन्वेंट्री टर्नओवर में सुधार', ar: 'تحسين دوران المخزون', sw: 'Uboreshaji wa mzunguko wa hesabu', zh: '库存周转改善',
  },
  'stat.hours': {
    en: 'Hours Saved Weekly on Manual Tasks', fr: "Heures économisées par semaine", kr: 'Ler ekonomize par semenn', es: 'Horas ahorradas por semana', pt: 'Horas economizadas por semana', hi: 'मैनुअल कार्यों पर साप्ताहिक बचत', ar: 'ساعات توفير أسبوعية', sw: 'Masaa yaliyookolewa kwa wiki', zh: '每周节省手动工作时间',
  },
  'stat.customers': {
    en: 'More Customers Served Daily', fr: 'Plus de clients servis par jour', kr: 'Plis kliyan servi par zour', es: 'Más clientes atendidos diariamente', pt: 'Mais clientes atendidos por dia', hi: 'प्रतिदिन अधिक ग्राहकों की सेवा', ar: 'مزيد من العملاء يومياً', sw: 'Wateja zaidi kwa siku', zh: '每日服务更多客户',
  },
  'stat.accuracy': {
    en: 'Order Accuracy', fr: 'Précision des commandes', kr: 'Prezision komann', es: 'Precisión de pedidos', pt: 'Precisão dos pedidos', hi: 'ऑर्डर सटीकता', ar: 'دقة الطلبات', sw: 'Usahihi wa maagizo', zh: '订单准确率',
  },

  // ─── Features section ───────────────────────────────────
  'features.title': {
    en: 'Everything You Need to Run Your Business', fr: 'Tout ce dont vous avez besoin pour gérer votre entreprise', kr: 'Tou seki ou bizin pou zer ou biznes', es: 'Todo lo que necesita para su negocio', pt: 'Tudo que você precisa para o seu negócio', hi: 'अपना व्यवसाय चलाने के लिए सब कुछ', ar: 'كل ما تحتاجه لإدارة عملك', sw: 'Kila kitu unachohitaji kuendesha biashara yako', zh: '经营业务所需的一切',
  },
  'features.subtitle': {
    en: 'From a single register to 50 stores — Posterita scales with you. One platform, every feature.',
    fr: "D'une seule caisse à 50 magasins — Posterita évolue avec vous. Une plateforme, toutes les fonctionnalités.",
    kr: "Depi enn sel kes a 50 magazin — Posterita grandi avek ou. Enn sel platform, tou bann features.",
    es: 'De una caja a 50 tiendas — Posterita crece contigo. Una plataforma, todas las funciones.',
    pt: 'De um caixa a 50 lojas — Posterita cresce com você. Uma plataforma, todos os recursos.',
    hi: 'एक रजिस्टर से 50 स्टोर तक — Posterita आपके साथ बढ़ता है।',
    ar: 'من صندوق واحد إلى 50 متجراً — Posterita ينمو معك.',
    sw: 'Kutoka duka moja hadi 50 — Posterita inakua nawe.',
    zh: '从一台收银机到 50 家门店 — Posterita 与您一起成长。',
  },

  // ─── Feature card titles ────────────────────────────────
  'feat.pos': { en: 'POS Operations', fr: 'Opérations POS', kr: 'Operasion POS', es: 'Operaciones POS', pt: 'Operações POS', hi: 'POS संचालन', ar: 'عمليات نقطة البيع', sw: 'Shughuli za POS', zh: 'POS 运营' },
  'feat.inventory': { en: 'Inventory Management', fr: 'Gestion des stocks', kr: 'Zestion Stock', es: 'Gestión de Inventario', pt: 'Gestão de Estoque', hi: 'इन्वेंट्री प्रबंधन', ar: 'إدارة المخزون', sw: 'Usimamizi wa Hesabu', zh: '库存管理' },
  'feat.kitchen': { en: 'Kitchen & Restaurant', fr: 'Cuisine & Restaurant', kr: 'Lakwizinn & Restoran', es: 'Cocina y Restaurante', pt: 'Cozinha e Restaurante', hi: 'किचन और रेस्तरां', ar: 'المطبخ والمطعم', sw: 'Jikoni na Mkahawa', zh: '厨房与餐厅' },
  'feat.loyalty': { en: 'Loyalty & CRM', fr: 'Fidélité & CRM', kr: 'Fidelite & CRM', es: 'Lealtad y CRM', pt: 'Fidelidade e CRM', hi: 'लॉयल्टी और CRM', ar: 'الولاء وإدارة العملاء', sw: 'Uaminifu na CRM', zh: '会员忠诚度和 CRM' },
  'feat.reports': { en: 'Reports & Analytics', fr: 'Rapports & Analyses', kr: 'Rapor & Analiz', es: 'Informes y Análisis', pt: 'Relatórios e Análises', hi: 'रिपोर्ट और एनालिटिक्स', ar: 'التقارير والتحليلات', sw: 'Ripoti na Uchambuzi', zh: '报表与分析' },
  'feat.staff': { en: 'Staff & Workforce', fr: 'Personnel & Équipe', kr: 'Personel & Lekip', es: 'Personal y Equipo', pt: 'Equipe e Funcionários', hi: 'स्टाफ और कार्यबल', ar: 'الموظفون والقوى العاملة', sw: 'Wafanyakazi', zh: '员工与劳动力' },
  'feat.integrations': { en: 'Integrations', fr: 'Intégrations', kr: 'Integrasion', es: 'Integraciones', pt: 'Integrações', hi: 'इंटीग्रेशन', ar: 'التكاملات', sw: 'Muunganisho', zh: '集成' },
  'feat.quotations': { en: 'Quotations & Documents', fr: 'Devis & Documents', kr: 'Kotasion & Dokiman', es: 'Cotizaciones y Documentos', pt: 'Cotações e Documentos', hi: 'कोटेशन और दस्तावेज़', ar: 'عروض الأسعار والمستندات', sw: 'Nukuu na Hati', zh: '报价与文档' },
  'feat.cloud': { en: 'Cloud & Sync', fr: 'Cloud & Synchronisation', kr: 'Cloud & Sinkronizasion', es: 'Nube y Sincronización', pt: 'Nuvem e Sincronização', hi: 'क्लाउड और सिंक', ar: 'السحابة والمزامنة', sw: 'Wingu na Usawazishaji', zh: '云端与同步' },

  // ─── Platforms ──────────────────────────────────────────
  'platforms.title': {
    en: 'One Platform, Every Device', fr: 'Une plateforme, tous les appareils', kr: 'Enn sel platform, tou lapparey', es: 'Una plataforma, todos los dispositivos', pt: 'Uma plataforma, todos os dispositivos', hi: 'एक प्लेटफ़ॉर्म, हर डिवाइस', ar: 'منصة واحدة، كل الأجهزة', sw: 'Jukwaa moja, kila kifaa', zh: '一个平台，全设备支持',
  },

  // ─── Hardware ──────────────────────────────────────────
  'hardware.title': {
    en: 'Works With Your Hardware', fr: 'Compatible avec votre matériel', kr: 'Mars avek ou materiel', es: 'Funciona con su hardware', pt: 'Funciona com seu hardware', hi: 'आपके हार्डवेयर के साथ काम करता है', ar: 'يعمل مع أجهزتك', sw: 'Inafanya kazi na vifaa vyako', zh: '兼容您的硬件',
  },
  'hardware.subtitle': {
    en: 'No proprietary hardware. Use any Android tablet, Windows PC, or Mac — plus standard peripherals.',
    fr: 'Aucun matériel propriétaire. Utilisez n\'importe quelle tablette Android, PC Windows ou Mac.',
    kr: 'Pa ena materiel proprieter. Servi ninport ki tablet Android, PC Windows ou Mac.',
    es: 'Sin hardware propietario. Use cualquier tablet Android, PC Windows o Mac.',
    pt: 'Sem hardware proprietário. Use qualquer tablet Android, PC Windows ou Mac.',
    hi: 'कोई प्रोप्राइटरी हार्डवेयर नहीं। कोई भी Android टैबलेट, Windows PC, या Mac उपयोग करें।',
    ar: 'لا أجهزة احتكارية. استخدم أي جهاز أندرويد أو ويندوز أو ماك.',
    sw: 'Hakuna vifaa vya kipekee. Tumia kibao chochote cha Android, PC ya Windows, au Mac.',
    zh: '无专有硬件要求。使用任何 Android 平板、Windows PC 或 Mac。',
  },

  // ─── Industries ────────────────────────────────────────
  'industries.title': {
    en: 'Built for Your Industry', fr: 'Conçu pour votre industrie', kr: 'Fer pou ou lindistri', es: 'Hecho para su industria', pt: 'Feito para sua indústria', hi: 'आपके उद्योग के लिए बनाया गया', ar: 'مصمم لصناعتك', sw: 'Imejengwa kwa tasnia yako', zh: '为您的行业而建',
  },

  // ─── Pricing ───────────────────────────────────────────
  'pricing.title': {
    en: 'Simple, Transparent Pricing', fr: 'Tarification simple et transparente', kr: 'Pri sinp ek transparan', es: 'Precios simples y transparentes', pt: 'Preços simples e transparentes', hi: 'सरल, पारदर्शी मूल्य निर्धारण', ar: 'تسعير بسيط وشفاف', sw: 'Bei rahisi na wazi', zh: '简单透明的定价',
  },
  'pricing.zerofees': {
    en: '$0 transaction fees. Ever. We don\'t take a cut of your sales.',
    fr: '0 $ de frais de transaction. Jamais. Nous ne prenons aucune commission sur vos ventes.',
    kr: '$0 fre tranzaksion. Zame. Nou pa pran okenn komisyon lor ou lavant.',
    es: '$0 comisiones por transacción. Nunca. No tomamos comisión de sus ventas.',
    pt: '$0 taxas de transação. Nunca. Não cobramos comissão das suas vendas.',
    hi: '$0 लेनदेन शुल्क। कभी नहीं। हम आपकी बिक्री से कोई कट नहीं लेते।',
    ar: 'صفر رسوم معاملات. أبداً. لا نأخذ أي عمولة من مبيعاتك.',
    sw: '$0 ada za muamala. Kamwe. Hatuchukui sehemu ya mauzo yako.',
    zh: '零交易费。永远。我们不从您的销售中抽成。',
  },

  // ─── Plan names ────────────────────────────────────────
  'plan.free': { en: 'Free', fr: 'Gratuit', kr: 'Gratis', es: 'Gratis', pt: 'Grátis', hi: 'मुफ़्त', ar: 'مجاني', sw: 'Bure', zh: '免费' },
  'plan.starter': { en: 'Starter', fr: 'Démarrage', kr: 'Starter', es: 'Inicial', pt: 'Inicial', hi: 'स्टार्टर', ar: 'المبتدئ', sw: 'Mwanzo', zh: '入门版' },
  'plan.growth': { en: 'Growth', fr: 'Croissance', kr: 'Growth', es: 'Crecimiento', pt: 'Crescimento', hi: 'ग्रोथ', ar: 'النمو', sw: 'Ukuaji', zh: '成长版' },
  'plan.business': { en: 'Business', fr: 'Entreprise', kr: 'Biznes', es: 'Negocio', pt: 'Negócio', hi: 'बिज़नेस', ar: 'الأعمال', sw: 'Biashara', zh: '商业版' },

  // ─── See it in action ──────────────────────────────────
  'demo.title': {
    en: 'See It in Action', fr: 'Voyez-le en action', kr: 'Get li an aksion', es: 'Véalo en acción', pt: 'Veja em ação', hi: 'इसे एक्शन में देखें', ar: 'شاهده في العمل', sw: 'Ione ikifanya kazi', zh: '查看实际效果',
  },

  // ─── Customers ─────────────────────────────────────────
  'customers.title': {
    en: 'What Our Customers Say', fr: 'Ce que disent nos clients', kr: 'Ki nou bann kliyan dir', es: 'Lo que dicen nuestros clientes', pt: 'O que nossos clientes dizem', hi: 'हमारे ग्राहक क्या कहते हैं', ar: 'ماذا يقول عملاؤنا', sw: 'Wateja wetu wanasemaje', zh: '客户评价',
  },

  // ─── FAQ ───────────────────────────────────────────────
  'faq.title': {
    en: 'Frequently Asked Questions', fr: 'Questions fréquemment posées', kr: 'Kestion ki dimounn souvan dimande', es: 'Preguntas frecuentes', pt: 'Perguntas frequentes', hi: 'अक्सर पूछे जाने वाले प्रश्न', ar: 'الأسئلة الشائعة', sw: 'Maswali yanayoulizwa mara kwa mara', zh: '常见问题',
  },

  // ─── CTA ───────────────────────────────────────────────
  'cta.title': {
    en: 'Ready to Transform Your Business?', fr: 'Prêt à transformer votre entreprise ?', kr: 'Pare pou transform ou biznes ?', es: '¿Listo para transformar su negocio?', pt: 'Pronto para transformar seu negócio?', hi: 'अपने व्यवसाय को बदलने के लिए तैयार?', ar: 'مستعد لتحويل عملك؟', sw: 'Uko tayari kubadilisha biashara yako?', zh: '准备好转型您的业务了吗？',
  },
  'cta.subtitle': {
    en: 'Try Posterita Retail OS for free today. No credit card required. Set up in under 5 minutes.',
    fr: 'Essayez Posterita Retail OS gratuitement. Aucune carte de crédit requise. Configuration en moins de 5 minutes.',
    kr: 'Esey Posterita Retail OS gratis zordi. Pa bizin kart kredit. Set up an mwins ki 5 minit.',
    es: 'Pruebe Posterita Retail OS gratis hoy. Sin tarjeta de crédito. Configure en menos de 5 minutos.',
    pt: 'Experimente o Posterita Retail OS gratuitamente. Sem cartão de crédito. Configure em menos de 5 minutos.',
    hi: 'आज ही Posterita Retail OS मुफ्त में आज़माएं। क्रेडिट कार्ड नहीं चाहिए। 5 मिनट में सेटअप।',
    ar: 'جرب Posterita Retail OS مجاناً اليوم. لا حاجة لبطاقة ائتمان. إعداد في أقل من 5 دقائق.',
    sw: 'Jaribu Posterita Retail OS bure leo. Hakuna kadi ya mkopo. Weka ndani ya dakika 5.',
    zh: '今天就免费试用 Posterita Retail OS。无需信用卡。5 分钟内完成设置。',
  },
  'cta.start': {
    en: 'Start Free Today', fr: "Commencer gratuitement", kr: 'Koumans Gratis Zordi', es: 'Empiece Gratis Hoy', pt: 'Comece Grátis Hoje', hi: 'आज मुफ़्त शुरू करें', ar: 'ابدأ مجاناً اليوم', sw: 'Anza Bure Leo', zh: '今天免费开始',
  },
  'cta.contact': {
    en: 'Contact Sales', fr: 'Contacter les ventes', kr: 'Kontakte Lavant', es: 'Contactar Ventas', pt: 'Contatar Vendas', hi: 'बिक्री से संपर्क करें', ar: 'اتصل بالمبيعات', sw: 'Wasiliana na Mauzo', zh: '联系销售',
  },

  // ─── Demo bar ──────────────────────────────────────────
  'demo.bar': {
    en: 'Every new account comes with a <strong>demo store</strong> pre-loaded with 15 sample products — explore risk-free.',
    fr: 'Chaque nouveau compte inclut un <strong>magasin démo</strong> avec 15 produits exemples — explorez sans risque.',
    kr: 'Sak nouvo kont vinn avek enn <strong>magazin demo</strong> pre-load avek 15 prodwi — explore san risk.',
    es: 'Cada nueva cuenta viene con una <strong>tienda demo</strong> con 15 productos de muestra — explore sin riesgo.',
    pt: 'Cada nova conta vem com uma <strong>loja demo</strong> com 15 produtos de amostra — explore sem risco.',
    hi: 'हर नए अकाउंट में 15 सैंपल प्रोडक्ट्स के साथ एक <strong>डेमो स्टोर</strong> आता है — बिना जोखिम एक्सप्लोर करें।',
    ar: 'كل حساب جديد يأتي مع <strong>متجر تجريبي</strong> محمل مسبقاً بـ 15 منتجاً — استكشف بدون مخاطر.',
    sw: 'Kila akaunti mpya inakuja na <strong>duka la maonyesho</strong> lililopakiwa bidhaa 15 — chunguza bila hatari.',
    zh: '每个新账户都附带一个预装 15 个示例产品的<strong>演示商店</strong> — 零风险体验。',
  },
  'demo.try': {
    en: 'Try the Demo', fr: 'Essayer la démo', kr: 'Esey Demo', es: 'Probar la Demo', pt: 'Experimentar a Demo', hi: 'डेमो आज़माएं', ar: 'جرب العرض', sw: 'Jaribu Onyesho', zh: '试用演示',
  },

  // ─── Nav ───────────────────────────────────────────────
  'nav.features': { en: 'Features', fr: 'Fonctionnalités', kr: 'Features', es: 'Funciones', pt: 'Recursos', hi: 'सुविधाएँ', ar: 'الميزات', sw: 'Vipengele', zh: '功能' },
  'nav.platforms': { en: 'Platforms', fr: 'Plateformes', kr: 'Platform', es: 'Plataformas', pt: 'Plataformas', hi: 'प्लेटफ़ॉर्म', ar: 'المنصات', sw: 'Majukwaa', zh: '平台' },
  'nav.hardware': { en: 'Hardware', fr: 'Matériel', kr: 'Materiel', es: 'Hardware', pt: 'Hardware', hi: 'हार्डवेयर', ar: 'الأجهزة', sw: 'Vifaa', zh: '硬件' },
  'nav.industries': { en: 'Industries', fr: 'Industries', kr: 'Lindistri', es: 'Industrias', pt: 'Indústrias', hi: 'उद्योग', ar: 'الصناعات', sw: 'Viwanda', zh: '行业' },
  'nav.pricing': { en: 'Pricing', fr: 'Tarifs', kr: 'Pri', es: 'Precios', pt: 'Preços', hi: 'मूल्य', ar: 'الأسعار', sw: 'Bei', zh: '定价' },
  'nav.customers': { en: 'Customers', fr: 'Clients', kr: 'Kliyan', es: 'Clientes', pt: 'Clientes', hi: 'ग्राहक', ar: 'العملاء', sw: 'Wateja', zh: '客户' },
  'nav.faq': { en: 'FAQ', fr: 'FAQ', kr: 'FAQ', es: 'FAQ', pt: 'FAQ', hi: 'FAQ', ar: 'الأسئلة', sw: 'Maswali', zh: '常见问题' },
  'nav.login': { en: 'Login', fr: 'Connexion', kr: 'Konekte', es: 'Iniciar sesión', pt: 'Entrar', hi: 'लॉगिन', ar: 'تسجيل الدخول', sw: 'Ingia', zh: '登录' },
  'nav.startfree': { en: 'Start Free', fr: 'Commencer', kr: 'Koumans Gratis', es: 'Empezar Gratis', pt: 'Começar Grátis', hi: 'मुफ़्त शुरू', ar: 'ابدأ مجاناً', sw: 'Anza Bure', zh: '免费开始' },
};

// ─── Engine ──────────────────────────────────────────────

let currentLang = localStorage.getItem('posterita-lang') || 'en';

function setLang(lang) {
  if (!LANGUAGES[lang]) return;
  currentLang = lang;
  localStorage.setItem('posterita-lang', lang);
  document.documentElement.lang = lang;
  if (lang === 'ar') document.documentElement.dir = 'rtl';
  else document.documentElement.dir = 'ltr';

  // Update all translatable elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (T[key] && T[key][lang]) {
      el.innerHTML = T[key][lang];
    }
  });

  // Update language selector display
  const langBtn = document.getElementById('lang-current');
  if (langBtn) {
    langBtn.textContent = LANGUAGES[lang].flag + ' ' + LANGUAGES[lang].name;
  }

  // Close dropdown
  const dropdown = document.getElementById('lang-dropdown');
  if (dropdown) dropdown.classList.add('hidden');
}

function toggleLangDropdown() {
  const dropdown = document.getElementById('lang-dropdown');
  if (dropdown) dropdown.classList.toggle('hidden');
}

// Auto-detect language from browser
function detectLang() {
  const saved = localStorage.getItem('posterita-lang');
  if (saved && LANGUAGES[saved]) return saved;

  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('fr')) return 'fr';
  if (browserLang.startsWith('es')) return 'es';
  if (browserLang.startsWith('pt')) return 'pt';
  if (browserLang.startsWith('hi')) return 'hi';
  if (browserLang.startsWith('ar')) return 'ar';
  if (browserLang.startsWith('sw')) return 'sw';
  if (browserLang.startsWith('zh')) return 'zh';
  return 'en';
}

// Init on load
document.addEventListener('DOMContentLoaded', () => {
  const lang = detectLang();
  if (lang !== 'en') setLang(lang);
});
