
/**
 * Retourne le label genré approprié selon le genre du socio
 * @param role - Le rôle (PRESIDENTE, REFERENTE, SOCIO, etc.)
 * @param gender - Le genre (M, F, X)
 * @returns Le label genré
 */
export const getGenderRoleLabel = (role: string, gender: 'M' | 'F' | 'X' = 'M'): string => {
    const roleUpper = role.toUpperCase();
    
    if (roleUpper === 'PRESIDENTE') {
        if (gender === 'F') return 'Presidenta';
        if (gender === 'X') return 'Presidentx';
        return 'Presidente';
    }
    
    if (roleUpper === 'REFERENTE') {
        if (gender === 'F') return 'Referenta';
        if (gender === 'X') return 'Referentx';
        return 'Referente';
    }
    
    if (roleUpper === 'SOCIO') {
        if (gender === 'F') return 'Socia';
        if (gender === 'X') return 'Socia';
        return 'Socio';
    }
    
    // Pour les autres rôles, retourner tel quel
    return role;
};

/**
 * Retourne un label de texte genré
 * @param label - Le label de base
 * @param gender - Le genre (M, F, X)
 * @returns Le label genré
 */
export const getGenderLabel = (label: string, gender: 'M' | 'F' | 'X' = 'M'): string => {
    if (label === 'Socio') return gender === 'F' ? 'Socia' : gender === 'X' ? 'Socix' : 'Socio';
    if (label === 'Nacido') return gender === 'F' ? 'Nacida' : gender === 'X' ? 'Nacidx' : 'Nacido';
    if (label === 'Datos del Socio') return gender === 'F' ? 'Datos Socia' : gender === 'X' ? 'Datos Socix' : 'Datos Socio';
    if (label === 'Presidente') return gender === 'F' ? 'Presidenta' : gender === 'X' ? 'Presidentx' : 'Presidente';
    if (label === 'Referente') return gender === 'F' ? 'Referenta' : gender === 'X' ? 'Referentx' : 'Referente';
    if (label === 'N° Socio' || label === 'N° Socio:') return gender === 'F' ? 'N° Socia:' : gender === 'X' ? 'N° Socix:' : 'N° Socio:';
    if (label === 'Numéro de Socio') return gender === 'F' ? 'Numéro Socia' : gender === 'X' ? 'Numéro Socix' : 'Numéro Socio';
    return label;
};
