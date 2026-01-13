import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { CheckCircle2, XCircle, AlertTriangle, Smartphone, Monitor, RefreshCw, Copy, ExternalLink } from 'lucide-react';
import { supabase, getConsuladoLogoUrl } from '../../lib/supabase';
import { dataService } from '../../services/dataService';

export const DiagnosticImages = () => {
  const [diagnosticResults, setDiagnosticResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>({});

  useEffect(() => {
    // Collecter les informations sur l'appareil
    setDeviceInfo({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      isOnline: navigator.onLine,
      cookiesEnabled: navigator.cookieEnabled,
      connection: (navigator as any).connection?.effectiveType || 'unknown'
    });
  }, []);

  const runDiagnostic = async () => {
    setLoading(true);
    const results: any[] = [];

    // Test 1: Connexion à Supabase
    try {
      const { data, error } = await supabase.from('consulados').select('count').limit(1);
      results.push({
        test: 'Connexion Supabase',
        status: error ? 'error' : 'success',
        message: error ? error.message : 'Connexion réussie',
        details: error ? error : data
      });
    } catch (e: any) {
      results.push({
        test: 'Connexion Supabase',
        status: 'error',
        message: 'Erreur de connexion',
        details: e.message
      });
    }

    // Test 2: Accès au bucket Storage
    try {
      const { data, error } = await supabase.storage.from('Logo').list('', { limit: 1 });
      results.push({
        test: 'Accès Storage bucket "logo"',
        status: error ? 'error' : 'success',
        message: error ? error.message : `Accès réussi (${data?.length || 0} fichiers)`,
        details: error ? error : data
      });
    } catch (e: any) {
      results.push({
        test: 'Accès Storage bucket "logo"',
        status: 'error',
        message: 'Erreur d\'accès au storage',
        details: e.message
      });
    }

    // Test 3: Permissions bucket
    try {
      const testPath = 'consulados/test.png';
      const { data } = supabase.storage.from('Logo').getPublicUrl(testPath);
      
      // Tester si l'URL est accessible
      const response = await fetch(data.publicUrl, { method: 'HEAD' });
      
      results.push({
        test: 'Permissions publiques du bucket',
        status: response.ok ? 'success' : 'warning',
        message: response.ok 
          ? 'Le bucket est public et accessible' 
          : `Réponse HTTP ${response.status} - Vérifier les permissions`,
        details: { url: data.publicUrl, status: response.status }
      });
    } catch (e: any) {
      results.push({
        test: 'Permissions publiques du bucket',
        status: 'warning',
        message: 'Impossible de vérifier les permissions',
        details: e.message
      });
    }

    // Test 4: Chargement d'une vraie image
    try {
      const consulados = dataService.getConsulados();
      if (consulados.length > 0) {
        const consuladoWithLogo = consulados.find(c => c.logo);
        if (consuladoWithLogo) {
          const logoUrl = getConsuladoLogoUrl(consuladoWithLogo.logo);
          
          const img = new Image();
          const loadPromise = new Promise((resolve, reject) => {
            img.onload = () => resolve(true);
            img.onerror = () => reject(new Error('Échec du chargement'));
            img.src = logoUrl;
          });

          await Promise.race([
            loadPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
          ]);

          results.push({
            test: 'Chargement image réelle',
            status: 'success',
            message: `Image chargée avec succès (${consuladoWithLogo.name})`,
            details: { url: logoUrl, dimensions: `${img.width}x${img.height}` }
          });
        } else {
          results.push({
            test: 'Chargement image réelle',
            status: 'warning',
            message: 'Aucun consulado avec logo trouvé',
            details: null
          });
        }
      }
    } catch (e: any) {
      results.push({
        test: 'Chargement image réelle',
        status: 'error',
        message: 'Échec du chargement de l\'image',
        details: e.message
      });
    }

    // Test 5: CORS et politique de sécurité
    try {
      const testUrl = supabase.storage.from('Logo').getPublicUrl('test.png').data.publicUrl;
      const corsTest = await fetch(testUrl, { 
        method: 'GET',
        mode: 'cors'
      }).catch(() => null);

      results.push({
        test: 'Configuration CORS',
        status: corsTest ? 'success' : 'error',
        message: corsTest 
          ? 'CORS configuré correctement' 
          : 'Problème de CORS détecté',
        details: corsTest ? corsTest.headers : null
      });
    } catch (e: any) {
      results.push({
        test: 'Configuration CORS',
        status: 'error',
        message: 'Erreur lors du test CORS',
        details: e.message
      });
    }

    // Test 6: URLs locales vs. production
    const settings = dataService.getAppSettings();
    results.push({
      test: 'Configuration des URLs',
      status: 'info',
      message: 'Informations sur les URLs configurées',
      details: {
        logoMenuUrl: settings.logoUrl?.substring(0, 50) + '...',
        matchLogoUrl: settings.matchLogoUrl?.substring(0, 50) + '...',
        supabaseUrl: supabase.storage.from('Logo').getPublicUrl('').data.publicUrl
      }
    });

    setDiagnosticResults(results);
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 size={20} className="text-green-500" />;
      case 'error':
        return <XCircle size={20} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-yellow-500" />;
      default:
        return <AlertTriangle size={20} className="text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copié !');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      {/* Header */}
      <GlassCard className="liquid-glass-dark p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#FCB131] rounded-xl">
              {deviceInfo.screenWidth < 768 ? <Smartphone size={28} /> : <Monitor size={28} />}
            </div>
            <div>
              <h1 className="oswald text-2xl font-black text-white uppercase">Diagnostic Images</h1>
              <p className="text-[#FCB131] text-xs font-bold uppercase tracking-wide mt-1">
                {deviceInfo.screenWidth < 768 ? 'Appareil Mobile' : 'Appareil Desktop'}
              </p>
            </div>
          </div>
          <button
            onClick={runDiagnostic}
            disabled={loading}
            className="flex items-center gap-2 bg-[#FCB131] text-[#001d4a] px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-[#FFD23F] transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Test en cours...' : 'Lancer le diagnostic'}
          </button>
        </div>
      </GlassCard>

      {/* Informations appareil */}
      <GlassCard className="p-6">
        <h2 className="text-[#003B94] font-black uppercase text-lg mb-4">Informations de l'appareil</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold mb-1">Écran</p>
            <p className="font-bold">{deviceInfo.screenWidth} x {deviceInfo.screenHeight}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold mb-1">Viewport</p>
            <p className="font-bold">{deviceInfo.viewportWidth} x {deviceInfo.viewportHeight}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold mb-1">Pixel Ratio</p>
            <p className="font-bold">{deviceInfo.devicePixelRatio}x</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold mb-1">Connexion</p>
            <p className="font-bold">{deviceInfo.isOnline ? '✅ En ligne' : '❌ Hors ligne'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold mb-1">Type réseau</p>
            <p className="font-bold uppercase">{deviceInfo.connection}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold mb-1">Cookies</p>
            <p className="font-bold">{deviceInfo.cookiesEnabled ? '✅ Activés' : '❌ Désactivés'}</p>
          </div>
        </div>
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-gray-500 font-bold uppercase">User Agent</summary>
          <p className="mt-2 text-xs font-mono bg-gray-50 p-2 rounded break-all">{deviceInfo.userAgent}</p>
        </details>
      </GlassCard>

      {/* Résultats des tests */}
      {diagnosticResults.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-[#003B94] font-black uppercase text-lg">Résultats des tests</h2>
          
          {diagnosticResults.map((result, index) => (
            <GlassCard key={index} className={`p-4 border-2 ${getStatusColor(result.status)}`}>
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-1">{getStatusIcon(result.status)}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-sm uppercase text-[#001d4a]">{result.test}</h3>
                  <p className="text-sm mt-1">{result.message}</p>
                  
                  {result.details && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-gray-500 font-bold uppercase">Détails</summary>
                      <pre className="mt-2 text-xs bg-white p-2 rounded overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Solutions recommandées */}
      {diagnosticResults.some(r => r.status === 'error' || r.status === 'warning') && (
        <GlassCard className="p-6 bg-blue-50 border-2 border-blue-200">
          <h2 className="text-[#003B94] font-black uppercase text-lg mb-4">Solutions recommandées</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-[#003B94] font-bold">1.</span>
              <span>Vérifiez que le bucket <code className="bg-white px-1 rounded">'logo'</code> a les permissions <strong>publiques</strong> activées dans Supabase Storage</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#003B94] font-bold">2.</span>
              <span>Sur tablette, videz le cache du navigateur et rechargez la page</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#003B94] font-bold">3.</span>
              <span>Vérifiez que la configuration CORS de Supabase autorise votre domaine</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#003B94] font-bold">4.</span>
              <span>Si sur iOS/Safari, vérifiez les paramètres de confidentialité (bloqueur de contenu)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#003B94] font-bold">5.</span>
              <span>Testez avec une connexion réseau différente (Wi-Fi vs. 4G/5G)</span>
            </li>
          </ul>
        </GlassCard>
      )}
    </div>
  );
};

export default DiagnosticImages;
