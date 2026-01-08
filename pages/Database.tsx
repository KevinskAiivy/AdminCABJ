
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GlassCard } from '../components/GlassCard';
import { 
  Database as DatabaseIcon, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Activity, Server, HardDrive, 
  Users, MapPin, Calendar, MessageSquare, ShieldCheck, Trophy, Clock, Loader2, 
  Trash2, Download, Settings, Eye, EyeOff, FileText, TrendingUp, 
  AlertCircle
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { IntegrityResult } from '../services/dataService';
import { supabase } from '../lib/supabase';

interface TableInfo {
  name: string;
  count: number;
  lastUpdate: string;
  status: 'OK' | 'ERROR' | 'EMPTY';
  icon: React.ReactNode;
  color: string;
}

interface LogEntry {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  timestamp: Date;
}

const TABLE_CONFIG = [
  { name: 'socios', icon: Users, color: 'blue', label: 'Socios' },
  { name: 'consulados', icon: MapPin, color: 'green', label: 'Consulados' },
  { name: 'matches', icon: Calendar, color: 'purple', label: 'Partidos' },
  { name: 'teams', icon: ShieldCheck, color: 'orange', label: 'Equipos' },
  { name: 'competitions', icon: Trophy, color: 'yellow', label: 'Torneos' },
  { name: 'agenda', icon: Clock, color: 'pink', label: 'Agenda' },
  { name: 'mensajes', icon: MessageSquare, color: 'indigo', label: 'Mensajes' },
  { name: 'users', icon: Users, color: 'teal', label: 'Usuarios' }
] as const;

export const Database = () => {
  const [isConnected, setIsConnected] = useState(dataService.isConnected);
  const [connectionError, setConnectionError] = useState(dataService.connectionError);
  const [loadingMessage, setLoadingMessage] = useState(dataService.loadingMessage);
  const [integrityResults, setIntegrityResults] = useState<IntegrityResult[]>([]);
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isPerformingMaintenance, setIsPerformingMaintenance] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tables' | 'actions' | 'logs'>('overview');
  const [showDetails, setShowDetails] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const [stats, setStats] = useState({
    socios: 0,
    consulados: 0,
    matches: 0,
    teams: 0,
    competitions: 0,
    agenda: 0,
    mensajes: 0,
    users: 0
  });

  // Add log entry
  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      type,
      message,
      timestamp: new Date()
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50)); // Keep last 50 logs
  }, []);

  // Update status function
  const updateStatus = useCallback(() => {
    setIsConnected(dataService.isConnected);
    setConnectionError(dataService.connectionError);
    setLoadingMessage(dataService.loadingMessage);
    
    const newStats = {
      socios: dataService.getSocios().length,
      consulados: dataService.getConsulados().length,
      matches: dataService.getMatches().length,
      teams: dataService.getTeams().length,
      competitions: dataService.getCompetitions().length,
      agenda: dataService.getAgendaEvents().length,
      mensajes: dataService.getMensajes().length,
      users: dataService.getUsers().length
    };
    
    setStats(newStats);
    setLastUpdate(new Date());
  }, []);

  // Memoized table details
  const tableDetails = useMemo<TableInfo[]>(() => {
    const now = new Date().toLocaleTimeString();
    return TABLE_CONFIG.map(config => {
      const Icon = config.icon;
      const count = stats[config.name as keyof typeof stats] || 0;
      return {
        name: config.name,
        count,
        lastUpdate: now,
        status: count > 0 ? 'OK' : 'EMPTY',
        icon: <Icon size={16} />,
        color: config.color
      };
    });
  }, [stats]);

  useEffect(() => {
    updateStatus();
    const unsubscribe = dataService.subscribe(updateStatus);
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(updateStatus, 30000);
    
    // Initial log
    addLog('info', 'Page Database initialisée');
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [updateStatus, addLog]);

  const handleCheckIntegrity = useCallback(async () => {
    setIsCheckingIntegrity(true);
    addLog('info', 'Début de la vérification d\'intégrité');
    
    try {
      const tables = TABLE_CONFIG.map(t => t.name);
      
      // Use Promise.all for parallel checks (optimized)
      const results = await Promise.all(
        tables.map(async (table): Promise<IntegrityResult> => {
          const startTime = Date.now();
          try {
            const { error, count } = await supabase
              .from(table)
              .select('*', { count: 'exact', head: true });
            
            const latency = Date.now() - startTime;
            
            if (error) {
              addLog('error', `Erreur table ${table}: ${error.message}`);
              return { table, status: 'ERROR', message: error.message, latency };
            }
            
            if (count === 0) {
              return { table, status: 'EMPTY', message: 'Table vide', latency };
            }
            
            return { table, status: 'OK', message: `${count} enregistrements`, latency };
          } catch (error: any) {
            const latency = Date.now() - startTime;
            const errorMsg = error.message || 'Erreur de connexion';
            addLog('error', `Erreur table ${table}: ${errorMsg}`);
            return { table, status: 'ERROR', message: errorMsg, latency };
          }
        })
      );
      
      setIntegrityResults(results);
      addLog('success', `Vérification d'intégrité terminée: ${results.filter(r => r.status === 'OK').length}/${results.length} tables OK`);
    } catch (error: any) {
      console.error('Error checking integrity:', error);
      addLog('error', `Erreur lors de la vérification: ${error.message}`);
    } finally {
      setIsCheckingIntegrity(false);
    }
  }, [addLog]);

  const handleReconnect = useCallback(async () => {
    setIsReconnecting(true);
    addLog('info', 'Tentative de reconnexion à Supabase...');
    
    try {
      await dataService.initializeData(false);
      setIsConnected(dataService.isConnected);
      setConnectionError(dataService.connectionError);
      setLastUpdate(new Date());
      
      if (dataService.isConnected) {
        addLog('success', 'Reconnexion réussie');
      } else {
        addLog('error', `Échec de la reconnexion: ${dataService.connectionError || 'Erreur inconnue'}`);
      }
    } catch (error: any) {
      console.error('Reconnection error:', error);
      addLog('error', `Erreur de reconnexion: ${error.message}`);
    } finally {
      setIsReconnecting(false);
    }
  }, [addLog]);

  const handleMaintenance = useCallback(async () => {
    if (!confirm('Êtes-vous sûr de vouloir effectuer une maintenance de la base de données ? Cette opération peut prendre plusieurs minutes.')) {
      return;
    }
    
    setIsPerformingMaintenance(true);
    addLog('info', 'Début de la maintenance de la base de données');
    
    try {
      await dataService.performMaintenance();
      await handleCheckIntegrity();
      addLog('success', 'Maintenance effectuée avec succès');
      alert('Maintenance effectuée avec succès');
    } catch (error: any) {
      const errorMsg = error.message || 'Erreur inconnue';
      addLog('error', `Erreur lors de la maintenance: ${errorMsg}`);
      alert(`Erreur lors de la maintenance: ${errorMsg}`);
    } finally {
      setIsPerformingMaintenance(false);
    }
  }, [handleCheckIntegrity, addLog]);

  const handleClearCache = useCallback(() => {
    if (!confirm('Voulez-vous vider le cache local ? Toutes les données en cache seront supprimées.')) {
      return;
    }
    addLog('warning', 'Vidage du cache local...');
    localStorage.removeItem('cabj_settings');
    window.location.reload();
  }, [addLog]);

  const handleExportData = useCallback(async () => {
    try {
      addLog('info', 'Export des données en cours...');
      
      const data = {
        socios: dataService.getSocios(),
        consulados: dataService.getConsulados(),
        matches: dataService.getMatches(),
        teams: dataService.getTeams(),
        competitions: dataService.getCompetitions(),
        agenda: dataService.getAgendaEvents(),
        mensajes: dataService.getMensajes(),
        users: dataService.getUsers(),
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addLog('success', 'Export des données réussi');
    } catch (error: any) {
      const errorMsg = error.message || 'Erreur inconnue';
      addLog('error', `Erreur lors de l'export: ${errorMsg}`);
      alert(`Erreur lors de l'export: ${errorMsg}`);
    }
  }, [addLog]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'OK': return 'text-green-600 bg-green-50 border-green-200';
      case 'ERROR': return 'text-red-600 bg-red-50 border-red-200';
      case 'EMPTY': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'OK': return <CheckCircle2 size={16} className="text-green-600" />;
      case 'ERROR': return <XCircle size={16} className="text-red-600" />;
      case 'EMPTY': return <AlertTriangle size={16} className="text-yellow-600" />;
      default: return <AlertCircle size={16} className="text-gray-600" />;
    }
  }, []);

  const getColorClasses = useCallback((color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      purple: 'bg-purple-50 text-purple-600',
      orange: 'bg-orange-50 text-orange-600',
      yellow: 'bg-yellow-50 text-yellow-600',
      pink: 'bg-pink-50 text-pink-600',
      indigo: 'bg-indigo-50 text-indigo-600',
      teal: 'bg-teal-50 text-teal-600'
    };
    return colors[color] || 'bg-gray-50 text-gray-600';
  }, []);

  const getLogIcon = useCallback((type: LogEntry['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={16} className="text-green-600" />;
      case 'error': return <XCircle size={16} className="text-red-600" />;
      case 'warning': return <AlertTriangle size={16} className="text-yellow-600" />;
      default: return <AlertCircle size={16} className="text-blue-600" />;
    }
  }, []);

  const getLogBgColor = useCallback((type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'bg-green-50';
      case 'error': return 'bg-red-50';
      case 'warning': return 'bg-yellow-50';
      default: return 'bg-blue-50';
    }
  }, []);

  const totalRecords = useMemo(() => Object.values(stats).reduce((sum, val) => sum + val, 0), [stats]);

  // Update logs when connection status changes
  useEffect(() => {
    if (connectionError) {
      addLog('error', `Erreur de connexion: ${connectionError}`);
    }
  }, [connectionError, addLog]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 animate-boca-entrance">
      {/* Header */}
      <div className="liquid-glass-dark p-8 rounded-[2rem] shadow-2xl relative overflow-hidden mx-4">
        <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
          <DatabaseIcon size={300} className="text-white" />
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-5">
              <div className={`p-4 rounded-2xl border-2 transition-all ${isConnected ? 'bg-green-500/20 border-green-500/50' : 'bg-red-500/20 border-red-500/50'}`}>
                <DatabaseIcon size={32} className={isConnected ? 'text-green-400' : 'text-red-400'} />
              </div>
              <div>
                <h1 className="oswald text-3xl font-black text-white uppercase tracking-tighter mb-1">
                  Gestion de Base de Données
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-all ${isConnected ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                    {isConnected ? 'Connecté' : 'Déconnecté'}
                  </span>
                  {loadingMessage && (
                    <span className="text-white/60 text-[10px] font-bold uppercase tracking-wide flex items-center gap-2">
                      <Loader2 size={12} className="animate-spin" />
                      {loadingMessage}
                    </span>
                  )}
                  <span className="text-white/40 text-[9px] font-bold">
                    Dernière mise à jour: {lastUpdate.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleReconnect}
                disabled={isReconnecting}
                className="bg-[#FCB131] text-[#001d4a] px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2 hover:bg-[#FFD23F] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReconnecting ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Reconnecter
              </button>
              <button
                onClick={handleCheckIntegrity}
                disabled={isCheckingIntegrity}
                className="bg-white/10 text-white border border-white/20 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-white/20 transition-all disabled:opacity-50"
              >
                {isCheckingIntegrity ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
                Vérifier Intégrité
              </button>
            </div>
          </div>

          {connectionError && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-red-300 font-bold text-xs uppercase mb-1">Erreur de Connexion</h3>
                <p className="text-red-200/80 text-[10px] font-bold">{connectionError}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-4">
        <div className="bg-white rounded-xl border border-[#003B94]/10 p-1.5 flex gap-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Vue d\'ensemble', icon: Eye },
            { id: 'tables', label: 'Tables', icon: DatabaseIcon },
            { id: 'actions', label: 'Actions', icon: Settings },
            { id: 'logs', label: 'Logs', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap ${
                  isActive 
                    ? 'bg-[#003B94] text-white shadow-lg' 
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mx-4">
            {tableDetails.map((table, index) => (
              <GlassCard key={table.name} className="p-4 bg-white border border-[#003B94]/10 hover:shadow-lg transition-all cursor-pointer" onClick={() => setActiveTab('tables')}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${getColorClasses(table.color)}`}>
                    {table.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest truncate">{table.name}</p>
                    <p className="text-xl font-black text-[#001d4a]">{table.count.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-[7px] font-black px-2 py-0.5 rounded ${getStatusColor(table.status)}`}>
                    {table.status}
                  </span>
                  <span className="text-[7px] text-gray-400">{table.lastUpdate}</span>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Summary Card */}
          <div className="mx-4">
            <GlassCard className="p-6 bg-gradient-to-br from-[#003B94] to-[#001d4a] text-white border-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-2">Total Enregistrements</p>
                  <p className="oswald text-4xl font-black">{totalRecords.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-white/10 rounded-2xl">
                  <TrendingUp size={32} className="text-[#FCB131]" />
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Integrity Check Results */}
          {integrityResults.length > 0 && (
            <div className="mx-4">
              <GlassCard className="p-6 bg-white border border-[#003B94]/10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#003B94]/10 rounded-lg"><Activity size={20} className="text-[#003B94]" /></div>
                    <h2 className="oswald text-xl font-black text-[#001d4a] uppercase">Vérification d'Intégrité</h2>
                  </div>
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-[#003B94] hover:text-[#001d4a] transition-colors"
                  >
                    {showDetails ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {integrityResults.map((result) => (
                    <div
                      key={result.table}
                      className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${getStatusColor(result.status)}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 truncate">{result.table}</p>
                        <p className="text-xs font-bold truncate">{result.message}</p>
                        {showDetails && (
                          <p className="text-[9px] text-gray-500 mt-1">{result.latency}ms</p>
                        )}
                      </div>
                      <div className="shrink-0 ml-2">
                        {getStatusIcon(result.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          )}
        </>
      )}

      {/* Tables Tab */}
      {activeTab === 'tables' && (
        <div className="mx-4 space-y-4">
          {tableDetails.map((table) => (
            <GlassCard key={table.name} className="p-6 bg-white border border-[#003B94]/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${getColorClasses(table.color)}`}>
                    {table.icon}
                  </div>
                  <div>
                    <h3 className="oswald text-lg font-black text-[#001d4a] uppercase">{table.name}</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">
                      {table.count.toLocaleString()} enregistrements
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-3 py-1 rounded-lg ${getStatusColor(table.status)}`}>
                    {table.status}
                  </span>
                  <span className="text-[9px] text-gray-400">{table.lastUpdate}</span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Actions Tab */}
      {activeTab === 'actions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mx-4">
          <GlassCard className="p-6 bg-white border border-[#003B94]/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#003B94]/10 rounded-lg"><Server size={20} className="text-[#003B94]" /></div>
              <h3 className="oswald text-lg font-black text-[#001d4a] uppercase">Actions Serveur</h3>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleMaintenance}
                disabled={isPerformingMaintenance}
                className="w-full bg-[#003B94] text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-[#001d4a] transition-all disabled:opacity-50"
              >
                {isPerformingMaintenance ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
                Maintenance de Base de Données
              </button>
              
              <button
                onClick={handleReconnect}
                disabled={isReconnecting}
                className="w-full bg-white border-2 border-[#003B94] text-[#003B94] px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-[#003B94]/5 transition-all disabled:opacity-50"
              >
                {isReconnecting ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Reconnecter à Supabase
              </button>

              <button
                onClick={handleExportData}
                className="w-full bg-green-500 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-green-600 transition-all"
              >
                <Download size={14} />
                Exporter les Données
              </button>
            </div>
          </GlassCard>

          <GlassCard className="p-6 bg-white border border-[#003B94]/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#FCB131]/10 rounded-lg"><HardDrive size={20} className="text-[#FCB131]" /></div>
              <h3 className="oswald text-lg font-black text-[#001d4a] uppercase">Actions Locales</h3>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleClearCache}
                className="w-full bg-red-500 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 transition-all"
              >
                <Trash2 size={14} />
                Vider le Cache Local
              </button>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <p className="text-[9px] font-bold text-yellow-800 uppercase tracking-wide flex items-center gap-2">
                  <AlertTriangle size={12} />
                  Attention: Cette action supprimera toutes les données en cache local
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Connection Info */}
          <GlassCard className="p-6 bg-white border border-[#003B94]/10 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#003B94]/10 rounded-lg"><DatabaseIcon size={20} className="text-[#003B94]" /></div>
              <h3 className="oswald text-lg font-black text-[#001d4a] uppercase">Informations de Connexion</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Statut</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-lg ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {isConnected ? 'Connecté' : 'Déconnecté'}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Provider</span>
                <span className="text-xs font-bold text-[#001d4a]">Supabase</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Enregistrements</span>
                <span className="text-xs font-bold text-[#001d4a]">{totalRecords.toLocaleString()}</span>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="mx-4">
          <GlassCard className="p-6 bg-white border border-[#003B94]/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#003B94]/10 rounded-lg"><FileText size={20} className="text-[#003B94]" /></div>
                <h3 className="oswald text-lg font-black text-[#001d4a] uppercase">Logs Système</h3>
              </div>
              <span className="text-[9px] text-gray-400 font-bold">{logs.length} entrées</span>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Aucun log disponible</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className={`p-3 rounded-lg flex items-center justify-between ${getLogBgColor(log.type)}`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getLogIcon(log.type)}
                      <span className={`text-xs font-bold truncate ${
                        log.type === 'error' ? 'text-red-700' :
                        log.type === 'success' ? 'text-green-700' :
                        log.type === 'warning' ? 'text-yellow-700' :
                        'text-blue-700'
                      }`}>
                        {log.message}
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-400 shrink-0 ml-2">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default Database;
