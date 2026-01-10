
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Calendar, Activity, Star, Trophy, X, MapPin, Gift, Building2, Users, Globe, Cake } from 'lucide-react';
import { dataService } from '../services/dataService';
import { AgendaEvent, Match, Socio } from '../types';
import { NextMatchCard } from '../components/NextMatchCard';

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

export const Dashboard = () => {
  const [weeklyEvents, setWeeklyEvents] = useState<AgendaEvent[]>([]);
  const [allBirthdays, setAllBirthdays] = useState<Socio[]>([]);
  const [nextMatch, setNextMatch] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<DaySummary | null>(null);

  useEffect(() => {
    const loadDashboardData = () => {
        // 1. Load Weekly Agenda
        const allEvents = dataService.getAgendaEvents();
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        
        const relevantEvents = allEvents.filter(e => {
            const evtDate = new Date(e.date);
            return evtDate >= today && evtDate <= nextWeek;
        }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        setWeeklyEvents(relevantEvents);
        
        // 2. Load All Socios Birthdays for the next 7 days (Admin sees all socios)
        const allSocios = dataService.getSocios();
        const todayStr = today.toISOString().split('T')[0];
        const nextWeekStr = nextWeek.toISOString().split('T')[0];
        
        // Filter socios with birth_date in the next 7 days
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
            
            // Check if this birthday falls in the next 7 days
            const currentYear = today.getFullYear();
            const birthdayThisYear = new Date(currentYear, birthMonth - 1, birthDay);
            const birthdayNextYear = new Date(currentYear + 1, birthMonth - 1, birthDay);
            
            // Adjust if birthday has already passed this year
            const birthdayDate = birthdayThisYear < today ? birthdayNextYear : birthdayThisYear;
            
            return birthdayDate >= today && birthdayDate <= nextWeek;
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
    };

    loadDashboardData();
    const unsubscribe = dataService.subscribe(loadDashboardData);
    return () => unsubscribe();
  }, []);

  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

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
    <div className="max-w-7xl mx-auto space-y-8 pb-12 px-4 animate-boca-entrance">
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

      {/* AGENDA SEMANAL */}
      <div className="space-y-4">
          <div className="flex items-center gap-3 px-2">
              <Calendar size={18} className="text-[#003B94]" />
              <h3 className="oswald text-xl font-black text-[#001d4a] uppercase tracking-tight">Agenda Semanal</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
              {next7Days.map((date, idx) => {
                  const { dayEvents, dayBirthdays } = getEventsForDate(date);
                  const counts = getEventCounts(dayEvents, dayBirthdays);
                  const isToday = idx === 0;
                  const hasEvents = dayEvents.length > 0 || dayBirthdays.length > 0;
                  
                  return (
                      <GlassCard 
                          key={idx} 
                          onClick={() => hasEvents && setSelectedDay({ date, events: dayEvents, birthdays: dayBirthdays })}
                          className={`p-3 flex flex-col gap-2 min-h-[120px] transition-all group border ${
                              isToday 
                              ? 'border-[#FCB131] bg-gradient-to-b from-white to-amber-50 shadow-md' 
                              : 'border-transparent bg-white hover:border-[#003B94]/20'
                          } ${hasEvents ? 'cursor-pointer hover:translate-y-[-2px]' : ''}`}
                      >
                          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                              <span className={`text-[9px] font-black uppercase tracking-widest ${isToday ? 'text-[#001d4a]' : 'text-gray-400'}`}>
                                  {date.toLocaleDateString('es-ES', { weekday: 'short' })}
                              </span>
                              <span className={`text-xl font-black oswald leading-none ${isToday ? 'text-[#FCB131]' : 'text-[#003B94]'}`}>
                                  {date.getDate()}
                              </span>
                          </div>
                          
                          <div className="flex-1 flex flex-col gap-1.5 justify-center">
                              {hasEvents ? (
                                  Object.entries(counts).map(([cat, count]) => (
                                      <div key={cat} className={`flex items-center justify-between px-2 py-1.5 rounded-lg border ${
                                          cat === 'Cumpleaños' ? 'bg-blue-50 border-blue-100' : 'bg-[#003B94]/5 border-[#003B94]/5'
                                      }`}>
                                          <span className={`text-[7px] font-black uppercase truncate max-w-[60px] ${
                                              cat === 'Cumpleaños' ? 'text-blue-600' : 'text-[#001d4a]'
                                          }`}>{cat}</span>
                                          <span className={`text-[9px] font-bold ${
                                              cat === 'Cumpleaños' ? 'text-blue-600' : 'text-[#003B94]'
                                          }`}>{count}</span>
                                      </div>
                                  ))
                              ) : (
                                  <div className="flex-1 flex items-center justify-center">
                                      <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest italic">Sin eventos</span>
                                  </div>
                              )}
                          </div>
                      </GlassCard>
                  );
              })}
          </div>
      </div>

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
                                      {selectedDay.birthdays.map(socio => (
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
                                          </div>
                                      ))}
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
