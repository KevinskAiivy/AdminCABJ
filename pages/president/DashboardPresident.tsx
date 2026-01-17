
import React, { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { Calendar, Mail, Cake, X, Bell, UserPlus, Trophy, Clock, MapPin, Star, ChevronRight, AlertTriangle, Ticket, Building2, Gift, ChevronLeft, RotateCcw, Users, Globe } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { Match, Mensaje, Socio, AgendaEvent } from '../../types';
import { NextMatchCard } from '../../components/NextMatchCard';

// Config pour les types d'événements
const EVENT_TYPE_CONFIG: Record<string, { label: string, icon: any, color: string, bg: string }> = {
    'EVENTO': { label: 'Institucional', icon: Building2, color: 'text-[#003B94]', bg: 'bg-gray-50' },
    'EFEMERIDE': { label: 'Efemérides', icon: Star, color: 'text-[#FCB131]', bg: 'bg-[#FFFBEB]' },
    'IDOLO': { label: 'Ídolos', icon: Trophy, color: 'text-blue-500', bg: 'bg-blue-50' },
    'INTERNACIONAL': { label: 'Internacional', icon: Globe, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    'ENCUENTRO': { label: 'Encuentros', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    'CUMPLEAÑOS': { label: 'Cumpleaños', icon: Gift, color: 'text-pink-500', bg: 'bg-pink-50' }
};

// Notification Interface
interface Notification {
    id: string;
    type: 'MESSAGE' | 'HABILITACION' | 'TRANSFER' | 'NEW_SOCIO';
    title: string;
    date: string;
    read: boolean;
}

// Fonction pour calculer l'âge à partir de la date de naissance
const calculateAge = (birthDate: string, targetDate: Date): number => {
  if (!birthDate) return 0;
  
  let birthDay: number, birthMonth: number, birthYear: number;
  
  if (birthDate.includes('/')) {
    const parts = birthDate.split('/').map(Number);
    birthDay = parts[0];
    birthMonth = parts[1];
    birthYear = parts[2];
  } else if (birthDate.includes('-')) {
    const parts = birthDate.split('-');
    if (parts[0].length === 4) {
      birthYear = parseInt(parts[0], 10);
      birthMonth = parseInt(parts[1], 10);
      birthDay = parseInt(parts[2], 10);
    } else {
      birthDay = parseInt(parts[0], 10);
      birthMonth = parseInt(parts[1], 10);
      birthYear = parseInt(parts[2], 10);
    }
  } else {
    return 0;
  }
  
  const targetYear = targetDate.getFullYear();
  let age = targetYear - birthYear;
  
  const targetMonth = targetDate.getMonth() + 1;
  const targetDay = targetDate.getDate();
  
  if (targetMonth < birthMonth || (targetMonth === birthMonth && targetDay < birthDay)) {
    age--;
  }
  
  return age;
};

export const DashboardPresident = ({ consulado_id }: { consulado_id: string }) => {
  const [nextMatch, setNextMatch] = useState<any>(null);
  const [messages, setMessages] = useState<Mensaje[]>([]);
  const [birthdays, setBirthdays] = useState<Socio[]>([]);
  const [generalEvents, setGeneralEvents] = useState<AgendaEvent[]>([]);
  const [consulado, setConsulado] = useState(dataService.getConsuladoById(consulado_id));
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [viewingMessage, setViewingMessage] = useState<Mensaje | null>(null);
  const [selectedDayDetails, setSelectedDayDetails] = useState<{ date: Date, birthdays: Socio[], agenda: AgendaEvent[] } | null>(null);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  
  // Calculate week start (Monday) based on weekOffset
  const getWeekStart = useCallback((offset: number) => {
    const today = new Date();
    const currentDay = today.getDay();
    const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysToMonday + (offset * 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, []);

  // Subscribe to dataService updates
  useEffect(() => {
    const updateDashboardData = () => {
        const c = dataService.getConsuladoById(consulado_id);
        setConsulado(c);
        
        const allMsgs = dataService.getMensajes(consulado_id);
        setMessages(allMsgs);
        
        // Fetch Birthdays
        if (c) setBirthdays(dataService.getBirthdays(c.name, 7));
        
        // Fetch Agenda
        setGeneralEvents(dataService.getAgendaEvents());

        // Notifications (Transfers)
        const currentTransfers = dataService.getTransfers(consulado_id);
        const newNotifs: Notification[] = [];
        currentTransfers.incoming.filter(t => t.status === 'PENDING').forEach(t => {
            newNotifs.push({ id: `notif-tr-${t.id}`, type: 'TRANSFER', title: `Traslado: ${t.socio_name}`, date: t.request_date, read: false });
        });
        setNotifications(newNotifs);

        // Next Match Logic - Trouver le vrai prochain match (le plus proche dans le futur)
        const allMatches = dataService.getMatches();
        const now = new Date();
        
        const upcomingMatches = allMatches
            .map((m) => {
                if (!m.date || !m.hour) return null;
                
                let dateObj: Date;
                // Parser la date selon son format
                if (m.date.includes('/')) {
                    // Format DD/MM/YYYY
                    const [d, M, y] = m.date.split('/').map(Number);
                    const [h, min] = m.hour.split(':').map(Number);
                    dateObj = new Date(y, M - 1, d, h || 0, min || 0);
                } else if (m.date.includes('-')) {
                    // Format YYYY-MM-DD (DB) ou DD-MM-YYYY
                    const parts = m.date.split('-');
                    if (parts[0].length === 4) {
                        // Format YYYY-MM-DD
                        const [y, M, d] = parts.map(Number);
                        const [h, min] = m.hour.split(':').map(Number);
                        dateObj = new Date(y, M - 1, d, h || 0, min || 0);
                    } else {
                        // Format DD-MM-YYYY
                        const [d, M, y] = parts.map(Number);
                        const [h, min] = m.hour.split(':').map(Number);
                        dateObj = new Date(y, M - 1, d, h || 0, min || 0);
                    }
                } else {
                    return null;
                }
                
                return { ...m, dateObj };
            })
            .filter((m): m is any => m !== null && m.dateObj > now)
            .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
        
        setNextMatch(upcomingMatches.length > 0 ? upcomingMatches[0] : null);
    };

    updateDashboardData();
    const unsubscribe = dataService.subscribe(updateDashboardData);
    return () => unsubscribe();
  }, [consulado_id]);

  // Calculer les 7 jours de la semaine basé sur weekOffset
  const weekStart = getWeekStart(weekOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  
  // Format dates for display
  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const currentMonth = monthNames[weekStart.getMonth()];
  const weekRange = `semana del ${weekStart.getDate()} al ${weekEnd.getDate()}`;

  const handlePrevWeek = () => setWeekOffset(prev => prev - 1);
  const handleNextWeek = () => setWeekOffset(prev => prev + 1);
  const handleTodayWeek = () => setWeekOffset(0);

  const getEventsForDate = (date: Date) => {
    const dateStr = `${date.getDate().toString().padStart(2,'0')}/${(date.getMonth()+1).toString().padStart(2,'0')}`;
    const isoDateStr = date.toISOString().split('T')[0];
    
    // Filtrer les anniversaires pour cette date (comparer DD/MM uniquement, ignorer l'année)
    const dayBirthdays = birthdays.filter(b => {
        if (!b.birth_date || b.birth_date.trim() === '') return false;
        
        // Extraire le jour et le mois de birth_date
        let birthDay: string, birthMonth: string;
        if (b.birth_date.includes('/')) {
            // Format DD/MM/YYYY
            const parts = b.birth_date.split('/');
            birthDay = parts[0].padStart(2, '0');
            birthMonth = parts[1].padStart(2, '0');
        } else if (b.birth_date.includes('-')) {
            // Format YYYY-MM-DD ou DD-MM-YYYY
            const parts = b.birth_date.split('-');
            if (parts[0].length === 4) {
                // Format YYYY-MM-DD
                birthMonth = parts[1].padStart(2, '0');
                birthDay = parts[2].padStart(2, '0');
            } else {
                // Format DD-MM-YYYY
                birthDay = parts[0].padStart(2, '0');
                birthMonth = parts[1].padStart(2, '0');
            }
        } else {
            return false;
        }
        
        return `${birthDay}/${birthMonth}` === dateStr;
    });
    
    return {
        dayBirthdays,
        dayAgenda: generalEvents.filter(e => e.date === isoDateStr)
    };
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 px-4 animate-boca-entrance">
        
        {/* Layout 2 colonnes: 75% / 25% */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Colonne principale (75%) - Prochain Match + Agenda */}
          <div className="w-full lg:w-3/4 space-y-6">
            {/* MATCH DAY HERO SECTION */}
            {nextMatch ? (
                <NextMatchCard 
                    match={nextMatch} 
                    userTimezone={consulado?.timezone}
                    userCountryCode={consulado?.country_code}
                />
            ) : (
                <div className="h-[200px] bg-[#001d4a] rounded-[2.5rem] flex flex-col items-center justify-center text-white/10 border border-white/5 shadow-xl">
                    <Calendar size={32} className="mb-4 opacity-5" />
                    <p className="oswald text-xl font-black uppercase tracking-widest">Sin partidos próximos</p>
                </div>
            )}

            {/* Notifications (si présentes) */}
            {notifications.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-2">
                        <Bell size={18} className="text-[#FCB131]" />
                        <h3 className="oswald text-xl font-black text-[#001d4a] uppercase tracking-tight">Notificaciones</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {notifications.map(n => (
                            <GlassCard key={n.id} className="p-4 flex items-start gap-4 border-l-4 border-l-[#FCB131] bg-white group relative hover:shadow-lg">
                                <button onClick={(e) => { e.stopPropagation(); setNotifications(prev => prev.filter(notif => notif.id !== n.id)); }} className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"><X size={12} /></button>
                                <div className={`mt-1 p-2.5 rounded-xl shrink-0 ${n.type === 'MESSAGE' ? 'bg-blue-50 text-blue-600' : n.type === 'HABILITACION' ? 'bg-amber-50 text-amber-600' : n.type === 'TRANSFER' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'}`}>
                                    {n.type === 'MESSAGE' ? <Mail size={16}/> : n.type === 'HABILITACION' ? <Ticket size={16}/> : n.type === 'TRANSFER' ? <AlertTriangle size={16}/> : <UserPlus size={16}/>}
                                </div>
                                <div className="pr-4">
                                    <h4 className="font-bold text-[#001d4a] text-xs uppercase leading-tight mb-1">{n.title}</h4>
                                    <span className="text-[9px] text-gray-400 font-bold flex items-center gap-1"><Clock size={10} /> {n.date}</span>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                </div>
            )}

            {/* AGENDA SEMANAL - VERSION HORIZONTALE */}
        <div className="space-y-4">
            {/* Header avec filtres améliorés */}
            <div className="bg-gradient-to-r from-[#003B94] to-[#001d4a] rounded-2xl p-4 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-xl">
                            <Calendar size={20} className="text-[#FCB131]" />
                        </div>
                        <div>
                            <h3 className="oswald text-xl font-black text-white uppercase tracking-tight">Agenda Semanal</h3>
                            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                                {currentMonth} • {weekRange}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handlePrevWeek}
                            className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                            title="Semana anterior"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button 
                            onClick={handleTodayWeek}
                            className="px-3 py-2 rounded-lg bg-[#FCB131] text-[#001d4a] hover:bg-[#FFD23F] transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
                            title="Semana actual"
                        >
                            <RotateCcw size={12} /> Hoy
                        </button>
                        <button 
                            onClick={handleNextWeek}
                            className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                            title="Semana siguiente"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Grille horizontale des jours */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {next7Days.map((date, idx) => {
                    const { dayBirthdays, dayAgenda } = getEventsForDate(date);
                    const hasEvents = dayBirthdays.length > 0 || dayAgenda.length > 0;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dateCompare = new Date(date);
                    dateCompare.setHours(0, 0, 0, 0);
                    const isToday = dateCompare.getTime() === today.getTime();
                    const isMatchDay = nextMatch && (() => {
                        try {
                            const matchDateStr = nextMatch.date;
                            let matchDate: Date;
                            if (matchDateStr.includes('/')) {
                                const [d, m, y] = matchDateStr.split('/').map(Number);
                                matchDate = new Date(y, m - 1, d);
                            } else {
                                matchDate = new Date(matchDateStr);
                            }
                            matchDate.setHours(0, 0, 0, 0);
                            return matchDate.getTime() === dateCompare.getTime();
                        } catch { return false; }
                    })();
                    
                    return (
                        <GlassCard 
                            key={idx} 
                            onClick={() => hasEvents && setSelectedDayDetails({ date, birthdays: dayBirthdays, agenda: dayAgenda })}
                            className={`p-3 transition-all group border-2 min-h-[140px] flex flex-col ${
                                isToday ? 'border-[#003B94] bg-[#003B94]/5 shadow-lg' : 
                                isMatchDay ? 'border-[#FCB131] bg-amber-50/50' : 
                                hasEvents ? 'border-gray-200 hover:border-[#003B94]/30 cursor-pointer hover:shadow-md' : 
                                'border-gray-100 bg-gray-50/50'
                            }`}
                        >
                            {/* Header du jour */}
                            <div className={`text-center pb-2 mb-2 border-b ${isToday ? 'border-[#003B94]/20' : 'border-gray-100'}`}>
                                <span className={`text-[9px] font-black uppercase tracking-widest block ${isToday ? 'text-[#003B94]' : 'text-gray-400'}`}>
                                    {date.toLocaleDateString('es-ES', { weekday: 'short' })}
                                </span>
                                <span className={`text-2xl font-black oswald leading-none ${isToday ? 'text-[#003B94]' : isMatchDay ? 'text-[#FCB131]' : 'text-[#001d4a]'}`}>
                                    {date.getDate()}
                                </span>
                                {isToday && (
                                    <span className="block text-[7px] font-black uppercase tracking-widest text-[#FCB131] mt-1 bg-[#003B94] rounded px-1 py-0.5 mx-auto w-fit">
                                        Hoy
                                    </span>
                                )}
                            </div>
                            
                            {/* Contenu */}
                            <div className="flex-1 space-y-1.5">
                                {isMatchDay && (
                                    <div className="flex items-center justify-between bg-[#FCB131]/20 px-2 py-1 rounded-lg">
                                        <span className="text-[7px] font-black text-[#001d4a] uppercase">Partido</span>
                                        <Trophy size={10} className="text-[#001d4a]" />
                                    </div>
                                )}
                                {dayBirthdays.length > 0 && (
                                    <div className="flex items-center justify-between bg-pink-50 px-2 py-1 rounded-lg border border-pink-100">
                                        <span className="text-[7px] font-black text-pink-600 uppercase">Cumple</span>
                                        <span className="text-[9px] font-bold text-pink-600 bg-pink-200 px-1.5 rounded-full">{dayBirthdays.length}</span>
                                    </div>
                                )}
                                {dayAgenda.length > 0 && (
                                    <div className="flex items-center justify-between bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                        <span className="text-[7px] font-black text-emerald-600 uppercase">Eventos</span>
                                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-200 px-1.5 rounded-full">{dayAgenda.length}</span>
                                    </div>
                                )}
                                {!hasEvents && !isMatchDay && (
                                    <div className="flex items-center justify-center h-full">
                                        <span className="text-[8px] text-gray-300 uppercase font-medium tracking-widest italic">Libre</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Indicateur cliquable */}
                            {hasEvents && (
                                <div className="mt-2 pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[8px] font-black text-[#003B94] uppercase tracking-widest flex items-center justify-center gap-1">
                                        Ver detalles <ChevronRight size={10} />
                                    </span>
                                </div>
                            )}
                        </GlassCard>
                    );
                })}
            </div>
          </div>
          {/* Fin Agenda */}
          </div>
          {/* Fin colonne principale */}

          {/* Colonne secondaire (25%) - Messages */}
          <div className="w-full lg:w-1/4">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden sticky top-24">
              {/* Header Messages */}
              <div className="bg-gradient-to-r from-[#003B94] to-[#001d4a] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-[#FCB131]" />
                    <h3 className="oswald text-sm font-black text-white uppercase tracking-tight">Mensajes</h3>
                  </div>
                  {messages.length > 0 && (
                    <span className="bg-[#FCB131] text-[#001d4a] text-[8px] font-black rounded-full px-2 py-0.5">
                      {messages.length}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Liste des messages */}
              <div className="max-h-[500px] overflow-y-auto">
                {messages.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {messages.slice(0, 8).map(msg => (
                      <div 
                        key={msg.id} 
                        onClick={() => setViewingMessage(msg)}
                        className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${msg.type === 'URGENTE' ? 'bg-amber-50/50 border-l-2 border-l-[#FCB131]' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[6px] font-black uppercase tracking-widest ${msg.type === 'URGENTE' ? 'bg-[#FCB131] text-[#001d4a]' : 'bg-blue-50 text-blue-600'}`}>
                            {msg.type === 'URGENTE' ? 'URG' : 'INFO'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[10px] font-black text-[#001d4a] uppercase truncate leading-tight">{msg.title}</h4>
                            <p className="text-[8px] text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">{msg.body}</p>
                            <span className="text-[7px] text-gray-400 font-bold mt-1 block">{msg.date}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Mail size={24} className="mx-auto mb-2 text-gray-200" />
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Sin mensajes</p>
                  </div>
                )}
              </div>
              
              {/* Footer - Ver todos */}
              {messages.length > 8 && (
                <div className="p-3 bg-gray-50 border-t border-gray-100">
                  <a 
                    href="#/admin/mensajes" 
                    className="block text-center text-[8px] font-black text-[#003B94] uppercase tracking-widest hover:text-[#FCB131] transition-colors"
                  >
                    Ver todos ({messages.length}) →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Fin layout 2 colonnes */}
        
        {/* Message Modal */}
        {viewingMessage && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#001d4a]/80 backdrop-blur-md animate-in fade-in duration-300" >
                <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-[0_50px_200px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95">
                    <div className="bg-[#003B94] p-4 text-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/10 rounded-xl"><Mail size={18} className="text-[#FCB131]" /></div>
                            <div>
                                <h2 className="oswald text-lg font-black uppercase tracking-tight leading-none mb-0.5">Comunicado Central</h2>
                                <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider">Emitido el {viewingMessage.date}</p>
                            </div>
                        </div>
                        <X onClick={() => setViewingMessage(null)} className="cursor-pointer opacity-40 hover:opacity-100 p-1.5 hover:bg-white/10 rounded-full transition-all shrink-0" size={20} />
                    </div>
                    <div className="p-5 overflow-y-auto custom-scrollbar max-h-[65vh] bg-white">
                        <div className="mb-4 pb-3 border-b border-gray-100">
                            <h3 className="oswald text-xl font-black text-[#001d4a] uppercase leading-tight">{viewingMessage.title}</h3>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap mb-5">
                            {viewingMessage.body}
                        </p>
                        <div className="flex justify-center pt-2">
                            <button onClick={() => setViewingMessage(null)} className="px-8 py-2.5 rounded-xl bg-[#001d4a] text-white text-[10px] font-black uppercase tracking-wider hover:bg-[#003B94] transition-all shadow-lg">Entendido</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Modal: Daily Details (Categorized Columns) */}
        {selectedDayDetails && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#001d4a]/80 backdrop-blur-md animate-in fade-in duration-300" >
                <div className="relative w-full max-w-5xl bg-white rounded-[2rem] shadow-[0_50px_200px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 max-h-[80vh]">
                    <div className="bg-[#003B94] p-6 text-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/10 rounded-2xl"><Calendar size={24} className="text-[#FCB131]" /></div>
                            <div>
                                <h2 className="oswald text-2xl font-black uppercase tracking-tight leading-none mb-1">
                                    {selectedDayDetails.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </h2>
                                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Resumen del Día</p>
                            </div>
                        </div>
                        <X onClick={() => setSelectedDayDetails(null)} className="cursor-pointer opacity-40 hover:opacity-100 p-2 hover:bg-white/10 rounded-full transition-all" size={32} />
                    </div>
                    
                    <div className="p-8 overflow-y-auto custom-scrollbar bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            
                            {/* Col 1: Institutional & Matches */}
                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 text-[#003B94] font-black uppercase text-sm tracking-widest border-b border-gray-100 pb-2">
                                    <Building2 size={16} /> Institucional & Eventos
                                </h4>
                                <div className="space-y-3">
                                    {/* Match handling handled by NextMatchCard logic mainly, but if we want it here: */}
                                    {nextMatch && new Date(nextMatch.date.split('/').reverse().join('-')).getDate() === selectedDayDetails.date.getDate() && (
                                        <div className="bg-[#001d4a] rounded-xl p-4 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy size={60} /></div>
                                            <div className="relative z-10">
                                                <span className="text-[#FCB131] text-[9px] font-black uppercase tracking-widest mb-1 block">Partido</span>
                                                <h3 className="oswald text-xl font-black uppercase leading-tight mb-2">vs {nextMatch.rival}</h3>
                                                <div className="flex items-center gap-3 text-[9px] font-bold text-white/60 uppercase">
                                                    <div className="flex items-center gap-1"><Clock size={10} className="text-[#FCB131]" /> {nextMatch.hour} HS</div>
                                                    <div className="flex items-center gap-1"><MapPin size={10} className="text-[#FCB131]" /> {nextMatch.venue}</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {selectedDayDetails.agenda.filter(e => e.type === 'EVENTO' || e.type === 'ENCUENTRO' || e.type === 'INTERNACIONAL').map(evt => (
                                        <div key={evt.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                            <h5 className="font-bold text-[#001d4a] uppercase text-xs">{evt.title}</h5>
                                            <p className="text-[10px] text-gray-500 mt-1">{evt.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Col 2: Birthdays (Socios from Consulado + Generic Birthdays) */}
                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 text-blue-500 font-black uppercase text-sm tracking-widest border-b border-gray-100 pb-2">
                                    <Cake size={16} /> Cumpleaños ({selectedDayDetails.birthdays.length})
                                </h4>
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {selectedDayDetails.birthdays.length > 0 ? selectedDayDetails.birthdays.map(socio => {
                                        const age = calculateAge(socio.birth_date, selectedDayDetails.date);
                                        return (
                                        <div key={socio.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 transition-colors">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-black">
                                                {socio.first_name[0]}{socio.last_name[0]}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[10px] font-bold text-[#001d4a] uppercase">{socio.name}</p>
                                                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">{socio.category}</p>
                                            </div>
                                            {age > 0 && (
                                                <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-pink-50 text-pink-600 border border-pink-200 shadow-sm whitespace-nowrap">
                                                    {age} años
                                                </span>
                                            )}
                                        </div>
                                        );
                                    }) : <p className="text-[10px] text-gray-400 italic">No hay cumpleaños de socios.</p>}
                                    
                                    {/* Also show generic birthday events from agenda if any */}
                                    {selectedDayDetails.agenda.filter(e => e.type === 'CUMPLEAÑOS').map(evt => (
                                        <div key={evt.id} className="flex items-center gap-3 p-2 rounded-lg bg-blue-50/50">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Gift size={12}/></div>
                                            <p className="text-[10px] font-bold text-[#001d4a] uppercase">{evt.title}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Col 3: Efemérides & Ídolos */}
                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 text-[#FCB131] font-black uppercase text-sm tracking-widest border-b border-gray-100 pb-2">
                                    <Star size={16} /> Historia & Ídolos
                                </h4>
                                <div className="space-y-3">
                                    {selectedDayDetails.agenda.filter(e => e.type === 'IDOLO' || e.type === 'EFEMERIDE').length > 0 ? (
                                        selectedDayDetails.agenda.filter(e => e.type === 'IDOLO' || e.type === 'EFEMERIDE').map(evt => (
                                            <div key={evt.id} className="p-4 rounded-xl bg-[#FFFBEB] border border-[#FCB131]/20">
                                                <span className="text-[8px] font-black text-[#FCB131] uppercase tracking-widest bg-[#001d4a] px-2 py-0.5 rounded mb-2 inline-block">
                                                    {evt.type}
                                                </span>
                                                <h5 className="font-bold text-[#001d4a] uppercase text-xs">{evt.title}</h5>
                                                <p className="text-[10px] text-gray-600 mt-1">{evt.description}</p>
                                            </div>
                                        ))
                                    ) : <p className="text-[10px] text-gray-400 italic">Sin efemérides.</p>}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default DashboardPresident;
