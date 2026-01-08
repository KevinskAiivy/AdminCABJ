import { AppSettings, Socio, Consulado, Match, Team, Competition, Mensaje, AgendaEvent, Solicitud, TransferRequest, AppUser, UserSession, AppNotification } from '../types';

export interface IntegrityResult {
  table: string;
  status: 'OK' | 'MISSING' | 'EMPTY' | 'ERROR';
  message: string;
  latency: number;
}

export const ENTITY_SCHEMA = {
    MATCHES: { rival: 'rival', date: 'date', hour: 'hour', venue: 'venue', competition: 'competition' },
    TEAMS: { name: 'name', shortName: 'short_name', countryId: 'country_id' },
    COMPETITIONS: { name: 'name', organization: 'organization' },
    SOCIOS: { name: 'name', dni: 'dni', category: 'category' },
    CONSULADOS: { name: 'name', city: 'city', country: 'country' },
    AGENDA: { title: 'title', date: 'date' }
};

class DataService {
  public loadingMessage = "Cargando...";
  public isConnected = true;
  public connectionError: string | null = null;
  private listeners: (() => void)[] = [];

  private appSettings: AppSettings = {
    appName: 'Consulados CABJ',
    appDescription: 'Sistema de Gestión Oficial',
    primaryColor: '#003B94',
    secondaryColor: '#FCB131',
    isMaintenanceMode: false,
    maxUploadSize: 5, // Default 5MB
    enableAnimations: true,
    compactMode: false,
    sessionTimeout: 30, // 30 minutes
    enableNotifications: true,
    logoUrl: '',
    loginLogoUrl: '',
    matchLogoUrl: '',
    faviconUrl: '',
    transitionLogoUrl: ''
  };

  private matches: Match[] = [];
  private socios: Socio[] = [];
  private consulados: Consulado[] = [];
  private teams: Team[] = [];
  private competitions: Competition[] = [];
  private agenda: AgendaEvent[] = [];
  private mensajes: Mensaje[] = [];
  private users: AppUser[] = [];
  private transfers: TransferRequest[] = [];
  private solicitudes: Solicitud[] = [];
  private notifications: AppNotification[] = [];

  constructor() {
      // Initialize with some dummy data if empty
      const savedSettings = localStorage.getItem('cabj_settings');
      if (savedSettings) this.appSettings = JSON.parse(savedSettings);
      
      // Load or Mock Data
      this.consulados = [
          { id: '1', name: 'Consulado Madrid', city: 'Madrid', country: 'España', countryCode: 'ES', president: 'Juan Perez', referente: 'Maria', address: 'Calle Mayor 1', foundationYear: '2010-01-01', timezone: 'UTC+01:00 (Madrid/París)', logo: '', banner: '' }
      ];
      this.socios = [
          { id: '12345', firstName: 'Carlos', lastName: 'Tevez', name: 'Carlos Tevez', dni: '12345678', category: 'ACTIVO', status: 'AL DÍA', email: 'carlos@boca.com', phone: '+54 9 11 1234 5678', gender: 'M', birthDate: '05/02/1984', lastMonthPaid: '2023-12-01', joinDate: '01/01/2000', expirationDate: '', avatarColor: 'bg-blue-500', consulado: 'Consulado Madrid', role: 'SOCIO' }
      ];
      this.matches = [
          { id: 1, rival: 'River Plate', rivalShort: 'CARP', rivalCountry: 'AR', competition: 'Liga Profesional', date: '15/03/2026', hour: '17:00', venue: 'La Bombonera', city: 'Buenos Aires', isHome: true, fechaJornada: 'Fecha 7', isSuspended: false, aperturaDate: '10/03/2026', aperturaHour: '10:00', cierreDate: '14/03/2026', cierreHour: '20:00' }
      ];
      this.users = [
          { id: '1', username: 'admin', email: 'admin@boca.com', fullName: 'Super Admin', role: 'SUPERADMIN', active: true }
      ];
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public async initializeData(forceOffline: boolean = false) {
      if (forceOffline) {
          this.isConnected = true;
          this.loadingMessage = "Modo Offline activé";
          this.notify();
          return;
      }
      await new Promise(r => setTimeout(r, 800)); // Simulate latency
      this.isConnected = true;
      this.notify();
  }

  // --- Getters ---
  getAppSettings() { return this.appSettings; }
  getSocios(consuladoId?: string): Socio[] { 
      if (consuladoId) {
          const consulado = this.consulados.find(c => c.id === consuladoId);
          if (consulado) return this.socios.filter(s => s.consulado === consulado.name);
      }
      return this.socios; 
  }
  getConsulados(): Consulado[] { return this.consulados; }
  getConsuladoById(id: string) { return this.consulados.find(c => c.id === id); }
  getMatches(): Match[] { return this.matches; }
  getTeams(): Team[] { return this.teams; }
  getCompetitions(): Competition[] { return this.competitions; }
  getAgendaEvents(): AgendaEvent[] { return this.agenda; }
  getMensajes(consuladoId?: string): Mensaje[] { 
      if (!consuladoId || consuladoId === 'ALL') return this.mensajes;
      return this.mensajes.filter(m => m.targetConsuladoId === 'ALL' || m.targetConsuladoId === consuladoId || m.targetIds?.includes(consuladoId));
  }
  getBirthdays(consuladoName: string, days: number): Socio[] { return []; }
  getTransfers(consuladoId: string) { return { incoming: [], outgoing: [] }; }
  getSocioTransfers(socioId: string): TransferRequest[] { return this.transfers.filter(t => t.socioId === socioId); }
  getNotificationsForUser(user: UserSession): AppNotification[] { return this.notifications; }
  
  getSolicitudes(matchId: number, consuladoName?: string): Solicitud[] { 
      let reqs = this.solicitudes.filter(s => s.matchId === matchId);
      if (consuladoName) {
          reqs = reqs.filter(s => s.consulado === consuladoName);
      }
      return reqs;
  }
  
  getUsers(): AppUser[] { return this.users; }

  // --- Auth ---
  async authenticateUser(u: string, p: string): Promise<UserSession | null> {
      const user = this.users.find(usr => usr.username === u && usr.active);
      // In real app, verify password hash
      if (user) {
          // For demo, accept any password if user exists, or specific hardcoded
          return { role: user.role, name: user.fullName, email: user.email, consuladoId: user.consuladoId, gender: user.gender };
      }
      if(u === 'admin' && p === 'admin') return { role: 'SUPERADMIN', name: 'Super Admin' };
      return null;
  }

  // --- Actions ---
  saveAppSettings(s: AppSettings) {
      this.appSettings = s;
      localStorage.setItem('cabj_settings', JSON.stringify(s));
      this.notify();
  }

  // Consulados
  addConsulado(c: Consulado) { this.consulados.push(c); this.notify(); }
  updateConsulado(c: Consulado) { this.consulados = this.consulados.map(item => item.id === c.id ? c : item); this.notify(); }
  deleteConsulado(id: string) { this.consulados = this.consulados.filter(c => c.id !== id); this.notify(); }
  
  // Socios
  addSocio(s: Socio) { this.socios.push(s); this.notify(); }
  updateSocio(s: Socio) { this.socios = this.socios.map(item => item.id === s.id ? s : item); this.notify(); }
  deleteSocio(id: string) { this.socios = this.socios.filter(s => s.id !== id); this.notify(); }

  // Matches & Competitions
  addMatch(m: Match) { this.matches.push(m); this.notify(); }
  updateMatch(m: Match) { this.matches = this.matches.map(item => item.id === m.id ? m : item); this.notify(); }
  deleteMatch(id: number) { this.matches = this.matches.filter(m => m.id !== id); this.notify(); }

  addCompetition(c: Competition) { this.competitions.push(c); this.notify(); }
  updateCompetition(c: Competition) { this.competitions = this.competitions.map(item => item.id === c.id ? c : item); this.notify(); }
  deleteCompetition(id: string) { this.competitions = this.competitions.filter(c => c.id !== id); this.notify(); }

  addTeam(t: Team) { this.teams.push(t); this.notify(); }
  updateTeam(t: Team) { this.teams = this.teams.map(item => item.id === t.id ? t : item); this.notify(); }
  deleteTeam(id: string) { this.teams = this.teams.filter(t => t.id !== id); this.notify(); }

  // Agenda & Mensajes
  addAgendaEvent(e: AgendaEvent) { this.agenda.push(e); this.notify(); }
  updateAgendaEvent(e: AgendaEvent) { this.agenda = this.agenda.map(item => item.id === e.id ? e : item); this.notify(); }
  deleteAgendaEvent(id: string) { this.agenda = this.agenda.filter(e => e.id !== id); this.notify(); }

  addMensaje(m: Mensaje) { this.mensajes.push(m); this.notify(); }
  updateMensaje(m: Mensaje) { this.mensajes = this.mensajes.map(item => item.id === m.id ? m : item); this.notify(); }
  deleteMensaje(id: string) { this.mensajes = this.mensajes.filter(m => m.id !== id); this.notify(); }
  emptyTrash() { /* ... */ this.notify(); }

  // Users
  addUser(u: AppUser) { this.users.push(u); this.notify(); }
  updateUser(u: AppUser) { this.users = this.users.map(item => item.id === u.id ? u : item); this.notify(); }
  deleteUser(id: string) { this.users = this.users.filter(u => u.id !== id); this.notify(); }

  // Habilitaciones
  updateSolicitudStatus(id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLATION_REQUESTED') { 
      this.solicitudes = this.solicitudes.map(s => s.id === id ? { ...s, status } : s);
      this.notify();
  }
  
  createSolicitud(solicitud: Solicitud) {
      this.solicitudes.push(solicitud);
      this.notify();
      return Promise.resolve();
  }
  
  deleteNotification(id: string) { this.notifications = this.notifications.filter(n => n.id !== id); this.notify(); }
  markNotificationAsRead(id: string) { 
      this.notifications = this.notifications.map(n => n.id === id ? { ...n, read: true } : n);
      this.notify(); 
  }

  // Utils
  verifyDatabaseIntegrity(): Promise<IntegrityResult[]> { return Promise.resolve([{ table: 'socios', status: 'OK', message: 'OK', latency: 12 }]); }
  performMaintenance() { return Promise.resolve(); }
  factoryReset() { 
      localStorage.clear(); 
      this.consulados = []; this.socios = []; this.matches = []; // ... reset all
      this.notify();
      return Promise.resolve(); 
  }
  exportDatabase() { return JSON.stringify({ socios: this.socios, consulados: this.consulados }); }
  importDatabase(json: string) { return Promise.resolve(true); }
  
  // Mapping
  getMapping(entity: string) { return {}; }
  updateMapping(entity: string, map: any) { }
  resetMapping(entity: string) { }
  testMapping(entity: string) { return Promise.resolve({ raw: {}, mapped: {} }); }
  syncWithSupabase(force: boolean) { return Promise.resolve(); }
}

export const dataService = new DataService();