const pool = require('../db/pool');
async function validateScan(step, barcode, context, selectedPcb = null) {
    let query, params;

    // Validación del Stencil
    if (step === 'stencil') {
        // 1. Primero buscamos el/los stencil(s) con ese barcode
        query = `
            SELECT s.pn_pcb, s.model_side, s.st_status
            FROM stencils s
            WHERE s.st_bc = $1
        `;
        params = [barcode];
        const { rows: stencilRows } = await pool.query(query, params);

        if (stencilRows.length === 0) throw new Error('Stencil no encontrado.');

        // 2. Filtramos stencils que estén OK
        const validStencils = stencilRows.filter(r => r.st_status === 'OK');
        if (validStencils.length === 0) {
            throw new Error(`El Stencil existe pero su estatus no es "OK" (${stencilRows[0].st_status}).`);
        }

        // 3. Por cada stencil válido, buscamos QUÉ MODELOS lo pueden usar
        // Un modelo puede usar un stencil si:
        //   a) El stencil tiene el mismo pn_pcb y model_side del modelo
        //   b) O si el modelo tiene stencil_pcb apuntando al pn_pcb del stencil
        
        const allOptions = [];
        
        for (const stencil of validStencils) {
            // a) Modelos que usan directamente este stencil (mismo pn_pcb)
            const directQuery = `
                SELECT pn_pcb, model_side, model_name
                FROM models
                WHERE pn_pcb = $1 AND model_side = $2
            `;
            const directResult = await pool.query(directQuery, [stencil.pn_pcb, stencil.model_side]);
            
            // b) Modelos que tienen stencil_pcb apuntando a este stencil
            const indirectQuery = `
                SELECT pn_pcb, model_side, model_name
                FROM models
                WHERE stencil_pcb = $1 AND model_side = $2
            `;
            const indirectResult = await pool.query(indirectQuery, [stencil.pn_pcb, stencil.model_side]);
            
            // Combinamos ambos resultados
            allOptions.push(...directResult.rows, ...indirectResult.rows);
        }

        // 4. Eliminamos duplicados (por si acaso)
        const uniqueOptions = Array.from(
            new Map(allOptions.map(item => [`${item.pn_pcb}_${item.model_side}`, item])).values()
        );

        if (uniqueOptions.length === 0) {
            throw new Error('No se encontraron modelos asociados a este stencil.');
        }

        let targetModel = null;

        // 5. LÓGICA DE DESAMBIGUACIÓN
        if (uniqueOptions.length > 1) {
            // HAY MÁS DE UN MODELO QUE USA ESTE STENCIL

            // CASO A: El usuario YA seleccionó uno (viene en selectedPcb)
            if (selectedPcb) {
                targetModel = uniqueOptions.find(m => m.pn_pcb === selectedPcb);
                if (!targetModel) {
                    throw new Error('El modelo seleccionado no coincide con el Stencil escaneado.');
                }
            }
            // CASO B: No ha seleccionado nada, devolvemos las opciones al Frontend
            else {
                return {
                    success: false,
                    multipleMatches: true,
                    options: uniqueOptions.map(m => ({
                        pn_pcb: m.pn_pcb,
                        model_name: m.model_name || 'Desconocido',
                        model_side: m.model_side
                    }))
                };
            }
        } else {
            // Solo hay un modelo posible, procedemos normal
            targetModel = uniqueOptions[0];
        }

        // Si llegamos aquí, ya tenemos un targetModel definido
        return {
            success: true,
            nextContext: {
                pn_pcb: targetModel.pn_pcb,
                model_side: targetModel.model_side
            }
        };
    }

    // ... EL RESTO DEL CÓDIGO (Validación squeegee, plate, pasta) SE MANTIENE IGUAL ...
    // (Solo copia y pega el resto de tu función validateScan original aquí abajo)
    if (!context || !context.pn_pcb || !context.model_side) {
        throw new Error('Contexto inválido. Escanee un stencil primero.');
    }

    const modelQuery = 'SELECT length, pasta, plate_pcb, stencil_pcb FROM models WHERE pn_pcb = $1 AND model_side = $2';
    const modelResult = await pool.query(modelQuery, [context.pn_pcb, context.model_side]);
    const model = modelResult.rows[0];
    if (!model) throw new Error('Receta no encontrada para el modelo y lado correspondientes.');

    switch (step) {
        case 'squeegee_f':
        case 'squeegee_r':
        case 'squeegee_y':
            // Lógica de Squeegee (sin cambios)
            query = 'SELECT sq_length, sq_status, sq_side FROM squeegees WHERE sq_bc = $1';
            const { rows: squeegeeRows } = await pool.query(query, [barcode]);
            const squeegee = squeegeeRows[0];
            if (!squeegee) throw new Error('Squeegee no encontrado.');
            if (squeegee.sq_status !== 'OK') throw new Error(`El status del Squeegee es ${squeegee.sq_status}, se requiere "OK".`);
            if (squeegee.sq_length !== model.length) throw new Error(`Largo de Squeegee incorrecto. Requerido: ${model.length}, Escaneado: ${squeegee.sq_length}.`);
            if (step === 'squeegee_f' && squeegee.sq_side !== 'F') throw new Error('Se requiere un Squeegee lado F.');
            if (step === 'squeegee_r' && squeegee.sq_side !== 'R') throw new Error('Se requiere un Squeegee lado R.');
            if (step === 'squeegee_y' && squeegee.sq_side !== 'Y') throw new Error('Se requiere un Squeegee lado Y.');
            return { success: true };

        case 'plate':
            // Lógica de Plate
            query = 'SELECT pn_pcb, pl_status FROM plates WHERE pl_bc = $1';
            const { rows: plateRows } = await pool.query(query, [barcode]);
            const plate = plateRows[0];
            if (!plate) throw new Error('Plate no encontrado.');
            if (plate.pl_status !== 'OK') throw new Error(`El status del Plate es ${plate.pl_status}, se requiere "OK".`);

            // Si el modelo tiene un 'plate_pcb' específico definido por el admin, usamos ese.
            // Si es null/vacío, usamos el pn_pcb del contexto (comportamiento normal).
            const requiredPlatePcb = model.plate_pcb || context.pn_pcb;

            if (plate.pn_pcb !== requiredPlatePcb) {
                throw new Error(`PN de Plate incorrecto. Requerido: ${requiredPlatePcb}, Escaneado: ${plate.pn_pcb}.`);
            }
            // --------------------------

            return { success: true };

        // --- LÓGICA MODIFICADA PARA EXTRAER VALOR DE PASTA ---
        case 'pasta':
            if (!barcode) {
                throw new Error('No se escaneó el barcode de la pasta.');
            }

            // 1. VALIDACIÓN ESTRICTA: Debe tener comas (DataMatrix)
            if (!barcode.includes(',')) {
                throw new Error("Formato inválido. Por favor escanee el código datamatrix completo (el que contiene comas).");
            }

            // 2. Dividimos el barcode escaneado por la coma
            const parts = barcode.split(',');

            // 3. Verificamos que tenga estructura lógica (Lote, PN, ...)
            if (parts.length < 2) {
                throw new Error(`Formato de pasta incompleto. Se esperaba Lote,PN,... pero se recibió "${barcode}".`);
            }

            // 4. Extraemos la segunda parte (PN)
            const extractedPastaValue = parts[1].trim();

            // 5. Comparamos la parte extraída con el valor exacto de la receta
            if (extractedPastaValue !== model.pasta) {
                throw new Error(`Pasta incorrecta. Requerida: ${model.pasta}, Valor extraído del escaneo: ${extractedPastaValue}.`);
            }

            return { success: true };

        default:
            throw new Error('Paso de validación desconocido.');
    }
}


async function logProduction(logData) {
    // 1. Descomponemos los datos que nos pasó el CONTROLLER
    //    'user' (el inseguro) ya no existe, ahora tenemos 'userEmployee'
    const { line, context, barcodes, userEmployee } = logData;

    const { pn_pcb, model_side } = context;

    // ... (la lógica para buscar model_name no cambia) ...
    const modelNameQuery = 'SELECT model_name FROM models WHERE pn_pcb = $1 LIMIT 1';
    const modelNameResult = await pool.query(modelNameQuery, [pn_pcb]);
    const model_name = modelNameResult.rows[0]?.model_name || 'N/A';
    const client = await pool.connect();
    // 2. Modificamos la consulta para usar el dato nuevo
    const query = `
        INSERT INTO production_log 
        (line_number, pn_pcb, model_name, model_side, stencil_bc, squeegee_f_bc, squeegee_r_bc, squeegee_y_bc, plate_bc, pasta_lot, username)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;
    try {
        // Iniciar transacción
        await client.query('BEGIN');

        // 1. Insertar en el log de producción (tu código original)
        const logQuery = `
            INSERT INTO production_log 
            (line_number, pn_pcb, model_name, model_side, stencil_bc, squeegee_f_bc, squeegee_r_bc, squeegee_y_bc, plate_bc, pasta_lot, username)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `;
        const logParams = [
            line,
            pn_pcb,
            model_name,
            model_side,
            barcodes.stencil,
            barcodes.squeegee_f || null,
            barcodes.squeegee_r || null,
            barcodes.squeegee_y || null,
            barcodes.plate,
            barcodes.pasta,
            userEmployee
        ];
        await client.query(logQuery, logParams);

        // 2. Actualizar la tabla 'active_tooling'
        // Esto "intercambia" el herramental activo por el nuevo que acabas de validar
        const activeToolingQuery = `
            INSERT INTO active_tooling 
            (line_number, stencil_bc, squeegee_f_bc, squeegee_r_bc, squeegee_y_bc, plate_bc, last_updated)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            ON CONFLICT (line_number) DO UPDATE SET
                stencil_bc = EXCLUDED.stencil_bc,
                squeegee_f_bc = EXCLUDED.squeegee_f_bc,
                squeegee_r_bc = EXCLUDED.squeegee_r_bc,
                squeegee_y_bc = EXCLUDED.squeegee_y_bc,
                plate_bc = EXCLUDED.plate_bc,
                last_updated = CURRENT_TIMESTAMP;
        `;
        const activeToolingParams = [
            line,
            barcodes.stencil,
            barcodes.squeegee_f || null,
            barcodes.squeegee_r || null,
            barcodes.squeegee_y || null,
            barcodes.plate
        ];
        await client.query(activeToolingQuery, activeToolingParams);

        // Confirmar transacción
        await client.query('COMMIT');

    } catch (e) {
        // Si algo falla, deshacer todo
        await client.query('ROLLBACK');
        throw e; // Re-lanza el error para que el controller lo atrape
    } finally {
        // Liberar el cliente de vuelta a la pool
        client.release();
    }
    // --- (FIN) CÓDIGO AÑADIDO ---

    // (La lógica original de 'pool.query' se movió adentro de la transacción)
    // Ya no necesitamos 'return { success: true }' aquí si el 'catch' maneja los errores.
    // O déjalo si tu controller lo espera
    return { success: true };
}

async function getProductionLogs() {
    const query = `
        SELECT * FROM production_log
        ORDER BY log_timestamp DESC;
    `;
    const { rows } = await pool.query(query);
    return rows;
}

async function getMaintenanceAlerts() {
    const query = `
        SELECT * FROM maintenance_alerts
        ORDER BY
            -- 1. Pone las 'new' primero
            CASE WHEN status = 'new' THEN 1 ELSE 2 END,
            -- 2. Luego ordena por la más reciente
            alert_timestamp DESC;
    `;
    const { rows } = await pool.query(query);
    return rows;
}

async function verifyPastaLog(line, barcode, username) {
    // 1. Buscar el ÚLTIMO registro de esa línea
    const lastLogQuery = `
        SELECT * FROM production_log 
        WHERE line_number = $1 
        ORDER BY log_id DESC 
        LIMIT 1
    `;
    const lastLogResult = await pool.query(lastLogQuery, [line]);

    if (lastLogResult.rows.length === 0) {
        throw new Error("No hay registros previos en esta línea para comparar.");
    }

    const lastLog = lastLogResult.rows[0];
    const scannedPastaFull = barcode.trim();

    // =================================================================
    // VALIDACIÓN DE FORMATO: Debe tener comas
    // =================================================================
    // Verificamos si tiene al menos una coma. Si no, rechazamos.
    if (!scannedPastaFull.includes(',')) {
        throw new Error("Formato inválido. Por favor escanee el código datamatrix completo (el que contiene comas).");
    }

    // Extraemos las partes
    const scannedParts = scannedPastaFull.split(',');

    // Aseguramos que tenga al menos la parte del medio (índice 1)
    if (scannedParts.length < 2) {
        throw new Error("El código escaneado no tiene el formato esperado (Lote,NoParte,...).");
    }

    // Obtenemos la parte clave (K01.005-00M-2) que está en la posición 1
    const scannedPart = scannedParts[1].trim();

    // =================================================================
    // OBTENER EL VALOR DE LA BASE DE DATOS
    // =================================================================
    const dbPastaFull = lastLog.pasta_lot ? lastLog.pasta_lot.trim() : '';

    // Intentamos extraer la parte clave de la BD también
    // (Si la BD tuviera basura sin comas, usamos el string completo para evitar crash, 
    // pero idealmente siempre tendrá comas)
    const dbParts = dbPastaFull.split(',');
    const dbPart = dbParts.length >= 2 ? dbParts[1].trim() : dbPastaFull;

    // =================================================================
    // COMPARACIÓN
    // =================================================================
    if (dbPart !== scannedPart) {
        throw new Error(`¡ERROR! La pasta escaneada (${scannedPart}) NO coincide con la actual en línea (${dbPart}).`);
    }

    // 3. Si coincide, insertamos el nuevo log (Guardamos el string COMPLETO nuevo)
    const insertQuery = `
        INSERT INTO production_log 
        (line_number, pn_pcb, model_name, model_side, pasta_lot, username, stencil_bc, squeegee_f_bc, squeegee_r_bc, squeegee_y_bc, plate_bc)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    await pool.query(insertQuery, [
        line,
        lastLog.pn_pcb,
        lastLog.model_name,
        lastLog.model_side,
        scannedPastaFull, // Guardamos el string con el nuevo lote/fecha
        username,         // El número de empleado
        lastLog.stencil_bc,
        lastLog.squeegee_f_bc,
        lastLog.squeegee_r_bc,
        lastLog.squeegee_y_bc,
        lastLog.plate_bc
    ]);

    return { success: true, message: "Verificación de pasta correcta y registrada." };
}

module.exports = { validateScan, logProduction, getProductionLogs, getMaintenanceAlerts, verifyPastaLog };