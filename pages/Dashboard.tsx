
import React, { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Calendar, Activity, Star, Trophy, X, MapPin, Gift, Building2, Users, Globe, Cake, ChevronLeft, ChevronRight, RotateCcw, Mail } from 'lucide-react';
import { dataService } from '../services/dataService';
import { AgendaEvent, Match, Socio, Mensaje } from '../types';
import { NextMatchCard } from '../components/NextMatchCard';
import { Link } from 'react-router-dom';

interface DaySummary {
    date: Date;
    events: AgendaEvent[];
    birthdays: Socio[];
}

// Config for Event Types
const EVENT_TYPE_CONFIG: Record<string, { label: string, icon: any, color: string, bg: string, border: string }> = {
    'EVENTO': { label: 'Institucional', icon: Building2, color: 'text-[#003B94]', bg: 'bg-gray-50', border: 'border-gray-100' },
    'EFEMERIDE': { label: 'Efemérides', icon: Star, color: 'text-[#FCB131]', bg: 'bg-[#FFFBEB]', border: 'border-[#FCB131]/20' },
    'IDOLO': { label: 'Ídolos', icon: Trophy, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
    'INTERNACIONAL': { label: 'Internacional', icon: Globe, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    'ENCUENTRO': { label: 'Encuentros', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    'CUMPLEAÑOS': { label: 'Cumpleaños', icon: Gift, color: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-100' }
};

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
      // Format YYYY-MM-DD
      birthYear = parseInt(parts[0], 10);
      birthMonth = parseInt(parts[1], 10);
      birthDay = parseInt(parts[2], 10);
    } else {
      // Format DD-MM-YYYY
      birthDay = parseInt(parts[0], 10);
      birthMonth = parseInt(parts[1], 10);
      birthYear = parseInt(parts[2], 10);
    }
  } else {
    return 0;
  }
  
  const targetYear = targetDate.getFullYear();
  let age = targetYear - birthYear;
  
  // Vérifier si l'anniversaire est déjà passé cette année
  const targetMonth = targetDate.getMonth() + 1;
  const targetDay = targetDate.getDate();
  
  if (targetMonth < birthMonth || (targetMonth === birthMonth && targetDay < birthDay)) {
    age--;
  }
  
  return age;
};

export const Dashboard = () => {
  const [weeklyEvents, setWeeklyEvents] = useState<AgendaEvent[]>([]);
  const [allBirthdays, setAllBirthdays] = useState<Socio[]>([]);
  const [nextMatch, setNextMatch] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<DaySummary | null>(null);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [messages, setMessages] = useState<Mensaje[]>([]);
  const [viewingMessage, setViewingMessage] = useState<Mensaje | null>(null);

  // Calculate week start (Monday) based on weekOffset
  const getWeekStart = useCallback((offset: number) => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay; // Monday = 0
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysToMonday + (offset * 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, []);

  useEffect(() => {
    const loadDashboardData = () => {
        // 1. Load Weekly Agenda
        const allEvents = dataService.getAgendaEvents();
        const weekStartDate = getWeekStart(weekOffset);
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekStartDate.getDate() + 6);
        
        const relevantEvents = allEvents.filter(e => {
            const evtDate = new Date(e.date);
            evtDate.setHours(0, 0, 0, 0);
            return evtDate >= weekStartDate && evtDate <= weekEndDate;
        }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        setWeeklyEvents(relevantEvents);
        
        // 2. Load All Socios Birthdays for the selected week
        const allSocios = dataService.getSocios();
        const weekStartStr = weekStartDate.toISOString().split('T')[0];
        const weekEndStr = weekEndDate.toISOString().split('T')[0];
        
        // Filter socios with birth_date in the selected week
        const upcomingBirthdays = allSocios.filter(socio => {
            if (!socio.birth_date || socio.birth_date.trim() === '') return false;
            
            // Parse birth_date (format can be DD/MM/YYYY or YYYY-MM-DD)
            let birthDay: number, birthMonth: number;
            if (socio.birth_date.includes('/')) {
                // Format DD/MM/YYYY
                const parts = socio.birth_date.split('/');
                birthDay = parseInt(parts[0], 10);
                birthMonth = parseInt(parts[1], 10);
            } else if (socio.birth_date.includes('-')) {
                // Format YYYY-MM-DD or DD-MM-YYYY
                const parts = socio.birth_date.split('-');
                if (parts[0].length === 4) {
                    // Format YYYY-MM-DD
                    birthMonth = parseInt(parts[1], 10);
                    birthDay = parseInt(parts[2], 10);
                } else {
                    // Format DD-MM-YYYY
                    birthDay = parseInt(parts[0], 10);
                    birthMonth = parseInt(parts[1], 10);
                }
            } else {
                return false;
            }
            
            // Check if this birthday falls in the selected week
            const currentYear = weekStartDate.getFullYear();
            const birthdayThisYear = new Date(currentYear, birthMonth - 1, birthDay);
            const birthdayNextYear = new Date(currentYear + 1, birthMonth - 1, birthDay);
            
            // Adjust if birthday has already passed this year
            const birthdayDate = birthdayThisYear < weekStartDate ? birthdayNextYear : birthdayThisYear;
            
            return birthdayDate >= weekStartDate && birthdayDate <= weekEndDate;
        });
        
        setAllBirthdays(upcomingBirthdays);

        // 3. Load Next Match - Trouver le vrai prochain match (le plus proche dans le futur)
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

        // 4. Load Messages
        const allMsgs = dataService.getMensajes()
            .filter(m => m.status === 'ACTIVE')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setMessages(allMsgs);
    };

    loadDashboardData();
    const unsubscribe = dataService.subscribe(loadDashboardData);
    return () => unsubscribe();
  }, [weekOffset, getWeekStart]);

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

  const getEventCounts = (events: AgendaEvent[], birthdays: Socio[] = []) => {
      const counts: Record<string, number> = {};
      events.forEach(e => {
          let label = 'Eventos';
          if (e.type === 'IDOLO' || e.type === 'CUMPLEAÑOS') label = 'Celebración'; 
          else if (e.type === 'EFEMERIDE') label = 'Historia';
          else if (e.type === 'INTERNACIONAL') label = 'Global';
          else label = 'Institucional';
          
          counts[label] = (counts[label] || 0) + 1;
      });
      if (birthdays.length > 0) {
          counts['Cumpleaños'] = birthdays.length;
      }
      return counts;
  };
  
  const getEventsForDate = (date: Date) => {
      const dateIso = date.toISOString().split('T')[0];
      const dateStr = `${date.getDate().toString().padStart(2,'0')}/${(date.getMonth()+1).toString().padStart(2,'0')}`;
      
      // Filter agenda events for this date
      const dayEvents = weeklyEvents.filter(e => e.date === dateIso);
      
      // Filter birthdays for this date (compare DD/MM only, ignore year)
      const dayBirthdays = allBirthdays.filter(socio => {
          if (!socio.birth_date || socio.birth_date.trim() === '') return false;
          
          // Extract day and month from birth_date
          let birthDay: string, birthMonth: string;
          if (socio.birth_date.includes('/')) {
              const parts = socio.birth_date.split('/');
              birthDay = parts[0].padStart(2, '0');
              birthMonth = parts[1].padStart(2, '0');
          } else if (socio.birth_date.includes('-')) {
              const parts = socio.birth_date.split('-');
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
      
      return { dayEvents, dayBirthdays };
  };

  const getGroupedEvents = (events: AgendaEvent[]) => {
      const grouped: Record<string, AgendaEvent[]> = {};
      events.forEach(evt => {
          const type = evt.type || 'EVENTO';
          if (!grouped[type]) grouped[type] = [];
          grouped[type].push(evt);
      });
      return grouped;
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 px-4 animate-boca-entrance">
      <style>{`
        @keyframes pan-zoom {
          0% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.1) translate(-2%, -2%); }
          100% { transform: scale(1) translate(0, 0); }
        }
        .animate-pan-zoom {
          animation: pan-zoom 20s ease-in-out infinite alternate;
        }
      `}</style>

      {/* Layout 2 colonnes: 75% / 25% */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Colonne principale (75%) - Prochain Match + Agenda */}
        <div className="w-full lg:w-3/4 space-y-6">
          {/* Next Match Section */}
          {nextMatch ? (
              <NextMatchCard match={nextMatch} />
          ) : (
              <div className="w-full min-h-[250px] bg-[#001d4a] rounded-[2.5rem] shadow-xl border border-white/5 flex flex-col items-center justify-center text-center p-8 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-10 grayscale group-hover:scale-105 transition-transform duration-700"></div>
                  <div className="relative z-10 flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-inner backdrop-blur-sm">
                          <Trophy size={32} className="text-white/20" />
                      </div>
                      <div>
                          <h3 className="oswald text-2xl font-black uppercase text-white/40 tracking-widest">Sin partidos programados</h3>
                          <p className="text-white/20 text-xs font-bold uppercase tracking-[0.2em] mt-2">El calendario está actualizado</p>
                      </div>
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
                  const { dayEvents, dayBirthdays } = getEventsForDate(date);
                  const hasEvents = dayEvents.length > 0 || dayBirthdays.length > 0;
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
                          onClick={() => hasEvents && setSelectedDay({ date, events: dayEvents, birthdays: dayBirthdays })}
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
                              {dayEvents.length > 0 && (
                                  <div className="flex items-center justify-between bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                      <span className="text-[7px] font-black text-emerald-600 uppercase">Eventos</span>
                                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-200 px-1.5 rounded-full">{dayEvents.length}</span>
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
                <Link 
                  to="/admin/mensajes" 
                  className="block text-center text-[8px] font-black text-[#003B94] uppercase tracking-widest hover:text-[#FCB131] transition-colors"
                >
                  Ver todos ({messages.length}) →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Fin layout 2 colonnes */}

      {/* Message Detail Modal */}
      {viewingMessage && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className={`p-5 ${viewingMessage.type === 'URGENTE' ? 'bg-gradient-to-r from-[#FCB131] to-amber-400' : 'bg-gradient-to-r from-[#003B94] to-[#001d4a]'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${viewingMessage.type === 'URGENTE' ? 'bg-[#001d4a]/20' : 'bg-white/10'}`}>
                    <Mail size={20} className={viewingMessage.type === 'URGENTE' ? 'text-[#001d4a]' : 'text-[#FCB131]'} />
                  </div>
                  <div>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${viewingMessage.type === 'URGENTE' ? 'text-[#001d4a]/60' : 'text-white/60'}`}>
                      {viewingMessage.type === 'URGENTE' ? 'Mensaje Urgente' : 'Mensaje Informativo'}
                    </span>
                    <h2 className={`oswald text-lg font-black uppercase tracking-tight ${viewingMessage.type === 'URGENTE' ? 'text-[#001d4a]' : 'text-white'}`}>
                      {viewingMessage.title}
                    </h2>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingMessage(null)}
                  className={`p-1.5 rounded-full transition-all ${viewingMessage.type === 'URGENTE' ? 'hover:bg-[#001d4a]/20 text-[#001d4a]' : 'hover:bg-white/20 text-white'}`}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{viewingMessage.body}</p>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{viewingMessage.date}</span>
                <button 
                  onClick={() => setViewingMessage(null)}
                  className="px-4 py-2 bg-[#003B94] text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#001d4a] transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300" >
              <div className="relative w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 max-h-[85vh]">
                  <div className="bg-[#003B94] p-6 text-white flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-white/10 rounded-2xl"><Calendar size={24} className="text-[#FCB131]" /></div>
                          <div>
                              <h2 className="oswald text-2xl font-black uppercase tracking-tight leading-none mb-1">
                                  {selectedDay.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                              </h2>
                              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Actividad del Día</p>
                          </div>
                      </div>
                      <X onClick={() => setSelectedDay(null)} className="cursor-pointer opacity-40 hover:opacity-100 p-2 hover:bg-white/10 rounded-full transition-all" size={32} />
                  </div>
                  
                  <div className="p-8 overflow-y-auto custom-scrollbar bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          
                          {/* Birthdays Section */}
                          {selectedDay.birthdays && selectedDay.birthdays.length > 0 && (
                              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                  <h4 className="flex items-center gap-2 text-blue-600 font-black uppercase text-sm tracking-widest border-b border-gray-100 pb-2">
                                      <Cake size={16} /> Cumpleaños ({selectedDay.birthdays.length})
                                  </h4>
                                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                      {selectedDay.birthdays.map(socio => {
                                          const age = calculateAge(socio.birth_date, selectedDay.date);
                                          return (
                                          <div key={socio.id} className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors">
                                              <div className="w-10 h-10 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-black shrink-0">
                                                  {socio.first_name?.[0]?.toUpperCase() || ''}{socio.last_name?.[0]?.toUpperCase() || ''}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                  <p className="text-[10px] font-bold text-[#001d4a] uppercase truncate">
                                                      {socio.last_name} {socio.first_name}
                                                  </p>
                                                  {socio.category && (
                                                      <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                                                          {socio.category}
                                                      </p>
                                                  )}
                                                  {socio.consulado && (
                                                      <p className="text-[8px] text-blue-600 font-bold uppercase tracking-wider mt-0.5">
                                                          {socio.consulado}
                                                      </p>
                                                  )}
                                              </div>
                                              {age > 0 && (
                                                  <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-pink-50 text-pink-600 border border-pink-200 shadow-sm whitespace-nowrap">
                                                      {age} años
                                                  </span>
                                              )}
                                          </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          )}
                          
                          {/* Dynamically Render Categories */}
                          {Object.entries(getGroupedEvents(selectedDay.events)).map(([type, events]) => {
                              const config = EVENT_TYPE_CONFIG[type] || EVENT_TYPE_CONFIG['EVENTO'];
                              const Icon = config.icon;
                              
                              return (
                                  <div key={type} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                      <h4 className={`flex items-center gap-2 ${config.color} font-black uppercase text-sm tracking-widest border-b border-gray-100 pb-2`}>
                                          <Icon size={16} /> {config.label}
                                      </h4>
                                      <div className="space-y-3">
                                          {events.map(evt => (
                                              <div key={evt.id} className={`p-4 rounded-xl border ${config.bg} ${config.border} hover:shadow-md transition-shadow`}>
                                                  <div className="flex items-start justify-between mb-2">
                                                      <span className={`text-[8px] font-black uppercase tracking-widest bg-white px-2 py-0.5 rounded border border-gray-100 shadow-sm ${config.color}`}>
                                                          {config.label}
                                                      </span>
                                                      {evt.is_special_day && <Star size={12} className="text-[#FCB131] fill-[#FCB131]" />}
                                                  </div>
                                                  <h5 className="font-bold text-[#001d4a] uppercase text-xs leading-tight mb-1">{evt.title}</h5>
                                                  {evt.description && <p className="text-[10px] text-gray-600 italic line-clamp-3">{evt.description}</p>}
                                                  {evt.location && (
                                                      <div className="flex items-center gap-1 text-[9px] font-bold text-[#003B94] mt-2 pt-2 border-t border-gray-200/50">
                                                          <MapPin size={10} /> {evt.location}
                                                      </div>
                                                  )}
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              );
                          })}

                          {selectedDay.events.length === 0 && (!selectedDay.birthdays || selectedDay.birthdays.length === 0) && (
                              <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-300">
                                  <Calendar size={48} className="mb-2 opacity-20" />
                                  <p className="text-xs font-bold uppercase tracking-widest">Sin eventos registrados</p>
                              </div>
                          )}

                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;
