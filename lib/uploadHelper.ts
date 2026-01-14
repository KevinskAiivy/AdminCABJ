import { supabase } from './supabase';

/**
 * Helper pour uploader un fichier ET l'enregistrer automatiquement dans la table uploaded_files
 */
export interface UploadOptions {
  bucket: string;                    // Nom du bucket (ex: 'Logo')
  folder: string;                    // Dossier (ex: 'consulados', 'socios')
  entityType: string;                // Type d'entité (ex: 'consulado', 'socio')
  entityId: string;                  // ID de l'entité
  fieldName: string;                 // Nom du champ (ex: 'logo', 'banner', 'avatar')
  file: File;                        // Fichier à uploader
  userId?: string;                   // ID de l'utilisateur (optionnel)
}

export interface UploadResult {
  success: boolean;
  filePath: string | null;
  publicUrl: string | null;
  error: string | null;
}

/**
 * Upload un fichier dans Storage ET enregistre dans uploaded_files
 */
export const uploadFileWithTracking = async (options: UploadOptions): Promise<UploadResult> => {
  const { bucket, folder, entityType, entityId, fieldName, file, userId } = options;

  try {
    // 1. Générer le nom du fichier avec un UUID unique pour éviter les conflits
    const timestamp = Date.now();
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${folder}/${entityType}_${entityId}_${fieldName}_${timestamp}_${uniqueId}.${fileExtension}`;

    console.log('📤 Tentative d\'upload vers:', bucket, '/', fileName);

    // 2. Upload vers Storage avec upsert: true pour remplacer si existe
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true  // Remplacer si existe déjà
      });

    if (uploadError) {
      console.error('❌ Erreur Supabase Storage:', uploadError);
      
      // Erreurs courantes
      if (uploadError.message.includes('Bucket not found')) {
        throw new Error(`Le bucket "${bucket}" n'existe pas dans Supabase Storage. Créez-le d'abord.`);
      }
      if (uploadError.message.includes('not allowed') || uploadError.message.includes('policy')) {
        throw new Error(`Permissions insuffisantes pour le bucket "${bucket}". Vérifiez les policies RLS.`);
      }
      if (uploadError.message.includes('Payload too large')) {
        throw new Error('Le fichier est trop volumineux. Maximum 50MB.');
      }
      
      throw new Error(`Erreur upload: ${uploadError.message}`);
    }

    console.log('✅ Upload réussi:', uploadData?.path || fileName);

    // 3. Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      console.warn('⚠️ Impossible de récupérer l\'URL publique, utilisation du chemin');
    }
    
    const publicUrl = urlData?.publicUrl || null;

    // 4. Enregistrer dans la table uploaded_files (optionnel - ne bloque pas l'upload)
    try {
      const { error: dbError } = await supabase
        .from('uploaded_files')
        .insert({
          file_path: fileName,
          file_name: file.name,
          bucket_name: bucket,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: userId || null,
          entity_type: entityType,
          entity_id: entityId,
          field_name: fieldName,
          public_url: publicUrl,
          is_active: true,
          uploaded_at: new Date().toISOString()
        });

      if (dbError) {
        // Table non existante ou erreur - on continue quand même
        console.warn('⚠️ Table uploaded_files non disponible (optionnel):', dbError.message);
      } else {
        console.log('✅ Fichier enregistré dans uploaded_files');
      }
    } catch (dbError: any) {
      console.warn('⚠️ Impossible d\'enregistrer dans uploaded_files:', dbError.message);
    }

    return {
      success: true,
      filePath: fileName,
      publicUrl: publicUrl,
      error: null
    };

  } catch (error: any) {
    console.error('Erreur uploadFileWithTracking:', error);
    return {
      success: false,
      filePath: null,
      publicUrl: null,
      error: error.message || 'Erreur inconnue'
    };
  }
};

/**
 * Marquer un fichier comme supprimé (soft delete)
 */
export const markFileAsDeleted = async (filePath: string): Promise<void> => {
  try {
    await supabase
      .from('uploaded_files')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString()
      })
      .eq('file_path', filePath);
  } catch (error) {
    console.error('Erreur markFileAsDeleted:', error);
  }
};

/**
 * Récupérer tous les fichiers d'une entité
 */
export const getEntityFiles = async (entityType: string, entityId: string) => {
  try {
    const { data, error } = await supabase
      .from('uploaded_files')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('is_active', true)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erreur getEntityFiles:', error);
    return [];
  }
};

/**
 * Récupérer les statistiques d'upload
 */
export const getUploadStats = async () => {
  try {
    const { data, error } = await supabase
      .from('uploaded_files')
      .select('entity_type, file_size, is_active')
      .eq('is_active', true);

    if (error) throw error;

    const stats = {
      totalFiles: data?.length || 0,
      totalSize: data?.reduce((sum, f) => sum + (f.file_size || 0), 0) || 0,
      byType: {} as Record<string, number>
    };

    data?.forEach(file => {
      const type = file.entity_type || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Erreur getUploadStats:', error);
    return { totalFiles: 0, totalSize: 0, byType: {} };
  }
};
