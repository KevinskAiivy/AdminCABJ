import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { 
    History, Search, Filter, Download, ChevronLeft, ChevronRight, 
    CheckCircle2, XCircle, Clock, AlertTriangle, User, Building2, 
    Calendar, MapPin, Trophy, Eye, X, UserCheck, UserX, 
    RotateCcw, FileText, Users
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { HabilitacionHistory } from '../../types';

export const HistorialHabilitaciones = () => {
    const [history, setHistory] = useState<HabilitacionHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [filterAttendance, setFilterAttendance] = useState<string>('ALL');
    const [filterConsulado, setFilterConsulado] = useState<string>('ALL');
    const [filterMatch, setFilterMatch] = useState<string>('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedEntry, setSelectedEntry] = useState<HabilitacionHistory | null>(null);
    const itemsPerPage = 20;

    const consulados = dataService.getConsulados();
    const matches = dataService.getMatches();

    useEffect(() => {
        const loadHistory = async () => {
            setLoading(true);
            await dataService.loadHabilitacionesHistory();
            setHistory(dataService.getHabilitacionesHistory());
            setLoading(false);
        };
        loadHistory();

        const unsubscribe = dataService.subscribe(() => {
            setHistory(dataService.getHabilitacionesHistory());
        });
        return () => unsubscribe();
    }, []);

    const filteredHistory = useMemo(() => {
        return history.filter(h => {
            // Recherche textuelle
            const q = searchQuery.toLowerCase();
            const matchesSearch = q === '' || 
                h.socio_name.toLowerCase().includes(q) ||
                (h.socio_dni && h.socio_dni.toLowerCase().includes(q)) ||
                (h.socio_numero && h.socio_numero.toLowerCase().includes(q)) ||
                h.consulado_name.toLowerCase().includes(q) ||
                h.match_rival.toLowerCase().includes(q);

            // Filtres
            const matchesStatus = filterStatus === 'ALL' || h.request_status === filterStatus;
            const matchesAttendance = filterAttendance === 'ALL' || 
                (filterAttendance === 'PENDIENTE' && !h.attendance_status) ||
                h.attendance_status === filterAttendance;
            const matchesConsulado = filterConsulado === 'ALL' || h.consulado_name === filterConsulado;
            const matchesMatch = filterMatch === 'ALL' || h.match_id === filterMatch;

            return matchesSearch && matchesStatus && matchesAttendance && matchesConsulado && matchesMatch;
        });
    }, [history, searchQuery, filterStatus, filterAttendance, filterConsulado, filterMatch]);

    const paginatedHistory = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredHistory.slice(start, start + itemsPerPage);
    }, [filteredHistory, currentPage]);

    const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

    // Statistiques globales
    const stats = useMemo(() => {
        const total = filteredHistory.length;
        const aceptadas = filteredHistory.filter(h => h.request_status === 'ACEPTADO').length;
        const rechazadas = filteredHistory.filter(h => h.request_status === 'RECHAZADO').length;
        const canceladas = filteredHistory.filter(h => 
            h.request_status.startsWith('CANCELADO')
        ).length;
        const presentes = filteredHistory.filter(h => h.attendance_status === 'PRESENTE').length;
        const noShows = filteredHistory.filter(h => h.attendance_status === 'AUSENTE_SIN_AVISO').length;
        
        return { total, aceptadas, rechazadas, canceladas, presentes, noShows };
    }, [filteredHistory]);

    const getStatusBadge = (status: string) => {
        const styles: Record<string, { bg: string, text: string, icon: React.ReactNode }> = {
            'SOLICITADO': { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Clock size={12} /> },
            'ACEPTADO': { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <CheckCircle2 size={12} /> },
            'RECHAZADO': { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle size={12} /> },
            'CANCELADO_SOCIO': { bg: 'bg-amber-100', text: 'text-amber-700', icon: <UserX size={12} /> },
            'CANCELADO_ADMIN': { bg: 'bg-orange-100', text: 'text-orange-700', icon: <XCircle size={12} /> },
            'CANCELADO_POST_ACEPTACION': { bg: 'bg-purple-100', text: 'text-purple-700', icon: <RotateCcw size={12} /> },
            'EXPIRADO': { bg: 'bg-gray-100', text: 'text-gray-700', icon: <AlertTriangle size={12} /> }
        };
        const style = styles[status] || styles['SOLICITADO'];
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${style.bg} ${style.text}`}>
                {style.icon}
                {status.replace(/_/g, ' ')}
            </span>
        );
    };

    const getAttendanceBadge = (status?: string | null) => {
        if (!status) {
            return <span className="text-[9px] text-gray-400 font-bold uppercase">Pendiente</span>;
        }
        const styles: Record<string, { bg: string, text: string, icon: React.ReactNode }> = {
            'PRESENTE': { bg: 'bg-emerald-500', text: 'text-white', icon: <UserCheck size={12} /> },
            'AUSENTE_SIN_AVISO': { bg: 'bg-red-500', text: 'text-white', icon: <UserX size={12} /> },
            'AUSENTE_CON_AVISO': { bg: 'bg-amber-500', text: 'text-white', icon: <AlertTriangle size={12} /> },
            'ENTRADA_ANULADA': { bg: 'bg-gray-500', text: 'text-white', icon: <XCircle size={12} /> }
        };
        const style = styles[status] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: null };
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${style.bg} ${style.text}`}>
                {style.icon}
                {status.replace(/_/g, ' ')}
            </span>
        );
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('es-AR', { 
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    const exportToCSV = () => {
        const headers = [
            'Fecha Solicitud', 'Socio', 'N° Socio', 'DNI', 'Categoría', 'Consulado',
            'Match', 'Fecha Match', 'Competición', 'Estado Solicitud', 'Estado Asistencia',
            'Procesado Por', 'Fecha Proceso', 'Razón Rechazo', 'Notas'
        ];
        
        const rows = filteredHistory.map(h => [
            formatDateTime(h.created_at),
            h.socio_name,
            h.socio_numero || '',
            h.socio_dni || '',
            h.socio_category || '',
            h.consulado_name,
            `vs ${h.match_rival}`,
            h.match_date,
            h.match_competition || '',
            h.request_status,
            h.attendance_status || 'PENDIENTE',
            h.processed_by_name || h.processed_by || '',
            formatDateTime(h.processed_at),
            h.rejection_reason || '',
            h.admin_notes || ''
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `historial_habilitaciones_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#003B94] border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 px-4 animate-boca-entrance">
            {/* Header */}
            <div className="liquid-glass-dark p-6 rounded-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 overflow-hidden relative">
                <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
                    <History size={200} className="text-white" />
                </div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="bg-white/10 p-3 rounded-xl border border-white/20">
                        <History size={24} className="text-[#FCB131]" />
                    </div>
                    <div>
                        <h1 className="oswald text-2xl font-black text-white uppercase tracking-tighter">Historial de Habilitaciones</h1>
                        <p className="text-[#FCB131] font-black uppercase text-[9px] tracking-[0.3em] mt-1">Registro Completo de Solicitudes</p>
                    </div>
                </div>
                <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-[#FCB131] text-[#001d4a] rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all shadow-lg"
                >
                    <Download size={14} /> Exportar CSV
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <GlassCard className="p-4 bg-white text-center">
                    <div className="text-2xl font-black text-[#001d4a]">{stats.total}</div>
                    <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Total</div>
                </GlassCard>
                <GlassCard className="p-4 bg-emerald-50 text-center border-emerald-200">
                    <div className="text-2xl font-black text-emerald-600">{stats.aceptadas}</div>
                    <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Aceptadas</div>
                </GlassCard>
                <GlassCard className="p-4 bg-red-50 text-center border-red-200">
                    <div className="text-2xl font-black text-red-600">{stats.rechazadas}</div>
                    <div className="text-[9px] font-bold text-red-600 uppercase tracking-widest">Rechazadas</div>
                </GlassCard>
                <GlassCard className="p-4 bg-amber-50 text-center border-amber-200">
                    <div className="text-2xl font-black text-amber-600">{stats.canceladas}</div>
                    <div className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Canceladas</div>
                </GlassCard>
                <GlassCard className="p-4 bg-blue-50 text-center border-blue-200">
                    <div className="text-2xl font-black text-blue-600">{stats.presentes}</div>
                    <div className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Presentes</div>
                </GlassCard>
                <GlassCard className="p-4 bg-purple-50 text-center border-purple-200">
                    <div className="text-2xl font-black text-purple-600">{stats.noShows}</div>
                    <div className="text-[9px] font-bold text-purple-600 uppercase tracking-widest">No-Shows</div>
                </GlassCard>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-[#003B94]/10 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Buscar por socio, DNI, consulado, rival..."
                            className="w-full bg-gray-50 border border-transparent rounded-lg py-2 pl-9 pr-4 outline-none text-xs font-bold text-[#001d4a] transition-all focus:bg-white focus:border-[#003B94]/30"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={filterStatus}
                        onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                        className="bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-xs font-bold text-[#001d4a] outline-none"
                    >
                        <option value="ALL">Todos los estados</option>
                        <option value="SOLICITADO">Solicitado</option>
                        <option value="ACEPTADO">Aceptado</option>
                        <option value="RECHAZADO">Rechazado</option>
                        <option value="CANCELADO_SOCIO">Cancelado (Socio)</option>
                        <option value="CANCELADO_ADMIN">Cancelado (Admin)</option>
                        <option value="CANCELADO_POST_ACEPTACION">Cancelado Post-Aceptación</option>
                        <option value="EXPIRADO">Expirado</option>
                    </select>

                    {/* Attendance Filter */}
                    <select
                        value={filterAttendance}
                        onChange={(e) => { setFilterAttendance(e.target.value); setCurrentPage(1); }}
                        className="bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-xs font-bold text-[#001d4a] outline-none"
                    >
                        <option value="ALL">Todas las asistencias</option>
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="PRESENTE">Presente</option>
                        <option value="AUSENTE_SIN_AVISO">Ausente sin aviso</option>
                        <option value="AUSENTE_CON_AVISO">Ausente con aviso</option>
                        <option value="ENTRADA_ANULADA">Entrada anulada</option>
                    </select>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    {/* Consulado Filter */}
                    <select
                        value={filterConsulado}
                        onChange={(e) => { setFilterConsulado(e.target.value); setCurrentPage(1); }}
                        className="bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-xs font-bold text-[#001d4a] outline-none flex-1"
                    >
                        <option value="ALL">Todos los consulados</option>
                        {consulados.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                    </select>

                    {/* Match Filter */}
                    <select
                        value={filterMatch}
                        onChange={(e) => { setFilterMatch(e.target.value); setCurrentPage(1); }}
                        className="bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-xs font-bold text-[#001d4a] outline-none flex-1"
                    >
                        <option value="ALL">Todos los partidos</option>
                        {matches.map(m => (
                            <option key={m.id} value={m.id.toString()}>
                                vs {m.rival} - {m.date}
                            </option>
                        ))}
                    </select>

                    {/* Reset Filters */}
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setFilterStatus('ALL');
                            setFilterAttendance('ALL');
                            setFilterConsulado('ALL');
                            setFilterMatch('ALL');
                            setCurrentPage(1);
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center gap-2"
                    >
                        <RotateCcw size={12} /> Limpiar
                    </button>
                </div>
            </div>

            {/* Results count */}
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {filteredHistory.length} resultado{filteredHistory.length !== 1 ? 's' : ''} encontrado{filteredHistory.length !== 1 ? 's' : ''}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-[#003B94]/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-[#003B94] to-[#001d4a] text-white">
                            <tr>
                                <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest">Fecha</th>
                                <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest">Socio</th>
                                <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest">Consulado</th>
                                <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest">Partido</th>
                                <th className="px-4 py-3 text-center text-[9px] font-black uppercase tracking-widest">Estado</th>
                                <th className="px-4 py-3 text-center text-[9px] font-black uppercase tracking-widest">Asistencia</th>
                                <th className="px-4 py-3 text-center text-[9px] font-black uppercase tracking-widest">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedHistory.length > 0 ? (
                                paginatedHistory.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="text-xs font-bold text-[#001d4a]">{formatDate(entry.created_at)}</div>
                                            <div className="text-[9px] text-gray-400">{entry.created_at?.split('T')[1]?.substring(0, 5)}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-[#003B94]/10 flex items-center justify-center text-[#003B94] font-black text-xs">
                                                    {entry.socio_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-[#001d4a]">{entry.socio_name}</div>
                                                    <div className="text-[9px] text-gray-400">
                                                        N° {entry.socio_numero || entry.socio_dni || '-'} • {entry.socio_category || '-'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-xs font-bold text-[#001d4a]">{entry.consulado_name}</div>
                                            <div className="text-[9px] text-gray-400">{entry.consulado_city}, {entry.consulado_country}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-xs font-bold text-[#001d4a]">vs {entry.match_rival}</div>
                                            <div className="text-[9px] text-gray-400">
                                                {entry.match_date} • {entry.match_competition || '-'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {getStatusBadge(entry.request_status)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {getAttendanceBadge(entry.attendance_status)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => setSelectedEntry(entry)}
                                                className="p-2 text-gray-400 hover:text-[#003B94] hover:bg-[#003B94]/10 rounded-lg transition-all"
                                                title="Ver detalles"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center">
                                        <FileText size={48} className="mx-auto mb-4 text-gray-200" />
                                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                                            No hay registros en el historial
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-[#003B94]/10 text-[#003B94] font-black uppercase text-[10px] tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#003B94]/5 transition-all"
                    >
                        <ChevronLeft size={16} /> Anterior
                    </button>
                    <span className="text-xs font-bold text-gray-500">
                        Página {currentPage} de {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-[#003B94]/10 text-[#003B94] font-black uppercase text-[10px] tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#003B94]/5 transition-all"
                    >
                        Siguiente <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {/* Detail Modal */}
            {selectedEntry && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#003B94] to-[#001d4a] p-4 text-white shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white/10 p-2 rounded-lg">
                                        <FileText size={20} className="text-[#FCB131]" />
                                    </div>
                                    <div>
                                        <h2 className="oswald text-lg font-black uppercase">Detalle de Solicitud</h2>
                                        <p className="text-[#FCB131] text-[9px] font-bold uppercase tracking-widest">
                                            ID: {selectedEntry.id.substring(0, 8)}...
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedEntry(null)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Socio Info */}
                            <div className="space-y-3">
                                <h3 className="text-[#003B94] font-black uppercase text-[10px] tracking-widest flex items-center gap-2 border-b border-[#003B94]/10 pb-2">
                                    <User size={14} /> Información del Socio
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-[9px] text-gray-400 uppercase font-bold">Nombre</div>
                                        <div className="text-sm font-bold text-[#001d4a]">{selectedEntry.socio_name}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] text-gray-400 uppercase font-bold">N° Socio</div>
                                        <div className="text-sm font-bold text-[#001d4a]">{selectedEntry.socio_numero || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] text-gray-400 uppercase font-bold">DNI</div>
                                        <div className="text-sm font-bold text-[#001d4a]">{selectedEntry.socio_dni || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] text-gray-400 uppercase font-bold">Categoría</div>
                                        <div className="text-sm font-bold text-[#001d4a]">{selectedEntry.socio_category || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] text-gray-400 uppercase font-bold">Email</div>
                                        <div className="text-sm font-bold text-[#001d4a]">{selectedEntry.socio_email || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] text-gray-400 uppercase font-bold">Teléfono</div>
                                        <div className="text-sm font-bold text-[#001d4a]">{selectedEntry.socio_phone || '-'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Consulado Info */}
                            <div className="space-y-3">
                                <h3 className="text-[#003B94] font-black uppercase text-[10px] tracking-widest flex items-center gap-2 border-b border-[#003B94]/10 pb-2">
                                    <Building2 size={14} /> Consulado
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-[9px] text-gray-400 uppercase font-bold">Nombre</div>
                                        <div className="text-sm font-bold text-[#001d4a]">{selectedEntry.consulado_name}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] text-gray-400 uppercase font-bold">Ubicación</div>
                                        <div className="text-sm font-bold text-[#001d4a]">
                                            {selectedEntry.consulado_city}, {selectedEntry.consulado_country}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Match Info */}
                            <div className="space-y-3">
                                <h3 className="text-[#003B94] font-black uppercase text-[10px] tracking-widest flex items-center gap-2 border-b border-[#003B94]/10 pb-2">
                                    <Trophy size={14} /> Partido
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-[9px] text-gray-400 uppercase font-bold">Rival</div>
                                        <div className="text-sm font-bold text-[#001d4a]">vs {selectedEntry.match_rival}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] text-gray-400 uppercase font-bold">Competición</div>
                                        <div className="text-sm font-bold text-[#001d4a]">{selectedEntry.match_competition || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] text-gray-400 uppercase font-bold">Fecha y Hora</div>
                                        <div className="text-sm font-bold text-[#001d4a]">
                                            {selectedEntry.match_date} {selectedEntry.match_hour || ''}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] text-gray-400 uppercase font-bold">Estadio</div>
                                        <div className="text-sm font-bold text-[#001d4a]">{selectedEntry.match_venue || '-'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Status Info */}
                            <div className="space-y-3">
                                <h3 className="text-[#003B94] font-black uppercase text-[10px] tracking-widest flex items-center gap-2 border-b border-[#003B94]/10 pb-2">
                                    <CheckCircle2 size={14} /> Estado de la Solicitud
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-[9px] text-gray-400 uppercase font-bold">Estado</div>
                                        <div className="mt-1">{getStatusBadge(selectedEntry.request_status)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] text-gray-400 uppercase font-bold">Asistencia</div>
                                        <div className="mt-1">{getAttendanceBadge(selectedEntry.attendance_status)}</div>
                                    </div>
                                    {selectedEntry.rejection_reason && (
                                        <div className="col-span-2">
                                            <div className="text-[9px] text-gray-400 uppercase font-bold">Razón de Rechazo</div>
                                            <div className="text-sm text-red-600">{selectedEntry.rejection_reason}</div>
                                        </div>
                                    )}
                                    {selectedEntry.cancellation_reason && (
                                        <div className="col-span-2">
                                            <div className="text-[9px] text-gray-400 uppercase font-bold">Razón de Cancelación</div>
                                            <div className="text-sm text-amber-600">{selectedEntry.cancellation_reason}</div>
                                        </div>
                                    )}
                                    {selectedEntry.absence_reason && (
                                        <div className="col-span-2">
                                            <div className="text-[9px] text-gray-400 uppercase font-bold">Razón de Ausencia</div>
                                            <div className="text-sm text-gray-600">{selectedEntry.absence_reason}</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="space-y-3">
                                <h3 className="text-[#003B94] font-black uppercase text-[10px] tracking-widest flex items-center gap-2 border-b border-[#003B94]/10 pb-2">
                                    <Calendar size={14} /> Cronología
                                </h3>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Solicitud creada:</span>
                                        <span className="font-bold text-[#001d4a]">{formatDateTime(selectedEntry.created_at)}</span>
                                    </div>
                                    {selectedEntry.processed_at && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Procesada por {selectedEntry.processed_by_name || selectedEntry.processed_by || 'Admin'}:</span>
                                            <span className="font-bold text-[#001d4a]">{formatDateTime(selectedEntry.processed_at)}</span>
                                        </div>
                                    )}
                                    {selectedEntry.attendance_recorded_at && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Asistencia registrada:</span>
                                            <span className="font-bold text-[#001d4a]">{formatDateTime(selectedEntry.attendance_recorded_at)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Admin Notes */}
                            {selectedEntry.admin_notes && (
                                <div className="space-y-3">
                                    <h3 className="text-[#003B94] font-black uppercase text-[10px] tracking-widest flex items-center gap-2 border-b border-[#003B94]/10 pb-2">
                                        <FileText size={14} /> Notas del Admin
                                    </h3>
                                    <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                                        {selectedEntry.admin_notes}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistorialHabilitaciones;
