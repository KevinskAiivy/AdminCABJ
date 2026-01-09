
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GlassCard } from '../components/GlassCard';
import { 
  Database as DatabaseIcon, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Activity, Server, HardDrive, 
  Users, MapPin, Calendar, MessageSquare, ShieldCheck, Trophy, Clock, Loader2, 
  Trash2, Download, Settings, Eye, EyeOff, FileText, TrendingUp, 
  AlertCircle, RotateCcw, RotateCw, X, Check, Code, ArrowRight, Copy
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { IntegrityResult, TableSchema, FieldMapping } from '../services/dataService';
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
  const [isRemappingAutomatic, setIsRemappingAutomatic] = useState(false);
  const [isRemappingManual, setIsRemappingManual] = useState(false);
  const [selectedTablesForRemap, setSelectedTablesForRemap] = useState<string[]>([]);
  const [showRemapManualModal, setShowRemapManualModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tables' | 'actions' | 'logs' | 'schema'>('overview');
  const [showDetails, setShowDetails] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [tableSchemas, setTableSchemas] = useState<Record<string, TableSchema>>({});
  const [selectedSchemaTable, setSelectedSchemaTable] = useState<string | null>(null);
  const [isLoadingSchemas, setIsLoadingSchemas] = useState(false);
  
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
    addLog('info', 'Página Database inicializada');
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [updateStatus, addLog]);

  const handleCheckIntegrity = useCallback(async () => {
    setIsCheckingIntegrity(true);
    addLog('info', 'Inicio de verificación de integridad');
    
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
              addLog('error', `Error tabla ${table}: ${error.message}`);
              return { table, status: 'ERROR', message: error.message, latency };
            }
            
            if (count === 0) {
              return { table, status: 'EMPTY', message: 'Tabla vacía', latency };
            }
            
            return { table, status: 'OK', message: `${count} registros`, latency };
          } catch (error: any) {
            const latency = Date.now() - startTime;
            const errorMsg = error.message || 'Error de conexión';
            addLog('error', `Error tabla ${table}: ${errorMsg}`);
            return { table, status: 'ERROR', message: errorMsg, latency };
          }
        })
      );
      
      setIntegrityResults(results);
      addLog('success', `Verificación de integridad terminada: ${results.filter(r => r.status === 'OK').length}/${results.length} tablas OK`);
    } catch (error: any) {
      console.error('Error checking integrity:', error);
      addLog('error', `Error durante la verificación: ${error.message}`);
    } finally {
      setIsCheckingIntegrity(false);
    }
  }, [addLog]);

  const handleReconnect = useCallback(async () => {
    setIsReconnecting(true);
    addLog('info', 'Intentando reconectar con Supabase...');
    
    try {
      await dataService.initializeData(false);
      setIsConnected(dataService.isConnected);
      setConnectionError(dataService.connectionError);
      updateStatus();
      setLastUpdate(new Date());
      
      if (dataService.isConnected) {
        addLog('success', 'Reconexión exitosa');
      } else {
        addLog('error', `Fallo en la reconexión: ${dataService.connectionError || 'Error desconocido'}`);
      }
    } catch (error: any) {
      console.error('Reconnection error:', error);
      addLog('error', `Error de reconexión: ${error.message}`);
    } finally {
      setIsReconnecting(false);
    }
  }, [addLog, updateStatus]);

  const handleMaintenance = useCallback(async () => {
    if (!confirm('¿Está seguro de que desea realizar un mantenimiento de la base de datos? Esta operación puede tardar varios minutos.')) {
      return;
    }
    
    setIsPerformingMaintenance(true);
    addLog('info', 'Inicio del mantenimiento de la base de datos');
    
    try {
      await dataService.performMaintenance();
      await handleCheckIntegrity();
      updateStatus();
      addLog('success', 'Mantenimiento completado exitosamente');
      alert('Mantenimiento completado exitosamente');
    } catch (error: any) {
      const errorMsg = error.message || 'Error desconocido';
      addLog('error', `Error durante el mantenimiento: ${errorMsg}`);
      alert(`Error durante el mantenimiento: ${errorMsg}`);
    } finally {
      setIsPerformingMaintenance(false);
    }
  }, [handleCheckIntegrity, addLog, updateStatus]);

  const handleRemapAutomatic = useCallback(async () => {
    if (!confirm('¿Está seguro de que desea re-mapear automáticamente todas las tablas? Esta operación recargará todos los datos desde Supabase.')) {
      return;
    }
    
    setIsRemappingAutomatic(true);
    addLog('info', 'Inicio del re-mapeo automático de todas las tablas');
    
    try {
      const result = await dataService.remapDataAutomatic();
      await handleCheckIntegrity();
      updateStatus();
      addLog('success', result.message || 'Re-mapeo automático completado exitosamente');
      alert(result.message || 'Re-mapeo automático completado exitosamente');
    } catch (error: any) {
      const errorMsg = error.message || 'Error desconocido';
      addLog('error', `Error durante el re-mapeo automático: ${errorMsg}`);
      alert(`Error durante el re-mapeo automático: ${errorMsg}`);
    } finally {
      setIsRemappingAutomatic(false);
    }
  }, [handleCheckIntegrity, addLog, updateStatus]);

  const handleRemapManual = useCallback(async () => {
    if (selectedTablesForRemap.length === 0) {
      alert('Por favor, seleccione al menos una tabla para re-mapear.');
      return;
    }
    
    setIsRemappingManual(true);
    addLog('info', `Inicio del re-mapeo manual de ${selectedTablesForRemap.length} tabla(s)`);
    
    try {
      const result = await dataService.remapDataManual(selectedTablesForRemap);
      await handleCheckIntegrity();
      updateStatus();
      
      // Log results for each table
      Object.entries(result.results || {}).forEach(([table, res]) => {
        if (res.success) {
          addLog('success', `Tabla '${table}' re-mapeada: ${res.count} registros`);
        } else {
          addLog('error', `Error en tabla '${table}': ${res.error || 'Error desconocido'}`);
        }
      });
      
      addLog('success', result.message || 'Re-mapeo manual completado');
      alert(result.message || 'Re-mapeo manual completado');
      setShowRemapManualModal(false);
      setSelectedTablesForRemap([]);
    } catch (error: any) {
      const errorMsg = error.message || 'Error desconocido';
      addLog('error', `Error durante el re-mapeo manual: ${errorMsg}`);
      alert(`Error durante el re-mapeo manual: ${errorMsg}`);
    } finally {
      setIsRemappingManual(false);
    }
  }, [selectedTablesForRemap, handleCheckIntegrity, addLog, updateStatus]);

  const handleClearCache = useCallback(() => {
    if (!confirm('¿Desea vaciar la caché local? Todos los datos en caché serán eliminados.')) {
      return;
    }
    addLog('warning', 'Vaciando caché local...');
    localStorage.removeItem('cabj_settings');
    window.location.reload();
  }, [addLog]);

  const handleExportData = useCallback(async () => {
    try {
      addLog('info', 'Exportando datos...');
      
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
      
      addLog('success', 'Exportación de datos exitosa');
    } catch (error: any) {
      const errorMsg = error.message || 'Error desconocido';
      addLog('error', `Error durante la exportación: ${errorMsg}`);
      alert(`Error durante la exportación: ${errorMsg}`);
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
      addLog('error', `Error de conexión: ${connectionError}`);
    }
  }, [connectionError, addLog]);
  
  const toggleTableSelection = (tableName: string) => {
    setSelectedTablesForRemap(prev => 
      prev.includes(tableName) 
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    );
  };

  // Cargar esquemas SQL de todas las tablas
  const loadTableSchemas = useCallback(async () => {
    setIsLoadingSchemas(true);
    addLog('info', 'Cargando esquemas SQL de las tablas...');
    
    try {
      const schemas = await dataService.getAllTableSchemas();
      setTableSchemas(schemas);
      addLog('success', `Esquemas cargados para ${Object.keys(schemas).length} tablas`);
      
      // Seleccionar la primera tabla si no hay ninguna seleccionada
      if (!selectedSchemaTable && Object.keys(schemas).length > 0) {
        setSelectedSchemaTable(Object.keys(schemas)[0]);
      }
    } catch (error: any) {
      addLog('error', `Error cargando esquemas: ${error.message}`);
    } finally {
      setIsLoadingSchemas(false);
    }
  }, [addLog, selectedSchemaTable]);

  // Cargar esquemas cuando se abre el tab
  useEffect(() => {
    if (activeTab === 'schema' && Object.keys(tableSchemas).length === 0) {
      loadTableSchemas();
    }
  }, [activeTab, tableSchemas, loadTableSchemas]);

  // Copiar mapping al portapapeles
  const copyMappingToClipboard = (mapping: FieldMapping) => {
    const text = `${mapping.dbField} → ${mapping.appField}`;
    navigator.clipboard.writeText(text);
    addLog('success', `Mapping copiado: ${text}`);
  };

  // Generar código SQL CREATE TABLE
  const generateSQLCode = (tableName: string, schema: TableSchema | undefined): string => {
    if (!schema || !schema.columns || schema.columns.length === 0) {
      return `-- No hay esquema disponible para la tabla '${tableName}'`;
    }

    const tableNameUpper = tableName.toUpperCase();
    let sql = `-- Tabla: ${tableName}\n`;
    sql += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
    
    const columns = schema.columns.map((col, index) => {
      let colDef = `    ${col.name} ${col.type.toUpperCase()}`;
      
      // Agregar NOT NULL si no es nullable
      if (!col.nullable) {
        colDef += ' NOT NULL';
      }
      
      // Agregar DEFAULT si existe
      if (col.default !== undefined && col.default !== null) {
        if (typeof col.default === 'string') {
          colDef += ` DEFAULT '${col.default}'`;
        } else {
          colDef += ` DEFAULT ${col.default}`;
        }
      }
      
      return colDef;
    });
    
    sql += columns.join(',\n');
    sql += '\n);\n';
    
    // Agregar comentarios
    sql += `\n-- Comentarios:\n`;
    sql += `COMMENT ON TABLE ${tableName} IS 'Tabla ${tableNameUpper}';\n`;
    
    return sql;
  };

  // Copiar código SQL al portapapeles
  const copySQLToClipboard = (sql: string) => {
    navigator.clipboard.writeText(sql);
    addLog('success', 'Código SQL copiado al portapapeles');
  };

  // Analizar problemas de mapping
  const analyzeMappingIssues = (tableName: string): Array<{
    type: 'missing_db' | 'missing_app' | 'type_mismatch' | 'nullable_mismatch';
    dbField?: string;
    appField?: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }> => {
    const issues: Array<{
      type: 'missing_db' | 'missing_app' | 'type_mismatch' | 'nullable_mismatch';
      dbField?: string;
      appField?: string;
      message: string;
      severity: 'error' | 'warning' | 'info';
    }> = [];

    const schema = tableSchemas[tableName];
    const mappings = dataService.getFieldMappings(tableName);

    if (!schema) {
      issues.push({
        type: 'missing_db',
        message: `No se pudo obtener el esquema de la tabla '${tableName}' desde la base de datos`,
        severity: 'error'
      });
      return issues;
    }

    // Crear mapas para comparación rápida
    const dbFieldsMap = new Map(schema.columns.map(col => [col.name, col]));
    const appFieldsMap = new Map(mappings.map(m => [m.appField, m]));

    // Verificar campos en DB que no están mapeados en la app
    schema.columns.forEach(col => {
      const mapping = mappings.find(m => m.dbField === col.name);
      if (!mapping) {
        issues.push({
          type: 'missing_app',
          dbField: col.name,
          message: `Campo '${col.name}' existe en DB pero no está mapeado en la aplicación`,
          severity: 'warning'
        });
      }
    });

    // Verificar campos mapeados en app que no están en DB
    mappings.forEach(mapping => {
      if (!dbFieldsMap.has(mapping.dbField)) {
        issues.push({
          type: 'missing_db',
          appField: mapping.appField,
          dbField: mapping.dbField,
          message: `Campo '${mapping.dbField}' está mapeado en la app pero no existe en la DB`,
          severity: 'error'
        });
      } else {
        // Verificar tipos y nullable
        const dbCol = dbFieldsMap.get(mapping.dbField)!;
        
        // Comparación de tipos (simplificada)
        const dbType = dbCol.type.toLowerCase();
        const appType = mapping.type.toLowerCase();
        
        if (!dbType.includes(appType) && !appType.includes(dbType)) {
          // Solo marcar como warning si no es una correspondencia obvia
          if (!(dbType.includes('text') && appType === 'string') &&
              !(dbType.includes('int') && appType === 'number') &&
              !(dbType.includes('bool') && appType === 'boolean')) {
            issues.push({
              type: 'type_mismatch',
              dbField: mapping.dbField,
              appField: mapping.appField,
              message: `Tipo diferente: DB='${dbCol.type}' vs App='${mapping.type}'`,
              severity: 'warning'
            });
          }
        }

        // Verificar nullable
        if (dbCol.nullable !== mapping.nullable) {
          issues.push({
            type: 'nullable_mismatch',
            dbField: mapping.dbField,
            appField: mapping.appField,
            message: `Nullable diferente: DB=${dbCol.nullable ? 'NULL' : 'NOT NULL'} vs App=${mapping.nullable ? 'NULL' : 'NOT NULL'}`,
            severity: 'info'
          });
        }
      }
    });

    return issues.sort((a, b) => {
      const severityOrder = { error: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  };

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
                  Gestión de Base de Datos
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-all ${isConnected ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                    {isConnected ? 'Conectado' : 'Desconectado'}
                  </span>
                  {loadingMessage && (
                    <span className="text-white/60 text-[10px] font-bold uppercase tracking-wide flex items-center gap-2">
                      <Loader2 size={12} className="animate-spin" />
                      {loadingMessage}
                    </span>
                  )}
                  <span className="text-white/40 text-[9px] font-bold">
                    Última actualización: {lastUpdate.toLocaleTimeString()}
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
                Reconectar
              </button>
              <button
                onClick={handleCheckIntegrity}
                disabled={isCheckingIntegrity}
                className="bg-white/10 text-white border border-white/20 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-white/20 transition-all disabled:opacity-50"
              >
                {isCheckingIntegrity ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
                Verificar Integridad
              </button>
            </div>
          </div>

          {connectionError && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-red-300 font-bold text-xs uppercase mb-1">Error de Conexión</h3>
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
            { id: 'overview', label: 'Resumen', icon: Eye },
            { id: 'tables', label: 'Tablas', icon: DatabaseIcon },
            { id: 'schema', label: 'Esquema SQL', icon: Code },
            { id: 'actions', label: 'Acciones', icon: Settings },
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
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest truncate">{TABLE_CONFIG.find(c => c.name === table.name)?.label || table.name}</p>
                    <p className="text-xl font-black text-[#001d4a]">{table.count.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-[7px] font-black px-2 py-0.5 rounded ${getStatusColor(table.status)}`}>
                    {table.status === 'OK' ? 'OK' : table.status === 'ERROR' ? 'ERROR' : 'VACÍA'}
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
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-2">Total de Registros</p>
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
                    <h2 className="oswald text-xl font-black text-[#001d4a] uppercase">Verificación de Integridad</h2>
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
                      {table.count.toLocaleString()} registros
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
              <h3 className="oswald text-lg font-black text-[#001d4a] uppercase">Acciones del Servidor</h3>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleMaintenance}
                disabled={isPerformingMaintenance}
                className="w-full bg-[#003B94] text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-[#001d4a] transition-all disabled:opacity-50"
              >
                {isPerformingMaintenance ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
                Mantenimiento de Base de Datos
              </button>
              
              <button
                onClick={handleRemapAutomatic}
                disabled={isRemappingAutomatic}
                className="w-full bg-purple-600 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-purple-700 transition-all disabled:opacity-50"
              >
                {isRemappingAutomatic ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
                Re-mapear Automáticamente
              </button>
              
              <button
                onClick={() => setShowRemapManualModal(true)}
                disabled={isRemappingManual}
                className="w-full bg-indigo-600 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                <RotateCcw size={14} />
                Re-mapear Manualmente
              </button>
              
              <button
                onClick={handleReconnect}
                disabled={isReconnecting}
                className="w-full bg-white border-2 border-[#003B94] text-[#003B94] px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-[#003B94]/5 transition-all disabled:opacity-50"
              >
                {isReconnecting ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Reconectar a Supabase
              </button>

              <button
                onClick={handleExportData}
                className="w-full bg-green-500 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-green-600 transition-all"
              >
                <Download size={14} />
                Exportar Datos
              </button>
            </div>
          </GlassCard>

          <GlassCard className="p-6 bg-white border border-[#003B94]/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#FCB131]/10 rounded-lg"><HardDrive size={20} className="text-[#FCB131]" /></div>
              <h3 className="oswald text-lg font-black text-[#001d4a] uppercase">Acciones Locales</h3>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleClearCache}
                className="w-full bg-red-500 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 transition-all"
              >
                <Trash2 size={14} />
                Vaciar Caché Local
              </button>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <p className="text-[9px] font-bold text-yellow-800 uppercase tracking-wide flex items-center gap-2">
                  <AlertTriangle size={12} />
                  Atención: Esta acción eliminará todos los datos en caché local
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Connection Info */}
          <GlassCard className="p-6 bg-white border border-[#003B94]/10 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#003B94]/10 rounded-lg"><DatabaseIcon size={20} className="text-[#003B94]" /></div>
              <h3 className="oswald text-lg font-black text-[#001d4a] uppercase">Información de Conexión</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Estado</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-lg ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {isConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Proveedor</span>
                <span className="text-xs font-bold text-[#001d4a]">Supabase</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Registros</span>
                <span className="text-xs font-bold text-[#001d4a]">{totalRecords.toLocaleString()}</span>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Esquema SQL Tab */}
      {activeTab === 'schema' && (
        <div className="mx-4 space-y-6">
          <GlassCard className="p-6 bg-white border border-[#003B94]/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#003B94]/10 rounded-lg"><Code size={20} className="text-[#003B94]" /></div>
                <div>
                  <h3 className="oswald text-xl font-black text-[#001d4a] uppercase">Esquema SQL y Mapeo de Campos</h3>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wide mt-1">
                    Visualice y configure el mapeo entre campos de base de datos (snake_case) y aplicación (camelCase)
                  </p>
                </div>
              </div>
              <button
                onClick={loadTableSchemas}
                disabled={isLoadingSchemas}
                className="bg-[#003B94] text-white px-4 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest flex items-center gap-2 hover:bg-[#001d4a] transition-all disabled:opacity-50"
              >
                {isLoadingSchemas ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Actualizar
              </button>
            </div>

            {/* Selector de tabla */}
            <div className="mb-6">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">
                Seleccionar Tabla
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {TABLE_CONFIG.map(config => {
                  const Icon = config.icon;
                  const isSelected = selectedSchemaTable === config.name;
                  const hasSchema = tableSchemas[config.name] !== undefined;
                  
                  return (
                    <button
                      key={config.name}
                      onClick={() => setSelectedSchemaTable(config.name)}
                      disabled={!hasSchema}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'bg-[#003B94] border-[#003B94] text-white shadow-lg'
                          : 'bg-gray-50 border-gray-200 hover:border-[#003B94]/50 text-[#001d4a]'
                      } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${
                          isSelected ? 'bg-white/20' : getColorClasses(config.color)
                        }`}>
                          <Icon size={16} />
                        </div>
                        {hasSchema && (
                          <CheckCircle2 size={14} className={isSelected ? 'text-white' : 'text-green-600'} />
                        )}
                      </div>
                      <p className={`oswald text-sm font-black uppercase ${isSelected ? 'text-white' : 'text-[#001d4a]'}`}>
                        {config.label}
                      </p>
                      <p className={`text-[8px] font-bold uppercase tracking-wide mt-1 ${
                        isSelected ? 'text-white/70' : 'text-gray-500'
                      }`}>
                        {config.name}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Código SQL Copiable */}
            {selectedSchemaTable && tableSchemas[selectedSchemaTable] && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Code size={18} className="text-[#003B94]" />
                    <h4 className="oswald text-lg font-black text-[#001d4a] uppercase">Código SQL CREATE TABLE</h4>
                  </div>
                  <button
                    onClick={() => copySQLToClipboard(generateSQLCode(selectedSchemaTable, tableSchemas[selectedSchemaTable]))}
                    className="bg-[#FCB131] text-[#001d4a] px-4 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest flex items-center gap-2 hover:bg-[#FFD23F] transition-all"
                  >
                    <Copy size={14} />
                    Copiar SQL
                  </button>
                </div>
                <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-4 relative group">
                  <pre className="text-[10px] font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">
                    <code>{generateSQLCode(selectedSchemaTable, tableSchemas[selectedSchemaTable])}</code>
                  </pre>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => copySQLToClipboard(generateSQLCode(selectedSchemaTable, tableSchemas[selectedSchemaTable]))}
                      className="bg-[#FCB131]/20 hover:bg-[#FCB131]/30 p-2 rounded-lg transition-all"
                      title="Copiar código SQL"
                    >
                      <Copy size={14} className="text-[#FCB131]" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Visualización de Problemas de Mapping */}
            {selectedSchemaTable && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={18} className="text-[#FCB131]" />
                  <h4 className="oswald text-lg font-black text-[#001d4a] uppercase">Análisis de Mapping</h4>
                </div>
                {(() => {
                  const issues = analyzeMappingIssues(selectedSchemaTable);
                  return issues.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {issues.map((issue, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-xl border-2 ${
                            issue.severity === 'error'
                              ? 'bg-red-50 border-red-200'
                              : issue.severity === 'warning'
                              ? 'bg-yellow-50 border-yellow-200'
                              : 'bg-blue-50 border-blue-200'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {issue.severity === 'error' && <XCircle size={18} className="text-red-600 shrink-0 mt-0.5" />}
                            {issue.severity === 'warning' && <AlertTriangle size={18} className="text-yellow-600 shrink-0 mt-0.5" />}
                            {issue.severity === 'info' && <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                                  issue.severity === 'error'
                                    ? 'bg-red-100 text-red-700'
                                    : issue.severity === 'warning'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {issue.severity === 'error' ? 'Error' : issue.severity === 'warning' ? 'Advertencia' : 'Info'}
                                </span>
                                {issue.dbField && (
                                  <code className="text-[9px] font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                                    DB: {issue.dbField}
                                  </code>
                                )}
                                {issue.appField && (
                                  <code className="text-[9px] font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                                    App: {issue.appField}
                                  </code>
                                )}
                              </div>
                              <p className={`text-[10px] font-bold ${
                                issue.severity === 'error'
                                  ? 'text-red-800'
                                  : issue.severity === 'warning'
                                  ? 'text-yellow-800'
                                  : 'text-blue-800'
                              }`}>
                                {issue.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                      <CheckCircle2 size={20} className="text-green-600 mx-auto mb-2" />
                      <p className="text-[10px] font-bold text-green-800 uppercase">
                        No se encontraron problemas de mapping para esta tabla
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Esquema SQL y Mapeo */}
            {selectedSchemaTable && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Esquema SQL de la Base de Datos */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <DatabaseIcon size={18} className="text-[#003B94]" />
                    <h4 className="oswald text-lg font-black text-[#001d4a] uppercase">Esquema SQL (Base de Datos)</h4>
                  </div>
                  
                  {tableSchemas[selectedSchemaTable] ? (
                    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 max-h-96 overflow-y-auto">
                      <div className="space-y-2">
                        {tableSchemas[selectedSchemaTable].columns.map((col, index) => (
                          <div
                            key={index}
                            className="bg-white rounded-lg p-3 border border-gray-200 hover:border-[#003B94]/30 transition-all"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <code className="text-xs font-bold text-[#003B94]">{col.name}</code>
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded ${
                                col.nullable
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {col.nullable ? 'NULL' : 'NOT NULL'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wide">
                                Tipo:
                              </span>
                              <code className="text-[9px] font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                                {col.type}
                              </code>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                      <AlertTriangle size={20} className="text-yellow-600 mx-auto mb-2" />
                      <p className="text-[10px] font-bold text-yellow-800 uppercase">
                        Esquema no disponible para esta tabla
                      </p>
                    </div>
                  )}
                </div>

                {/* Mapeo de Campos */}
                        <div>
                  <div className="flex items-center gap-2 mb-4">
                    <ArrowRight size={18} className="text-[#FCB131]" />
                    <h4 className="oswald text-lg font-black text-[#001d4a] uppercase">Mapeo de Campos (Aplicación)</h4>
                  </div>
                  
                  {selectedSchemaTable && (
                    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 max-h-96 overflow-y-auto">
                      {(() => {
                        const mappings = dataService.getFieldMappings(selectedSchemaTable);
                        return mappings.length > 0 ? (
                          <div className="space-y-2">
                            {mappings.map((mapping, index) => (
                              <div
                                key={index}
                                className="bg-white rounded-lg p-3 border border-gray-200 hover:border-[#FCB131]/30 transition-all group"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <code className="text-[10px] font-bold text-gray-600">{mapping.dbField}</code>
                                      <ArrowRight size={12} className="text-[#FCB131] shrink-0" />
                                      <code className="text-[10px] font-bold text-[#003B94]">{mapping.appField}</code>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => copyMappingToClipboard(mapping)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-100 rounded transition-all"
                                    title="Copiar mapping"
                                  >
                                    <Copy size={12} className="text-gray-400" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <span className={`text-[8px] font-black px-2 py-0.5 rounded ${
                                    getColorClasses(mapping.type.includes('enum') ? 'purple' : 
                                                   mapping.type === 'boolean' ? 'orange' :
                                                   mapping.type === 'date' ? 'pink' :
                                                   mapping.type === 'json' || mapping.type === 'array' ? 'indigo' : 'blue')
                                  }`}>
                                    {mapping.type}
                                  </span>
                                  {mapping.nullable && (
                                    <span className="text-[8px] font-black px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">
                                      Opcional
                                    </span>
                                  )}
                                  {!mapping.nullable && (
                                    <span className="text-[8px] font-black px-2 py-0.5 rounded bg-red-100 text-red-700">
                                      Requerido
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                            <AlertTriangle size={20} className="text-yellow-600 mx-auto mb-2" />
                            <p className="text-[10px] font-bold text-yellow-800 uppercase">
                              No hay mappings definidos para esta tabla
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Información adicional */}
            {selectedSchemaTable && (
              <div className="mt-6 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-black text-blue-800 uppercase tracking-wide mb-1">
                        Sistema de Nomenclatura: snake_case (Base de Datos)
                      </p>
                      <ul className="text-[9px] font-bold text-blue-700 space-y-1 list-disc list-inside">
                        <li><strong>La aplicación utiliza exclusivamente <code className="bg-white/50 px-1 rounded font-mono text-[8px]">snake_case</code></strong> (ej: <code className="bg-white/50 px-1 rounded font-mono text-[8px]">first_name</code>, <code className="bg-white/50 px-1 rounded font-mono text-[8px]">last_name</code>, <code className="bg-white/50 px-1 rounded font-mono text-[8px]">numero_socio</code>, <code className="bg-white/50 px-1 rounded font-mono text-[8px]">is_official</code>)</li>
                        <li><strong>Sin Conversión:</strong> Los campos de la base de datos y de la aplicación son <strong>idénticos</strong> - no hay conversión camelCase ↔ snake_case</li>
                        <li><strong>Sin Mapping:</strong> No hay funciones de mapping de conversión - los datos se utilizan directamente desde Supabase</li>
                        <li><strong>Tipos de Datos:</strong> Los tipos se infieren desde los datos reales de Supabase o se definen manualmente según la especificación de cada tabla</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Ejemplo de mapeo */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-black text-green-800 uppercase tracking-wide mb-2">
                        Ejemplo de Mapeo (snake_case → camelCase)
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3 border border-green-100">
                          <p className="text-[8px] font-black text-gray-500 uppercase tracking-wide mb-1">Base de Datos y Aplicación</p>
                          <code className="text-[9px] font-mono text-green-700">
                            <strong className="text-blue-700">Todos los campos utilizan snake_case:</strong><br/>
                            id, first_name, last_name, numero_socio<br/>
                            phone, birth_date, join_date<br/>
                            last_month_paid, category, status<br/>
                            consulado_name, avatar_color, expiration_date<br/>
                            is_official, social_instagram, social_facebook<br/>
                            social_x, social_tiktok, social_youtube<br/>
                            target_consulado_id, target_consulado_name<br/>
                            target_ids, created_at, is_automatic<br/>
                            is_special_day, is_home, is_neutral<br/>
                            is_suspended, rival_id, rival_short<br/>
                            rival_country, competition_id, fecha_jornada<br/>
                            apertura_date, apertura_hour, cierre_date<br/>
                            cierre_hour, short_name, country_id<br/>
                            country_code, vice_president, foundation_year<br/>
                            start_date, end_date, full_name<br/>
                            consulado_id, last_login, match_id<br/>
                            socio_id, socio_name, socio_dni<br/>
                            socio_category
                          </code>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-green-100">
                          <p className="text-[8px] font-black text-gray-500 uppercase tracking-wide mb-1">Sin Conversión</p>
                          <code className="text-[9px] font-mono text-blue-700">
                            <strong className="text-green-700">No hay conversión entre DB y App:</strong><br/>
                            Los campos de la base de datos<br/>
                            son los mismos que los de la<br/>
                            aplicación. Todo utiliza snake_case<br/>
                            exclusivamente.<br/><br/>
                            No hay funciones de mapping<br/>
                            de conversión camelCase ↔ snake_case.<br/>
                            Los datos se utilizan directamente<br/>
                            sin transformación.
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                <h3 className="oswald text-lg font-black text-[#001d4a] uppercase">Logs del Sistema</h3>
              </div>
              <span className="text-[9px] text-gray-400 font-bold">{logs.length} entradas</span>
                </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No hay logs disponibles</div>
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

      {/* Modal de Re-mapeo Manual */}
      {showRemapManualModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <GlassCard className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-white/60 max-h-[calc(100vh-4rem)] flex flex-col animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-gradient-to-r from-[#003B94] to-[#001d4a] p-6 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-xl border border-white/10"><RotateCcw size={20} className="text-[#FCB131]" /></div>
                        <div>
                  <h2 className="oswald text-xl font-black uppercase tracking-tight">Re-mapear Manualmente</h2>
                  <p className="text-white/70 text-[9px] font-bold uppercase tracking-widest">Seleccione las tablas a re-mapear</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowRemapManualModal(false);
                  setSelectedTablesForRemap([]);
                }}
                className="text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-3 mb-6">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wide mb-4">
                  Seleccione las tablas que desea re-mapear desde Supabase:
                </p>
                {TABLE_CONFIG.map((config) => {
                  const Icon = config.icon;
                  const isSelected = selectedTablesForRemap.includes(config.name);
                  return (
                    <div
                      key={config.name}
                      onClick={() => toggleTableSelection(config.name)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#003B94]/10 border-[#003B94] shadow-md'
                          : 'bg-gray-50 border-gray-200 hover:border-[#003B94]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isSelected ? getColorClasses(config.color) : 'bg-gray-200'}`}>
                            <Icon size={16} className={isSelected ? '' : 'text-gray-400'} />
                          </div>
                          <div>
                            <p className="oswald text-sm font-black text-[#001d4a] uppercase">{config.label}</p>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wide">{config.name}</p>
                          </div>
                        </div>
                        {isSelected && <Check size={20} className="text-[#003B94]" />}
                        </div>
                    </div>
                  );
                })}
              </div>

              {selectedTablesForRemap.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <p className="text-[9px] font-bold text-blue-800 uppercase tracking-wide">
                    {selectedTablesForRemap.length} tabla(s) seleccionada(s): {selectedTablesForRemap.join(', ')}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => {
                  setShowRemapManualModal(false);
                  setSelectedTablesForRemap([]);
                }}
                className="px-6 py-3 rounded-xl bg-white border-2 border-gray-300 text-gray-700 font-black uppercase text-[10px] tracking-widest hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleRemapManual}
                disabled={isRemappingManual || selectedTablesForRemap.length === 0}
                className="px-6 py-3 rounded-xl bg-[#003B94] text-white font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-[#001d4a] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRemappingManual ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Re-mapeando...
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} />
                    Re-mapear Seleccionadas
                  </>
                )}
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default Database;
