// src/locales/tr/common.ts
const trCommon = {
  appName: 'Kurulum Takip',

  nav: {
    dashboard: 'Kontrol Paneli',
    orders: 'Siparişler',
    installations: 'Kurulumlar',
    calendar: 'Takvim',
    reports: 'Raporlar',
    usersAndRoles: 'Kullanıcılar',
    integrations: 'Entegrasyonlar',
    audit: 'Denetim',

    crewHome: 'Ana Sayfa',
    crewJobs: 'İşler',
    crewIssues: 'Sorunlar',
    crewSettings: 'Ayarlar',
  },

  settings: {
    title: 'Ayarlar',
    subtitle: 'Tercihlerinizi yapılandırın.',
    languageSectionTitle: 'Dil',
    languageSectionDescription: 'Arayüz dilini seçin.',
    english: 'İngilizce',
    turkish: 'Türkçe',
  },

  common: {
    save: 'Kaydet',
    cancel: 'İptal',
    search: 'Ara',
    searchPlaceholder: 'Ara...',
  },

  commandPalette: {
    placeholder: 'Ara veya komut yaz…',
    noResults: 'Sonuç yok',
    newOrder: 'Yeni sipariş',
    newInstallation: 'Yeni kurulum',
    profile: 'Profiliniz',
    settings: 'Ayarlar',
    signOut: 'Çıkış yap',
    helpCentre: 'Yardım merkezi',
    keyboardShortcuts: 'Klavye kısayolları',
  },

  comingSoon: {
    title: 'Yakında',
    description: 'Bu özellik henüz mevcut değil. Üzerinde çalışıyoruz.',
    backToDashboard: 'Panele dön',
    goBack: 'Geri',
    features: {
      help: {
        title: 'Yardım merkezi',
        description: 'Dokümantasyon ve yardım makaleleri yakında eklenecek.',
      },
      shortcuts: {
        title: 'Klavye kısayolları',
        description: 'Kısayol referansı yakında burada olacak.',
      },
      integrations: {
        title: 'Entegrasyonlar',
        description: 'Üçüncü taraf entegrasyonları yakında eklenecek.',
      },
      reports: {
        title: 'Raporlar',
        description: 'Gelişmiş raporlama yakında eklenecek.',
      },
      capacity: {
        title: 'Kapasite ayarları',
        description: 'Kapasite ve planlama ayarları yakında eklenecek.',
      },
    },
  },

  pages: {
    adminDashboard: 'Kontrol Paneli',
    installations: 'Kurulumlar',
  },

  roles: {
  admin: 'Yönetici',
  storeManager: 'Mağaza Müdürü',
  crew: 'Kurulum Ekibi',
},
  header: {
  openUserMenu: 'Kullanıcı menüsünü aç',
  yourProfile: 'Profiliniz',
  settings: 'Ayarlar',
  signOut: 'Çıkış yap',
},

adminDashboard: {
  subtitle: 'Mobilya kurulum operasyonlarınızın genel görünümü',
  loading: 'Canlı veriler yükleniyor…',
  loadError: 'API’den bazı veriler yüklenemedi.',
  storeLabel: 'Mağaza',
  allStores: 'Tüm Mağazalar',

  monthlyTitle: 'Aylık Kurulumlar',
  weeklyTitle: 'Haftalık Kurulumlar',
  successfulInstallations: 'başarılı kurulum',
  of: ' / toplam',
  vsLastMonth: 'geçen aya göre',
  vsLastWeek: 'geçen haftaya göre',
  changeVsLastMonth: 'Geçen aya göre değişim (yüzde)',
  changeVsLastWeek: 'Geçen haftaya göre değişim (yüzde)',

  recentActivityTitle: 'Son Aktiviteler',
  recentActivityDescription:
    'Kurulum operasyonlarınızdan en güncel hareketler (canlı denetim kayıtları)',
  noRecentActivity: 'Bu filtre için son aktivite bulunmuyor.',

  quickViewOrdersTitle: 'Siparişleri Görüntüle',
  quickViewOrdersSubtitle: 'Siparişleri yönet ve takip et',
  quickViewInstallationsTitle: 'Kurulumları Görüntüle',
  quickViewInstallationsSubtitle: 'Tüm kurulumları yönet',
  quickManageUsersTitle: 'Kullanıcıları Yönet',
  quickManageUsersSubtitle: 'Kullanıcı ekle ve düzenle',
  quickViewReportsTitle: 'Raporları Görüntüle',
  quickViewReportsSubtitle: 'Analizler ve içgörüler',
},

usersPage: {
    title: 'Kullanıcılar',
    subtitle: 'Erişimleri yönetin',

    refresh: 'Yenile',
    newUserButton: 'Yeni Kullanıcı',

    searchPlaceholder: 'İsim, e-posta, telefon veya kimlik ile ara…',

    filters: {
      allRoles: 'Tüm roller',
      allStatuses: 'Tüm durumlar',
    },

    status: {
      active: 'Aktif',
      disabled: 'Devre dışı',
    },

    table: {
      name: 'Ad',
      email: 'E-posta',
      role: 'Rol',
      status: 'Durum',
      actions: 'İşlemler',
    },

    actions: {
      edit: 'Düzenle',
      disable: 'Devre dışı bırak',
      activate: 'Aktifleştir',
      create: 'Oluştur',
      saveChanges: 'Değişiklikleri kaydet',
    },

    noUsers: 'Kullanıcı bulunamadı.',
    loading: 'Kullanıcılar yükleniyor…',
    loadError: 'Kullanıcılar yüklenemedi.',

    toasts: {
      userCreated: 'Kullanıcı oluşturuldu',
      createFailed: 'Kullanıcı oluşturulamadı',
      userUpdated: 'Kullanıcı güncellendi',
      updateFailed: 'Kullanıcı güncellenemedi',
    },

    validation: {
      missingRequired:
        'İsim, e-posta, şifre ve rol zorunludur.',
    },

    create: {
      title: 'Yeni Kullanıcı',
      subtitle: 'Yeni bir hesap oluştur',
    },

    edit: {
      title: 'Kullanıcıyı Düzenle',
      subtitle: 'Hesap ayarlarını güncelle',
    },

    form: {
      fullName: 'Ad Soyad',
      email: 'E-posta',
      phoneOptional: 'Telefon (opsiyonel)',
      initialPassword: 'İlk şifre',
      selectRolePlaceholder: 'Rol seçin…',
    },
  },

    audit: {
    title: 'Denetim Kayıtları',
    subtitle: 'Backend\'den gelen gerçek loglar.',

    filters: {
      searchPlaceholder: 'ID, işlem, varlık, IP ara...',
      actorPlaceholder: 'Aktör ID',
      entityPlaceholder: 'Varlık (Kullanıcı, Sipariş, Kurulum...)',
      dateTo: 'ile',
    },

    table: {
      timestamp: 'Zaman damgası',
      actor: 'Aktör',
      action: 'İşlem',
      entity: 'Varlık',
      entityId: 'Varlık ID',
      ip: 'IP',
      payload: 'Yük (Payload)',
      noLogs: 'Herhangi bir denetim kaydı bulunamadı.',
    },

    buttons: {
      refresh: 'Yenile',
      viewJson: 'JSON\'u görüntüle',
      copyJson: 'JSON\'u kopyala',
      close: 'Kapat',
    },

    pagination: {
      page: 'Sayfa',
      of: ' / ',
    },

    drawer: {
      payload: 'Yük (Payload)',
      actor: 'Aktör',
      ip: 'IP',
    },
  },

  reportsPage: {
  title: 'Raporlar',
  filtersTitle: 'Filtreler',
  startLabel: 'Başlangıç',
  endLabel: 'Bitiş',
  cityLabel: 'Şehir',
  storeLabel: 'Mağaza',
  allStores: 'Tüm Mağazalar',

  installationsTitle: 'Kurulumlar',
  totalSuccessfulLabel: 'Toplam Başarılı Kurulum',
  successRateLabel: 'Başarı oranı',

  difficultyTitle: 'Kurulum Zorluk Toplamı',
  easyLabel: 'Kolay',
  intermediateLabel: 'Orta',
  hardLabel: 'Zor',

  serviceAfterTitle: 'Kurulum Sonrası Servis',
  serviceAfterDescription: 'Toplam Kurulum / Kurulum Sonrası Servisli',

  showing: 'Gösteriliyor',
  item: 'kayıt',
  items: 'kayıt',
  for: 'için',
  selectedStoreSuffix: '• seçili mağaza',
  between: 'arasında',
  and: 've',

  noInstallations: 'Seçilen filtrelere uyan kurulum bulunamadı.',

  viewInstallation: 'Kurulumu Görüntüle',
  viewInstallationTooltip: 'Kurulum detayına git',

  debugCurrentParams: 'Geçerli parametreler →',
},

calendarPage: {
  prev: 'Önceki',
  next: 'Sonraki',
  weekView: 'Haftalık Görünüm',
  storeLabelShort: 'Mağaza',

  monthly: 'Aylık',
  month: 'Ay',
  weekly: 'Haftalık',
  week: 'Hafta',

  refresh: 'Yenile',
  jumpToThisMonth: 'Bu aya git',
  today: 'Bugün',
  createInstallation: 'Kurulum Oluştur',

  legend: {
    completed: 'Tamamlandı',
    acceptedPendingScheduled: 'Kabul / Bekliyor / Planlandı',
    failedCanceled: 'Başarısız / İptal',
    inProgress: 'Devam ediyor',
  },

  weekdays: {
    mon: 'Pzt',
    tue: 'Sal',
    wed: 'Çar',
    thu: 'Per',
    fri: 'Cum',
    sat: 'Cmt',
    sun: 'Paz',
  },

  more: 'daha…',

  loadingInstallations: 'Kurulumlar yükleniyor…',
  failedToLoadInstallations: 'Kurulumlar yüklenemedi.',
  noInstallationsThisMonth: 'Bu ay için kurulum bulunmuyor.',
  noInstallationsThisWeek: 'Bu hafta için kurulum bulunmuyor.',

  timeColumn: 'Saat',
},

installationsPage: {
  title: 'Kurulumlar',
  subtitle: 'Yaklaşan işler için plan durumu ve ilerlemeyi görüntüleyin.',
  createButton: 'Kurulum oluştur',

  filters: {
    searchLabel: 'Arama',
    searchPlaceholder:
      'Kurulum ID, harici sipariş ID, mağaza, adres…',
    statusLabel: 'Durum',
    status: {
      all: 'Tümü',
      pending: 'Beklemede',
      staged: 'Hazırlandı',
      in_progress: 'Devam ediyor',
      completed: 'Tamamlandı',
      failed: 'Başarısız',
      cancelled: 'İptal edildi',
    },
    zoneLabel: 'Bölge (şehir)',
    allZones: 'Tüm bölgeler',
    from: 'Başlangıç',
    to: 'Bitiş',
  },

  chips: {
    all: 'Tümü',
    pending: 'Beklemede',
    staged: 'Hazırlandı',
    in_progress: 'Devam ediyor',
    completed: 'Tamamlandı',
    failed: 'Başarısız',
    cancelled: 'İptal edildi',
  },

  table: {
    start: 'Başlangıç',
    installation: 'Kurulum',
    store: 'Mağaza',
    zone: 'Bölge',
    status: 'Durum',
    crew: 'Ekip',
    idPrefix: 'ID:',
  },

  statusLabels: {
    pending: 'Beklemede',
    staged: 'Hazırlandı',
    in_progress: 'Devam ediyor',
    completed: 'Tamamlandı',
    failed: 'Başarısız',
    cancelled: 'İptal edildi',
  },

  crew: {
    assigned: 'atanmış',
  },

  actions: {
    view: 'Görüntüle',
  },

  loading: 'Kurulumlar yükleniyor…',
  loadError: 'Kurulumlar yüklenemedi.',
  noResults: 'Filtrelere uyan kurulum bulunamadı.',

  pagination: {
    showing: 'Gösterilen',
    of: 'toplam',
    prev: 'Önceki',
    next: 'Sonraki',
    page: 'Sayfa',
  },

  sort: 'Sırala',
},

ordersPage: {
  title: "Siparişler",
  subtitle: "Harici sistemden içe aktarılan yalnızca-okunur liste.",

  filters: {
    searchLabel: "Arama",
    searchPlaceholder: "Sipariş ID, müşteri, mağaza…",

    statusLabel: "Durum",
    status: {
      all: "Tümü",
      pending: "Beklemede",
      confirmed: "Onaylandı",
      cancelled: "İptal edildi",
    },

    storeLabel: "Mağaza",
    storeAll: "Tüm mağazalar",

    from: "Başlangıç",
    to: "Bitiş",
  },

  table: {
    placed: "Tarih",
    order: "Sipariş",
    customer: "Müşteri",
    store: "Mağaza",
    items: "Ürünler",
    status: "Durum",
  },

  status: {
    pending: "Beklemede",
    confirmed: "Onaylandı",
    cancelled: "İptal edildi",
  },

  loading: "Siparişler yükleniyor…",
  noResults: "Filtrelere uyan sipariş bulunamadı.",

  actions: {
    view: "Görüntüle",
  },

  pagination: {
    showing: "Gösterilen",
    of: "toplam",
    prev: "Önceki",
    next: "Sonraki",
    page: "Sayfa",
  },
},

installationDetailPage: {
  header: {
    title: 'Kurulum',
    subtitle: 'Detaylı görünüm',
  },

  buttons: {
    openCalendar: 'Takvimi Aç',
    viewOrder: 'Siparişi Görüntüle',
  },

  statusCard: {
    title: 'Durum',
    subtitle: 'Durum ve zamanlama',
    store: 'Mağaza:',
    start: 'Başlangıç:',
    end: 'Bitiş:',
  },

  crewCard: {
    title: 'Ekip',
    subtitle: 'Atanmış ekip',
    none: 'Herhangi bir ekip atanmadı.',
    status: {
      accepted: 'Kabul edildi',
      declined: 'Reddedildi',
      pending: 'Beklemede',
    },
    memberFallback: 'Ekip Üyesi',
    roleFallback: 'Ekip',
  },

  notesCard: {
    title: 'Notlar',
    subtitle: 'Özel talimatlar',
    none: 'Herhangi bir not yok.',
  },

  itemsCard: {
    title: 'Ürünler',
    subtitle: 'Bu kuruluma ait sipariş ürünleri',
    table: {
      product: 'Ürün',
      room: 'Oda',
      instructions: 'Talimatlar',
    },
    none: 'Herhangi bir kurulum ürünü yok.',
  },

  loading: 'Kurulum yükleniyor…',
  loadError: 'Kurulum yüklenemedi.',
},

profilePage: {
  header: {
    title: 'Profiliniz',
    subtitle: 'InstallOps içinde hesap detaylarınızı ve rol izinlerinizi görüntüleyin.',
  },

  error: {
    title: 'Profiliniz yüklenemedi',
  },

  accountCard: {
    title: 'Hesap detayları',
    fields: {
      userId: 'Kullanıcı ID',
      role: 'Rol',
      roleId: 'Rol ID',
      email: 'E-posta',
    },
  },

  permissionsCard: {
    title: 'İzinler',
    noPermissions: 'Bu rol için açıkça tanımlanmış bir izin döndürülmedi.',
  },

  roleLabels: {
    admin: 'Yönetici',
    storeManager: 'Mağaza Müdürü',
    crew: 'Kurulum Ekibi',
  },
},

  createInstallationPage: {
    header: {
      title: 'Kurulum Oluştur',
      subtitle: 'Bir sipariş için yeni kurulum planlayın',
    },

    store: {
      title: 'Mağaza',
      subtitle: 'Bu kuruluma ait mağazayı seçin',
      loading: 'Mağazalar yükleniyor…',
      usingAssigned: 'Size atanmış mağaza kullanılıyor',
      selectPlaceholder: 'Mağaza seçin',
      loadError:
        'Mağazalar yüklenemedi. Kurulum oluşturamayabilirsiniz.',
    },

    order: {
      title: 'Sipariş',
      subtitle:
        'Dış sipariş numarasını, mağaza sisteminde göründüğü şekilde aynen yazın.',
      externalIdLabel: 'Dış Sipariş Numarası',
      externalIdPlaceholder: 'Örn: 1234, 2025-0001, POS-ABC-999…',
    },

    schedule: {
      title: 'Zamanlama',
      dateLabel: 'Tarih',
      timeLabel: 'Başlangıç saati',
    },

    zone: {
      title: 'Bölge',
      subtitle: 'KKTC bölgesini seçin',
      selectPlaceholder: 'Bölge seçin',
    },

    difficulty: {
      title: 'Kurulum Zorluğu',
      subtitle: 'Bir seçenek seçin',
      options: {
        easy: 'Kolay',
        intermediate: 'Orta',
        hard: 'Zor',
      },
      selected: 'Seçilen:',
      noneSelected: 'Herhangi bir zorluk seçilmedi.',
    },

    notes: {
      title: 'Notlar',
      subtitle: 'Ekip için özel talimatlar',
      placeholder:
        'Örn: müşteriyi varıştan önce arayın, kırılabilir ürünler, bina giriş bilgileri…',
    },

    crew: {
      title: 'Ekip Ata',
      subtitle: 'En fazla 3 ekip üyesi seçin',
      loading: 'Ekip yükleniyor…',
      loadError: 'Ekip yüklenemedi.',
      maxTooltip: 'Maksimum 3 üye',
      noneSelected: 'Henüz ekip seçilmedi.',
      removeAria: '{{name}} kullanıcısını kaldır',
      removeTitle: 'Kaldır',
    },

    actions: {
      title: 'İşlemler',
      subtitle: 'Kaydet ve planla',
      scheduling: 'Planlanıyor…',
      submit: 'Kurulum Oluştur',
      hint:
        'Aktifleştirmek için mağaza seçin, dış sipariş numarası, tarih, saat ve zorluk bilgilerini girin.',
    },

    validation: {
      storeRequired: 'Mağaza seçimi zorunludur',
      externalOrderIdRequired: 'Dış sipariş numarası zorunludur',
      dateRequired: 'Tarih zorunludur',
      startTimeRequired: 'Başlangıç saati zorunludur',
      difficultyRequired: 'Kurulum zorluğu seçimi zorunludur',
    },

    toasts: {
      created: 'Kurulum oluşturuldu',
      createFailed: 'Kurulum oluşturulamadı',
      maxCrew: 'En fazla 3 ekip üyesi atayabilirsiniz',
    },
  },






};

export default trCommon;
