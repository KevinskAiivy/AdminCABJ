// Fonction utilitaire pour formater une date au format jj-mm-aaaa
// Accepte les formats: YYYY-MM-DD, DD/MM/YYYY, jj-mm-aaaa
export const formatDateDisplay = (dateStr: string | null | undefined): string => {
    if (!dateStr || dateStr.trim() === '') return '--/--/----';
    
    // Format DB : YYYY-MM-DD
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = dateStr.split('-');
        return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    }
    
    // Format DD/MM/YYYY
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [d, m, y] = dateStr.split('/');
        return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    }
    
    // Format jj-mm-aaaa (déjà au bon format)
    if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
        return dateStr;
    }
    
    // Si la date est dans un autre format, essayer de la parser
    try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            const d = String(date.getDate()).padStart(2, '0');
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const y = String(date.getFullYear());
            return `${d}-${m}-${y}`;
        }
    } catch (e) {
        // Ignorer les erreurs de parsing
    }
    
    return dateStr;
};

// Fonction pour convertir une date format affichage (jj-mm-aaaa ou DD/MM/YYYY) vers format DB (YYYY-MM-DD)
// Retourne null si la date est vide pour éviter les erreurs SQL
export const formatDateToDB = (dateStr: string | null | undefined): string | null => {
    if (!dateStr || dateStr.trim() === '') return null;
    
    // Format jj-mm-aaaa
    if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
        const [d, m, y] = dateStr.split('-');
        return `${y}-${m}-${d}`;
    }
    
    // Format DD/MM/YYYY
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [d, m, y] = dateStr.split('/');
        return `${y}-${m}-${d}`;
    }
    
    // Si déjà au format DB (YYYY-MM-DD), on le garde
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
    }
    
    return null;
};

// Fonction pour convertir une date DB (YYYY-MM-DD) vers format affichage (jj-mm-aaaa)
export const formatDateFromDB = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    
    // Format DB : YYYY-MM-DD
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = dateStr.split('-');
        return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    }
    
    // Format MM/YYYY (pour last_month_paid parfois)
    if (dateStr.length === 7 && dateStr.includes('/')) {
        return `01-${dateStr.replace('/', '-')}`;
    }
    
    // Si déjà au format jj-mm-aaaa, on le garde
    if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
        return dateStr;
    }
    
    // Si au format DD/MM/YYYY, on le convertit
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [d, m, y] = dateStr.split('/');
        return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    }
    
    return dateStr;
};
