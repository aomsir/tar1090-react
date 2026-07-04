export const SUPPORTED_LANGUAGES = ['en', 'zh-CN'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export interface LanguageOption {
  id: SupportedLanguage;
  label: string;
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { id: 'en', label: 'English' },
  { id: 'zh-CN', label: '中文' },
] as const;

/**
 * Shared shape for the Settings subtree of translation resources.
 * Both `en` and `zh-CN` resources must satisfy this type so the
 * Settings panel keys stay in sync across languages.
 */
export interface SettingsResource {
  title: string;
  close: string;
  language: {
    title: string;
    english: string;
    chinese: string;
  };
  units: {
    title: string;
    aviation: string;
    metric: string;
    imperial: string;
  };
  scale: {
    title: string;
    labelScale: string;
    iconScale: string;
  };
  filters: {
    title: string;
    groundVehicles: string;
    nonIcaoTargets: string;
  };
  display: {
    title: string;
    coloredAircraft: string;
    coloredTracks: string;
  };
  resetAll: string;
}

export interface ToolbarResource {
  groups: {
    map: string;
    label: string;
    track: string;
    select: string;
    system: string;
    stats: string;
  };
  resetMapView: string;
  mapBrightness: string;
  fullscreenMode: string;
  aircraftLabels: string;
  extendedLabelDetails: string;
  trackPointLabels: string;
  showAllTracks: string;
  keepStaleAircraft: string;
  onlySelectedAircraft: string;
  multiSelectMode: string;
  onlyAircraftInView: string;
  onlyMilitaryAircraft: string;
  followSelectedAircraft: string;
  randomAircraft: string;
  openSettingsPanel: string;
  statisticsDashboard: string;
}

export interface ListResource {
  filters: {
    ariaLabel: string;
    all: string;
    airborne: string;
    ground: string;
    military: string;
  };
  inViewOnly: string;
  columnOptions: string;
  columns: string;
  flag: string;
  referenceOnly: string;
  emptyState: string;
  history: {
    maxSpeed: string;
    maxDistance: string;
  };
  values: {
    yes: string;
    no: string;
  };
  columnHeaders: {
    icao: string;
    callsign: string;
    route: string;
    registration: string;
    type: string;
    squawk: string;
    altitude: string;
    speed: string;
    verticalRate: string;
    distance: string;
    track: string;
    messages: string;
    seen: string;
    rssi: string;
    latitude: string;
    longitude: string;
    source: string;
    military: string;
    windDirection: string;
    wind: string;
    lastSeen: string;
  };
  dataSources: {
    other: string;
    unknown: string;
  };
  ground: string;
}

export interface DetailResource {
  close: string;
  loadingImage: string;
  military: string;
  exportKml: string;
  dragHandle: string;
  stats: {
    altitude: string;
    speed: string;
    track: string;
  };
  groups: {
    identity: string;
    flightStatus: string;
    position: string;
    navigation: string;
    environment: string;
    signalQuality: string;
  };
  fields: {
    icao: string;
    registration: string;
    typeCode: string;
    aircraftType: string;
    country: string;
    route: string;
    ias: string;
    tas: string;
    mach: string;
    verticalRate: string;
    squawk: string;
    latitude: string;
    longitude: string;
    messages: string;
    mcpAltitude: string;
    fmsAltitude: string;
    qnh: string;
    navigationHeading: string;
    windDirection: string;
    windSpeed: string;
    tat: string;
    oat: string;
    signalDelay: string;
    rssi: string;
  };
}

export interface ReplayResource {
  history: string;
  loadingHistory: string;
  pause: string;
  play: string;
  statisticsPanel: string;
  timeline: string;
  speed: string;
  timeRange: string;
  exitReplay: string;
  ranges: {
    '1d': string;
    '3d': string;
    '1w': string;
    '1m': string;
    unlimited: string;
  };
}

export interface StatsResource {
  title: string;
  close: string;
  aircraft: string;
  noData: string;
  pastLessThanMin: string;
  pastMinutes: string;
  pastHours: string;
  pastHoursMinutes: string;
  pastDays: string;
  pastDaysHours: string;
  summary: {
    totalAircraft: string;
    uniqueCallsigns: string;
    military: string;
    peakOnline: string;
    withCallsign: string;
    ofTotal: string;
  };
  charts: {
    trafficOverTime: string;
    altitudeDistribution: string;
    speedDistribution: string;
    distanceDistribution: string;
    typeDistribution: string;
    airlineDistribution: string;
    countryDistribution: string;
    dataSource: string;
  };
  categories: {
    ground: string;
    other: string;
  };
  otherMetrics: {
    identified: string;
    positioned: string;
    status: string;
    callsign: string;
    type: string;
    registration: string;
    position: string;
    speed: string;
    altitude: string;
    ground: string;
    emergency: string;
    squawk: string;
    noEmergency: string;
    emergencyCount: string;
  };
}

/**
 * Shared shape for auth-related copy used by the login page.
 */
export interface AuthResource {
  passwordPlaceholder: string;
  submit: string;
  error: {
    wrong: string;
    expired: string;
    network: string;
  };
}

/**
 * Minimal shared resource type covering keys introduced in Tasks 3-7.
 * Future tasks extend this as additional surfaces are translated.
 */
export interface TranslationResource {
  auth: AuthResource;
  settings: SettingsResource;
  toolbar: ToolbarResource;
  list: ListResource;
  detail: DetailResource;
  replay: ReplayResource;
  stats: StatsResource;
  app: AppResource;
  commandBar: CommandBarResource;
  altitudeLegend: AltitudeLegendResource;
}

export interface AppResource {
  loadingLiveHistory: string;
  loading: string;
}

export interface CommandBarResource {
  brand: string;
  searchAircraft: string;
  searchPlaceholder: string;
  aircraftCount: string;
  aircraftList: string;
  showAircraftList: string;
  msgRate: string;
}

export interface AltitudeLegendResource {
  ground: string;
}
