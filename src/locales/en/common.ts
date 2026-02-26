// src/locales/en/common.ts
const enCommon = {
  appName: 'Kurulum Takip',

  nav: {
    dashboard: 'Dashboard',
    orders: 'Orders',
    installations: 'Installations',
    calendar: 'Calendar',
    reports: 'Reports',
    usersAndRoles: 'Users',
    integrations: 'Integrations',
    audit: 'Audit',

    crewHome: 'Home',
    crewJobs: 'Jobs',
    crewIssues: 'Issues',
    crewSettings: 'Settings',
  },

  settings: {
    title: 'Settings',
    subtitle: 'Configure your preferences.',
    languageSectionTitle: 'Language',
    languageSectionDescription: 'Choose the interface language.',
    english: 'English',
    turkish: 'Turkish',
  },

  common: {
    save: 'Save',
    cancel: 'Cancel',
    search: 'Search',
    searchPlaceholder: 'Search...',
  },

  commandPalette: {
    placeholder: 'Search or type a command…',
    noResults: 'No results',
    newOrder: 'New order',
    newInstallation: 'New installation',
    profile: 'Your profile',
    settings: 'Settings',
    signOut: 'Sign out',
    helpCentre: 'Help centre',
    keyboardShortcuts: 'Keyboard shortcuts',
  },

  pages: {
    adminDashboard: 'Dashboard',
    installations: 'Installations',
  },

  roles: {
  admin: 'Administrator',
  storeManager: 'Store Manager',
  crew: 'Installation Crew',
},
  header: {
  openUserMenu: 'Open user menu',
  yourProfile: 'Your Profile',
  settings: 'Settings',
  signOut: 'Sign out',
},

adminDashboard: {
  subtitle: 'Overview of your furniture installation operations',
  loading: 'Loading live data…',
  loadError: 'Failed to load some data from the API.',
  storeLabel: 'Store',
  allStores: 'All Stores',

  monthlyTitle: 'Monthly Installations',
  weeklyTitle: 'Weekly Installations',
  successfulInstallations: 'successful installations',
  of: 'of',
  vsLastMonth: 'vs last month',
  vsLastWeek: 'vs last week',
  changeVsLastMonth: 'Change vs last month (percentage)',
  changeVsLastWeek: 'Change vs last week (percentage)',

  recentActivityTitle: 'Recent Activity',
  recentActivityDescription:
    'Latest updates from your installation operations (live audit logs)',
  noRecentActivity: 'No recent activity for this filter.',

  quickViewOrdersTitle: 'View Orders',
  quickViewOrdersSubtitle: 'Manage and track orders',
  quickViewInstallationsTitle: 'View Installations',
  quickViewInstallationsSubtitle: 'Manage all installations',
  quickManageUsersTitle: 'Manage Users',
  quickManageUsersSubtitle: 'Add and edit users',
  quickViewReportsTitle: 'View Reports',
  quickViewReportsSubtitle: 'Analytics and insights',
},

  usersPage: {
    title: 'Users',
    subtitle: 'Manage user access',

    refresh: 'Refresh',
    newUserButton: 'New User',

    searchPlaceholder: 'Search by name, email, phone, id…',

    filters: {
      allRoles: 'All roles',
      allStatuses: 'All statuses',
    },

    status: {
      active: 'Active',
      disabled: 'Disabled',
    },

    table: {
      name: 'Name',
      email: 'Email',
      role: 'Role',
      status: 'Status',
      actions: 'Actions',
    },

    actions: {
      edit: 'Edit',
      disable: 'Disable',
      activate: 'Activate',
      create: 'Create',
      saveChanges: 'Save changes',
    },

    noUsers: 'No users found.',
    loading: 'Loading users…',
    loadError: 'Failed to load users.',

    toasts: {
      userCreated: 'User created',
      createFailed: 'Failed to create user',
      userUpdated: 'User updated',
      updateFailed: 'Failed to update user',
    },

    validation: {
      missingRequired:
        'Name, email, password and role are required',
    },

    create: {
      title: 'New User',
      subtitle: 'Create a new account',
    },

    edit: {
      title: 'Edit User',
      subtitle: 'Update account settings',
    },

    form: {
      fullName: 'Full name',
      email: 'Email',
      phoneOptional: 'Phone (optional)',
      initialPassword: 'Initial password',
      selectRolePlaceholder: 'Select role…',
    },
  },
  
   audit: {
    title: 'Audit Logs',
    subtitle: 'Real logs from backend.',

    filters: {
      searchPlaceholder: 'Search id, action, entity, ip...',
      actorPlaceholder: 'Actor ID',
      entityPlaceholder: 'Entity (User, Order, Installation...)',
      dateTo: 'to',
    },

    table: {
      timestamp: 'Timestamp',
      actor: 'Actor',
      action: 'Action',
      entity: 'Entity',
      entityId: 'Entity ID',
      ip: 'IP',
      payload: 'Payload',
      noLogs: 'No audit logs found.',
    },

    buttons: {
      refresh: 'Refresh',
      viewJson: 'View JSON',
      copyJson: 'Copy JSON',
      close: 'Close',
    },

    pagination: {
      page: 'Page',
      of: ' / ',
    },

    drawer: {
      payload: 'Payload',
      actor: 'Actor',
      ip: 'IP',
    },
  },

  reportsPage: {
  title: 'Reports',
  filtersTitle: 'Filters',
  startLabel: 'Start',
  endLabel: 'End',
  cityLabel: 'City',
  storeLabel: 'Store',
  allStores: 'All Stores',

  installationsTitle: 'Installations',
  totalSuccessfulLabel: 'Total Successful Installations',
  successRateLabel: 'Success rate',

  difficultyTitle: 'Installation Difficulty Total',
  easyLabel: 'Easy',
  intermediateLabel: 'Intermediate',
  hardLabel: 'Hard',

  serviceAfterTitle: 'Service After Installation',
  serviceAfterDescription: 'Total Installations / With Service After Installation',

  showing: 'Showing',
  item: 'item',
  items: 'items',
  for: 'for',
  selectedStoreSuffix: '• selected store',
  between: 'between',
  and: 'and',

  noInstallations: 'No installations match the selected filters.',

  viewInstallation: 'View Installation',
  viewInstallationTooltip: 'Go to Installation Detail',

  debugCurrentParams: 'Current params →',
},

calendarPage: {
  prev: 'Previous',
  next: 'Next',
  weekView: 'Week View',
  storeLabelShort: 'Store',

  monthly: 'Monthly',
  month: 'Month',
  weekly: 'Weekly',
  week: 'Week',

  refresh: 'Refresh',
  jumpToThisMonth: 'Jump to this month',
  today: 'Today',
  createInstallation: 'Create Installation',

  legend: {
    completed: 'Completed',
    acceptedPendingScheduled: 'Accepted / Pending / Scheduled',
    failedCanceled: 'Failed / Canceled',
    inProgress: 'In Progress',
  },

  weekdays: {
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    sun: 'Sun',
  },

  more: 'more…',

  loadingInstallations: 'Loading installations…',
  failedToLoadInstallations: 'Failed to load installations.',
  noInstallationsThisMonth: 'No installations in this month.',
  noInstallationsThisWeek: 'No installations in this week.',

  timeColumn: 'Time',
},

installationsPage: {
  title: 'Installations',
  subtitle: 'Schedule status and progress for upcoming jobs.',
  createButton: 'Create installation',

  filters: {
    searchLabel: 'Search',
    searchPlaceholder:
      'Installation ID, external order ID, store, address…',
    statusLabel: 'Status',
    status: {
      all: 'All',
      pending: 'Pending',
      staged: 'Staged',
      in_progress: 'In progress',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled',
    },
    zoneLabel: 'Zone (city)',
    allZones: 'All zones',
    from: 'From',
    to: 'To',
  },

  chips: {
    all: 'All',
    pending: 'Pending',
    staged: 'Staged',
    in_progress: 'In progress',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  },

  table: {
    start: 'Start',
    installation: 'Installation',
    store: 'Store',
    zone: 'Zone',
    status: 'Status',
    crew: 'Crew',
    idPrefix: 'ID:',
  },

  statusLabels: {
    pending: 'Pending',
    staged: 'Staged',
    in_progress: 'In progress',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  },

  crew: {
    assigned: 'assigned',
  },

  actions: {
    view: 'View',
  },

  loading: 'Loading installations…',
  loadError: 'Failed to load installations.',
  noResults: 'No installations match the filters.',

  pagination: {
    showing: 'Showing',
    of: 'of',
    prev: 'Prev',
    next: 'Next',
    page: 'Page',
  },

  sort: 'Sort',
},

ordersPage: {
  title: "Orders",
  subtitle: "Read-only list imported from external system.",

  filters: {
    searchLabel: "Search",
    searchPlaceholder: "Order ID, customer, store…",

    statusLabel: "Status",
    status: {
      all: "All",
      pending: "Pending",
      confirmed: "Confirmed",
      cancelled: "Cancelled",
    },

    storeLabel: "Store",
    storeAll: "All stores",

    from: "From",
    to: "To",
  },

  table: {
    placed: "Placed",
    order: "Order",
    customer: "Customer",
    store: "Store",
    items: "Items",
    status: "Status",
  },

  status: {
    pending: "Pending",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
  },

  loading: "Loading orders…",
  noResults: "No orders match the filters.",

  actions: {
    view: "View",
  },

  pagination: {
    showing: "Showing",
    of: "of",
    prev: "Prev",
    next: "Next",
    page: "Page",
  },
},

installationDetailPage: {
  header: {
    title: 'Installation',
    subtitle: 'Detailed overview',
  },

  buttons: {
    openCalendar: 'Open Calendar',
    viewOrder: 'View Order',
  },

  statusCard: {
    title: 'Status',
    subtitle: 'State & schedule',
    store: 'Store:',
    start: 'Start:',
    end: 'End:',
  },

  crewCard: {
    title: 'Crew',
    subtitle: 'Assigned team',
    none: 'No crew assigned.',
    status: {
      accepted: 'Accepted',
      declined: 'Declined',
      pending: 'Pending',
    },
    memberFallback: 'Crew Member',
    roleFallback: 'Crew',
  },

  notesCard: {
    title: 'Notes',
    subtitle: 'Special instructions',
    none: 'No notes.',
  },

  itemsCard: {
    title: 'Items',
    subtitle: 'Order items scoped to this installation',
    table: {
      product: 'Product',
      room: 'Room',
      instructions: 'Instructions',
    },
    none: 'No installation items.',
  },

  loading: 'Loading installation…',
  loadError: 'Failed to load installation.',
},

profilePage: {
  header: {
    title: 'Your Profile',
    subtitle: 'View your account details and role permissions in InstallOps.',
  },

  error: {
    title: "Couldn't load your profile",
  },

  accountCard: {
    title: 'Account details',
    fields: {
      userId: 'User ID',
      role: 'Role',
      roleId: 'Role ID',
      email: 'Email',
    },
  },

  permissionsCard: {
    title: 'Permissions',
    noPermissions: 'No explicit permissions were returned for this role.',
  },

  roleLabels: {
    admin: 'Administrator',
    storeManager: 'Store Manager',
    crew: 'Installation Crew',
  },
},

  createInstallationPage: {
    header: {
      title: 'Create Installation',
      subtitle: 'Schedule a new installation for an order',
    },

    store: {
      title: 'Store',
      subtitle: 'Select the store where this installation belongs',
      loading: 'Loading stores…',
      usingAssigned: 'Using your assigned store',
      selectPlaceholder: 'Select store',
      loadError:
        'Failed to load stores. You may not be able to create installations.',
    },

    order: {
      title: 'Order',
      subtitle:
        'Type the external order ID exactly as it appears in the store system (no lookup, manual entry).',
      externalIdLabel: 'External Order ID',
      externalIdPlaceholder: 'e.g. 1234, 2025-0001, POS-ABC-999…',
    },

    schedule: {
      title: 'Schedule',
      dateLabel: 'Date',
      timeLabel: 'Start time',
    },

    zone: {
      title: 'Zone',
      subtitle: 'Select the TRNC zone',
      selectPlaceholder: 'Select zone',
    },

    difficulty: {
      title: 'Installation Difficulty',
      subtitle: 'Select one option',
      options: {
        easy: 'Easy',
        intermediate: 'Intermediate',
        hard: 'Hard',
      },
      selected: 'Selected:',
      noneSelected: 'No difficulty selected.',
    },

    notes: {
      title: 'Notes',
      subtitle: 'Special instructions for the crew',
      placeholder:
        'e.g., call customer before arrival, fragile items, building access notes…',
    },

    crew: {
      title: 'Assign Crew',
      subtitle: 'Select up to 3 crew members',
      loading: 'Loading crew…',
      loadError: 'Failed to load crew.',
      maxTooltip: 'Maximum 3 members',
      noneSelected: 'No crew selected yet.',
      removeAria: 'Remove {{name}}',
      removeTitle: 'Remove',
    },

    actions: {
      title: 'Actions',
      subtitle: 'Save and schedule',
      scheduling: 'Scheduling…',
      submit: 'Create Installation',
      hint:
        'Select store, enter external order ID, date, time and difficulty to enable.',
    },

    validation: {
      storeRequired: 'Store is required',
      externalOrderIdRequired: 'External order ID is required',
      dateRequired: 'Date is required',
      startTimeRequired: 'Start time is required',
      difficultyRequired: 'Installation difficulty is required',
    },

    toasts: {
      created: 'Installation created',
      createFailed: 'Failed to create installation',
      maxCrew: 'You can assign up to 3 crew members',
    },
  },


};

export default enCommon;
