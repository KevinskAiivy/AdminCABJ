
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Calendar, Activity, Star, Trophy, X, MapPin, Gift, Building2, Users, Globe } from 'lucide-react';
import { dataService } from '../services/dataService';
import { AgendaEvent, Match } from '../types';
import { NextMatchCard } from '../components/NextMatchCard';

interface DaySummary {
    date: Date;
    events: AgendaEvent[];
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

        // 2. Load Next Match - Trouver le vrai prochain match (le plus proche dans le futur)
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

  const getEventCounts = (events: AgendaEvent[]) => {
      const counts: Record<string, number> = {};
      events.forEach(e => {
          let label = 'Eventos';
          if (e.type === 'IDOLO' || e.type === 'CUMPLEAÑOS') label = 'Celebración'; 
          else if (e.type === 'EFEMERIDE') label = 'Historia';
          else if (e.type === 'INTERNACIONAL') label = 'Global';
          else label = 'Institucional';
          
          counts[label] = (counts[label] || 0) + 1;
      });
      return counts;
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
                  const dateIso = date.toISOString().split('T')[0];
                  const dayEvents = weeklyEvents.filter(e => e.date === dateIso);
                  const counts = getEventCounts(dayEvents);
                  const isToday = idx === 0;
                  const hasEvents = dayEvents.length > 0;
                  
                  return (
                      <GlassCard 
                          key={idx} 
                          onClick={() => hasEvents && setSelectedDay({ date, events: dayEvents })}
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
                                      <div key={cat} className="flex items-center justify-between bg-[#003B94]/5 px-2 py-1.5 rounded-lg border border-[#003B94]/5">
                                          <span className="text-[7px] font-black text-[#001d4a] uppercase truncate max-w-[60px]">{cat}</span>
                                          <span className="text-[9px] font-bold text-[#003B94]">{count}</span>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300" style={{ paddingTop: 'calc(7rem + 1rem)', paddingBottom: '1rem' }}>
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

                          {selectedDay.events.length === 0 && (
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
