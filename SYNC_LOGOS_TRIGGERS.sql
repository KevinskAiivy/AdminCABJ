-- Triggers pour synchroniser automatiquement les logos entre consulados et logos
-- À exécuter dans l'éditeur SQL de Supabase

-- ============================================
-- TRIGGER 1 : Synchroniser lors de l'insertion d'un consulado
-- ============================================
CREATE OR REPLACE FUNCTION sync_logos_on_consulado_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Créer une entrée dans logos si le consulado a un logo ou banner
    IF NEW.logo IS NOT NULL OR NEW.banner IS NOT NULL THEN
        INSERT INTO public.logos (consulado_id, marco_url, logotipo_url, created_at, updated_at)
        VALUES (NEW.id, NEW.logo, NEW.banner, NOW(), NOW())
        ON CONFLICT (consulado_id) DO UPDATE SET
            marco_url = EXCLUDED.marco_url,
            logotipo_url = EXCLUDED.logotipo_url,
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_logos_on_insert
    AFTER INSERT ON public.consulados
    FOR EACH ROW
    EXECUTE FUNCTION sync_logos_on_consulado_insert();

-- ============================================
-- TRIGGER 2 : Synchroniser lors de la modification d'un consulado
-- ============================================
CREATE OR REPLACE FUNCTION sync_logos_on_consulado_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Si le logo ou le banner a changé
    IF NEW.logo IS DISTINCT FROM OLD.logo OR NEW.banner IS DISTINCT FROM OLD.banner THEN
        -- Insérer ou mettre à jour dans la table logos
        INSERT INTO public.logos (consulado_id, marco_url, logotipo_url, created_at, updated_at)
        VALUES (NEW.id, NEW.logo, NEW.banner, NOW(), NOW())
        ON CONFLICT (consulado_id) DO UPDATE SET
            marco_url = EXCLUDED.marco_url,
            logotipo_url = EXCLUDED.logotipo_url,
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_logos_on_update
    AFTER UPDATE ON public.consulados
    FOR EACH ROW
    EXECUTE FUNCTION sync_logos_on_consulado_update();

-- ============================================
-- TRIGGER 3 : Supprimer les logos si le consulado est supprimé
-- ============================================
CREATE OR REPLACE FUNCTION delete_logos_on_consulado_delete()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.logos WHERE consulado_id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_delete_logos_on_delete
    BEFORE DELETE ON public.consulados
    FOR EACH ROW
    EXECUTE FUNCTION delete_logos_on_consulado_delete();

-- ============================================
-- TRIGGER BIDIRECTIONNEL : Sync logos → consulados
-- ============================================
-- Si on modifie la table logos, mettre à jour consulados aussi

CREATE OR REPLACE FUNCTION sync_consulados_on_logos_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour les colonnes logo et banner dans consulados
    UPDATE public.consulados
    SET 
        logo = NEW.marco_url,
        banner = NEW.logotipo_url
    WHERE id = NEW.consulado_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_consulados_on_logos_update
    AFTER UPDATE ON public.logos
    FOR EACH ROW
    EXECUTE FUNCTION sync_consulados_on_logos_update();

-- Vérification
SELECT 'Triggers créés avec succès!' AS status;
