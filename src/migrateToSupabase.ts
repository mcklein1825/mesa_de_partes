import { supabase } from './supabaseClient';

/**
 * SCRIPT DE MIGRACIÓN ÚNICA: localStorage -> Supabase
 * Ejecutar desde la consola del navegador: window.migrateData()
 */

const migrateData = async () => {
  console.log('🚀 Iniciando migración a Supabase...');
  
  // 1. Obtener datos locales
  const localExpedientes = JSON.parse(localStorage.getItem('mp_expedientes') || '[]');
  const localAreas = JSON.parse(localStorage.getItem('mp_areas') || '[]');
  
  if (localExpedientes.length === 0) {
    alert('⚠️ No hay datos en localStorage para migrar.');
    return;
  }

  console.log(`📦 Encontrados ${localExpedientes.length} expedientes locales.`);

  const report = { success: 0, failed: 0, errors: [] };
  const areaMap = new Map<string, string>(); // Mapa: Nombre Area -> UUID Supabase
  const remitenteMap = new Map<string, string>(); // Mapa: Nombre Remitente -> UUID Supabase

  // 2. Sincronizar Áreas
  console.log('📍 Sincronizando áreas...');
  for (const area of localAreas) {
    // Buscar si existe
    const { data: existing } = await supabase
      .from('areas')
      .select('id')
      .eq('nombre', area.nombre)
      .single();

    if (existing) {
      areaMap.set(area.nombre, existing.id);
    } else {
      // Crear si no existe
      const { data: created, error } = await supabase
        .from('areas')
        .insert({ nombre: area.nombre, codigo: area.codigo || area.nombre.toUpperCase(), activa: true })
        .select('id')
        .single();
      
      if (created) areaMap.set(area.nombre, created.id);
      else console.warn(`❌ Error área ${area.nombre}:`, error);
    }
  }

  // 3. Migrar Expedientes
  console.log('📝 Migrando expedientes...');
  
  for (const exp of localExpedientes) {
    try {
      // A. Preparar Remitente
      let remitenteId = null;
      if (exp.remitenteNombre) {
        if (!remitenteMap.has(exp.remitenteNombre)) {
          const { data: remData } = await supabase
            .from('remitentes')
            .insert({ 
              nombre_o_razon_social: exp.remitenteNombre,
              tipo_identificacion: exp.remitenteTipo === 'DNI' ? 'DNI' : 'RUC',
              numero_identificacion: exp.remitenteDocumento || null,
              cargo: exp.remitenteCargo || null
            })
            .select('id')
            .single();
          
          if (remData) remitenteMap.set(exp.remitenteNombre, remData.id);
        }
        remitenteId = remitenteMap.get(exp.remitenteNombre) || null;
      }

      // B. Obtener IDs de Áreas
      const areaOrigenId = areaMap.get(exp.areaOrigem) || areaMap.get('Mesa de Partes');
      const areaDestinoId = areaMap.get(exp.areaDestino) || areaOrigenId;

      // C. Calcular fecha límite (si no existe)
      let fechaLimite = exp.fechaLimite;
      if (!fechaLimite && exp.fechaIngreso) {
        const fechaIng = new Date(exp.fechaIngreso);
        fechaIng.setDate(fechaIng.getDate() + 7); // Plazo default 7 días
        fechaLimite = fechaIng.toISOString();
      }

      // D. Insertar Expediente
      const { data: expData, error: expError } = await supabase
        .from('expedientes')
        .insert({
          numero_expediente: exp.numero,
          anio: parseInt(exp.numero.split('-')[1] || new Date().getFullYear()),
          correlativo: parseInt(exp.numero.split('-')[2] || '1'),
          asunto: exp.asunto,
          estado: exp.estado || 'Pendiente',
          prioridad: exp.prioridad || 'Normal',
          remitente_id: remitenteId,
          area_origen_id: areaOrigenId,
          area_destino_id: areaDestinoId,
          ubicacion_actual_id: areaDestinoId,
          fecha_ingreso: exp.fechaIngreso || new Date().toISOString(),
          fecha_limite: fechaLimite,
          folios: exp.folios || 0,
          anexos: exp.anexos || 0,
          contenido: exp.contenido || '',
          registrado_por: null // O el ID del usuario actual si está logueado
        })
        .select('id')
        .single();

      if (expError) throw expError;

      // E. Insertar Movimiento Inicial (Trazabilidad)
      if (expData && exp.historial && exp.historial.length > 0) {
        const movimientos = exp.historial.map((h: any) => ({
          expediente_id: expData.id,
          accion: h.accion || 'Registro',
          area_origen_id: areaMap.get(h.origen) || areaOrigenId,
          area_destino_id: areaMap.get(h.destino) || areaDestinoId,
          fecha_salida: h.fecha,
          observacion: h.nota || ''
        }));

        await supabase.from('movimientos').insert(movimientos);
      }

      report.success++;
      console.log(`✅ Migrado: ${exp.numero}`);

    } catch (error: any) {
      report.failed++;
      report.errors.push({ numero: exp.numero, error: error.message });
      console.error(`❌ Falló ${exp.numero}:`, error);
    }
  }

  // 4. Reporte Final
  console.group('🏁 REPORTE DE MIGRACIÓN');
  console.log(`✅ Exitosos: ${report.success}`);
  console.log(`❌ Fallidos: ${report.failed}`);
  if (report.errors.length > 0) console.table(report.errors);
  console.groupEnd();

  if (report.failed === 0 && report.success > 0) {
    const confirmCleanup = confirm('✨ ¡Migración completada con éxito! ¿Deseas limpiar el localStorage ahora? (Esto no se puede deshacer)');
    if (confirmCleanup) {
      localStorage.removeItem('mp_expedientes');
      localStorage.removeItem('mp_areas');
      alert('🧹 localStorage limpiado. La página se recargará para usar Supabase.');
      window.location.reload();
    }
  } else {
    alert('⚠️ Migración finalizada con errores. Revisa la consola (F12) para detalles. No se ha borrado nada localmente.');
  }
};

// Exponer función globalmente para ejecutar en consola
(window as any).migrateData = migrateData;
console.log('🛠️ Script cargado. Ejecuta "window.migrateData()" en la consola para iniciar.');
