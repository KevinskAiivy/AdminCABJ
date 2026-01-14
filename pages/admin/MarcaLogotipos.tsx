import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { Upload, Image as ImageIcon, Loader2, Save, RefreshCw, Trash2, CheckCircle2, Database, HardDrive } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { AppAsset } from '../../types';
import { uploadFileWithTracking } from '../../lib/uploadHelper';

/**
 * Page de gestion des logos et assets de la marque
 * Tous les logos sont stockés dans la table app_assets
 * Chargés au démarrage de l'application
 */
export const MarcaLogotipos = () => {
  const [assets, setAssets] = useState<AppAsset[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssets();
    // S'abonner aux changements
    const unsubscribe = dataService.subscribe(() => {
      setAssets(dataService.getAppAssets());
    });
    return () => unsubscribe();
  }, []);

  const loadAssets = async () => {
    setLoading(true);
    try {
      await dataService.loadAppAssets();
      setAssets(dataService.getAppAssets());
    } catch (error) {
      console.error('Erreur chargement assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (assetKey: string, file: File) => {
    setUploading(assetKey);
    try {
      await dataService.uploadAssetFile(assetKey, file);
      alert('Logo mis à jour avec succès !');
    } catch (error: any) {
      alert('Erreur : ' + error.message);
    } finally {
      setUploading(null);
    }
  };

  // Grouper les assets par catégorie
  const assetsByCategory = {
    navbar: assets.filter(a => a.category === 'navbar'),
    general: assets.filter(a => a.category === 'general'),
    icons: assets.filter(a => a.category === 'icons'),
    footer: assets.filter(a => a.category === 'footer')
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#003B94]" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-black text-[#003B94] mb-2">
              🎨 Marca & Logotipos
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              Gérez tous les logos de l'application. Les changements sont appliqués immédiatement.
            </p>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2 text-green-600">
                <HardDrive size={14} />
                <span className="font-bold">Storage:</span>
                <span>Bucket "Logo" → assets/</span>
              </div>
              <div className="flex items-center gap-2 text-blue-600">
                <Database size={14} />
                <span className="font-bold">Table:</span>
                <span>app_assets</span>
              </div>
              <div className="flex items-center gap-2 text-purple-600">
                <CheckCircle2 size={14} />
                <span className="font-bold">{assets.filter(a => a.file_url).length}/{assets.length}</span>
                <span>uploadés</span>
              </div>
            </div>
          </div>
          <button
            onClick={loadAssets}
            className="flex items-center gap-2 px-4 py-2 bg-[#003B94] text-white rounded-xl font-bold text-sm hover:bg-[#001d4a] transition-all"
          >
            <RefreshCw size={16} />
            Actualiser
          </button>
        </div>
      </GlassCard>

      {/* Navbar Logos */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-black text-[#003B94] mb-4 flex items-center gap-2">
          <ImageIcon size={20} />
          Logos Navigation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assetsByCategory.navbar.map(asset => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onUpload={handleUpload}
              uploading={uploading === asset.asset_key}
            />
          ))}
        </div>
      </GlassCard>

      {/* General Logos */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-black text-[#003B94] mb-4 flex items-center gap-2">
          <ImageIcon size={20} />
          Logos Généraux
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assetsByCategory.general.slice(0, 6).map(asset => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onUpload={handleUpload}
              uploading={uploading === asset.asset_key}
            />
          ))}
        </div>
      </GlassCard>

      {/* Icons & Favicons */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-black text-[#003B94] mb-4 flex items-center gap-2">
          <ImageIcon size={20} />
          Icônes & Favicons
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {assetsByCategory.icons.slice(0, 8).map(asset => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onUpload={handleUpload}
              uploading={uploading === asset.asset_key}
              compact
            />
          ))}
        </div>
      </GlassCard>

      {/* Footer Logos */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-black text-[#003B94] mb-4 flex items-center gap-2">
          <ImageIcon size={20} />
          Logos Footer
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assetsByCategory.footer.map(asset => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onUpload={handleUpload}
              uploading={uploading === asset.asset_key}
            />
          ))}
        </div>
      </GlassCard>
    </div>
  );
};

// Composant pour afficher un asset
const AssetCard = ({ 
  asset, 
  onUpload, 
  uploading,
  compact = false
}: { 
  asset: AppAsset; 
  onUpload: (key: string, file: File) => void;
  uploading: boolean;
  compact?: boolean;
}) => {
  const imageUrl = dataService.getAssetUrl(asset.asset_key);
  const hasFile = asset.file_url !== null;

  return (
    <div className={`border-2 rounded-xl p-4 hover:border-[#003B94] transition-all ${hasFile ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-bold text-sm text-[#001d4a]">{asset.name}</h4>
          {!compact && asset.description && (
            <p className="text-xs text-gray-500 mt-1">{asset.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasFile ? (
            <>
              <HardDrive size={14} className="text-green-600" title="Stocké dans Storage" />
              <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
            </>
          ) : (
            <span className="text-xs text-gray-400 font-bold">SVG</span>
          )}
        </div>
      </div>

      {/* Aperçu de l'image */}
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center mb-3 ${compact ? 'h-24' : 'h-32'}`}>
        <img 
          src={imageUrl}
          alt={asset.name}
          className="max-w-full max-h-full object-contain p-2"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      {/* Métadonnées */}
      {!compact && (
        <div className="text-xs text-gray-500 mb-3 space-y-1">
          {hasFile && (
            <div className="flex items-center gap-2 text-green-600 font-bold mb-2">
              <HardDrive size={12} />
              <span>Stocké dans Storage</span>
            </div>
          )}
          {asset.display_size && (
            <div>📐 Taille affichage: {asset.display_size}px</div>
          )}
          {asset.file_type && (
            <div>📄 Type: {asset.file_type}</div>
          )}
          {asset.file_size && (
            <div>💾 Poids: {(asset.file_size / 1024).toFixed(1)} KB</div>
          )}
          {asset.file_url && (
            <div className="text-[10px] text-gray-400 truncate" title={asset.file_url}>
              📂 {asset.file_url}
            </div>
          )}
        </div>
      )}

      {/* Upload */}
      <div className="relative">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(asset.asset_key, file);
          }}
          disabled={uploading}
          className="hidden"
          id={`upload-${asset.asset_key}`}
        />
        <label
          htmlFor={`upload-${asset.asset_key}`}
          className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg font-bold text-xs uppercase tracking-wider cursor-pointer transition-all ${
            uploading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-[#FCB131] text-[#001d4a] hover:bg-[#FFD23F]'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Upload...
            </>
          ) : (
            <>
              <Upload size={14} />
              {hasFile ? 'Remplacer' : 'Upload'}
            </>
          )}
        </label>
      </div>
    </div>
  );
};
