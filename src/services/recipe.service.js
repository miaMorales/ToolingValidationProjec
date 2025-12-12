// src/services/recipe.service.js
const pool = require('../db/pool');
const qrcode = require('qrcode');

/**
 * Obtiene la lista de todos los modelos distintos, duplicando cada uno
 * para representar el lado TOP y el lado BOT.
 */
async function getRecipeList() {
    const query = 'SELECT DISTINCT model_name, pn_pcb FROM models ORDER BY model_name;';
    const { rows } = await pool.query(query);
    const recipeList = [];
    rows.forEach(model => {
        recipeList.push({ ...model, model_side: 'TOP' });
        recipeList.push({ ...model, model_side: 'BOT' });
    });
    return recipeList;
}

/**
 * Obtiene el herramental compatible para un PN PCB, lado y línea específicos.
 */
async function getRecipeDetails(pn_pcb, model_side, lineNumber) {
    // 1. PRIMERO: Obtener info del modelo para ver si tiene 'plate_pcb' y 'stencil_pcb' (excepciones)
    const modelInfoQuery = 'SELECT model_name, plate_pcb, stencil_pcb FROM models WHERE pn_pcb = $1 AND model_side = $2 LIMIT 1';
    const modelInfoResult = await pool.query(modelInfoQuery, [pn_pcb, model_side]);
    const modelData = modelInfoResult.rows[0] || { model_name: 'Desconocido', plate_pcb: null, stencil_pcb: null };

    // 2. DECIDIR QUÉ PCB BUSCAR PARA PLATES Y STENCILS
    // Si 'plate_pcb' tiene datos (ej. P00.266-00), usamos ese. Si no, usamos el normal (pn_pcb).
    const searchPlatePcb = modelData.plate_pcb || pn_pcb;
    // Si 'stencil_pcb' tiene datos, usamos ese. Si no, usamos el normal (pn_pcb).
    const searchStencilPcb = modelData.stencil_pcb || pn_pcb;

    // 3. REALIZAR LAS CONSULTAS
    // --- OJO AQUÍ: Usamos 'searchStencilPcb' en vez de 'pn_pcb' para stencils ---
    const stencilsQuery = `SELECT st_id, st_bc, st_no_serie, st_ver, thickness, st_status FROM stencils WHERE pn_pcb = $1 AND model_side = $2 AND st_status <> 'BAJA'`;
    const stencilsResult = await pool.query(stencilsQuery, [searchStencilPcb, model_side]);

    // --- OJO AQUÍ: Usamos 'searchPlatePcb' en vez de 'pn_pcb' ---
    const platesQuery = `SELECT pl_id, pl_bc, pl_no_serie, pl_status FROM plates WHERE pn_pcb = $1 AND model_side = 'BT' AND pl_status <> 'BAJA'`;
    const platesResult = await pool.query(platesQuery, [searchPlatePcb]);
    // -------------------------------------------------------------

    let squeegeesQuery = `
        SELECT sq.sq_id, sq.sq_bc, sq.sq_length, sq.sq_status 
        FROM squeegees AS sq
        INNER JOIN models AS m ON sq.sq_length = m.length
        WHERE m.pn_pcb = $1 AND m.model_side = $2 AND sq.sq_status <> 'BAJA'
    `;
    if (lineNumber === '1' || lineNumber === '2') {
        squeegeesQuery += ` AND sq.sq_side IN ('F', 'R')`;
    } else if (lineNumber === '3' || lineNumber === '4') {
        squeegeesQuery += ` AND sq.sq_side = 'Y'`;
    }
    const squeegeesResult = await pool.query(squeegeesQuery, [pn_pcb, model_side]);

    return {
        model_name: modelData.model_name,
        pn_pcb: pn_pcb,
        model_side: model_side,
        // 4. DEVOLVEMOS LOS DATOS PARA QUE EL FRONTEND SEPA QUÉ PASÓ
        plate_pcb_used: searchPlatePcb,
        stencil_pcb_used: searchStencilPcb,
        stencils: stencilsResult.rows,
        plates: platesResult.rows,
        squeegees: squeegeesResult.rows
    };
}

/**
 * Obtiene los detalles de un modelo específico por sus IDs.
 */
async function getModelDetailsByIds(pn_pcb, model_side) {
    // AGREGAMOS stencil_pcb A LA CONSULTA
    const query = 'SELECT model_qr, pasta, length, plate_pcb, stencil_pcb FROM models WHERE pn_pcb = $1 AND model_side = $2';
    const { rows } = await pool.query(query, [pn_pcb, model_side]);
    return rows[0];
}

/**
 * Actualiza los detalles de un modelo por sus IDs.
 */
async function updateModelByIds(pn_pcb, model_side, newData) {
    // 1. Limpieza de espacios en blanco (TRIM) para asegurar coincidencias
    const cleanPnPcb = pn_pcb.trim();
    const cleanSide = model_side.trim();

    console.log('🔍 updateModelByIds - Intentando actualizar:', { pn_pcb: cleanPnPcb, side: cleanSide });
    
    const { qr, pasta, length, plate_pcb, stencil_pcb } = newData;
    
    // Convertimos cadenas vacías a null
    const valLength = length || null;
    const valPlatePcb = plate_pcb === '' ? null : plate_pcb;
    const valStencilPcb = stencil_pcb === '' ? null : stencil_pcb;
    const valQr = qr === '' ? null : qr;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ---------------------------------------------------------
        // PASO 1: ACTUALIZACIÓN GLOBAL (Afecta TOP, BOT y BT)
        // ---------------------------------------------------------
        const globalQuery = `
            UPDATE models 
            SET length = $1, plate_pcb = $2, pasta = $3
            WHERE pn_pcb = $4
        `;
        // Guardamos el resultado en una variable 'resGlobal'
        const resGlobal = await client.query(globalQuery, [valLength, valPlatePcb, pasta, cleanPnPcb]);

        // --- VALIDACIÓN CRÍTICA ---
        // Si rowCount es 0, significa que el pn_pcb no existe exactamente como se escribió
        if (resGlobal.rowCount === 0) {
            throw new Error(`NO SE ENCONTRÓ EL PCB: "${cleanPnPcb}". Ninguna fila fue actualizada. Revisa espacios o formato.`);
        }
        console.log(`✅ Paso 1: Se actualizaron ${resGlobal.rowCount} filas globales (Plate, Largo, Pasta).`);

        // ---------------------------------------------------------
        // PASO 2: ACTUALIZACIÓN ESPECÍFICA (Afecta SOLO al lado actual)
        // ---------------------------------------------------------
        const specificQuery = `
            UPDATE models 
            SET model_qr = $1, stencil_pcb = $2
            WHERE pn_pcb = $3 AND model_side = $4
        `;
        const resSpecific = await client.query(specificQuery, [valQr, valStencilPcb, cleanPnPcb, cleanSide]);
        
        if (resSpecific.rowCount === 0) {
            console.warn(`⚠️ ALERTA: Paso 2 falló. Existe el PCB pero no el lado "${cleanSide}".`);
        } else {
            console.log(`✅ Paso 2: Datos específicos actualizados para ${cleanSide}.`);
        }

        await client.query('COMMIT');
        return { success: true };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error en updateModelByIds:', error.message);
        throw error; // Esto enviará el error al controller y al frontend
    } finally {
        client.release();
    }
}

/**
 * Crea un nuevo modelo (TOP, BOT, BT) y asigna líneas de trabajo.
 */
async function createNewModel(modelData) {
    // 1. RECIBIMOS plate_pcb Y stencil_pcb
    const { model_name, pn_pcb, model_qr, pasta, length, lines, plate_pcb, stencil_pcb } = modelData;
    
    const checkQuery = 'SELECT 1 FROM models WHERE pn_pcb = $1 LIMIT 1';
    const existing = await pool.query(checkQuery, [pn_pcb]);
    if (existing.rows.length > 0) {
        throw new Error('El PN PCB ya existe. No se puede duplicar.');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 2. AGREGAMOS AMBAS COLUMNAS EN EL INSERT
        const insertModelQuery = `
            INSERT INTO models (model_name, pn_pcb, model_side, model_qr, pasta, length, plate_pcb, stencil_pcb) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        
        // Pasamos valores o null si vienen vacíos
        const pcbValue = plate_pcb || null;
        const stencilPcbValue = stencil_pcb || null;

        await client.query(insertModelQuery, [model_name, pn_pcb, 'TOP', model_qr, pasta, length, pcbValue, stencilPcbValue]);
        await client.query(insertModelQuery, [model_name, pn_pcb, 'BOT', model_qr, pasta, length, pcbValue, stencilPcbValue]);
        await client.query(insertModelQuery, [model_name, pn_pcb, 'BT', model_qr, pasta, length, pcbValue, stencilPcbValue]);

        const insertWorkLineQuery = `
            INSERT INTO work_line (wl_no, model_name, model_side, run)
            VALUES ($1, $2, $3, 1)
        `;
        for (const lineNumber of lines) {
            await client.query(insertWorkLineQuery, [lineNumber, pn_pcb, 'TOP']);
            await client.query(insertWorkLineQuery, [lineNumber, pn_pcb, 'BOT']);
        }
        await client.query('COMMIT');
        return { success: true };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en la transacción de creación:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Obtiene la lista de recetas (modelos) asignadas a una línea específica.
 */
async function getRecipesByLine(lineNumber) {
    const query = `
        SELECT DISTINCT m.pn_pcb, m.model_name 
        FROM models m
        JOIN work_line wl ON m.pn_pcb = wl.model_name
        WHERE wl.wl_no = $1
        ORDER BY m.model_name;
    `;
    const { rows } = await pool.query(query, [lineNumber]);
    const recipeList = [];
    rows.forEach(model => {
        recipeList.push({ ...model, model_side: 'TOP' });
        recipeList.push({ ...model, model_side: 'BOT' });
    });
    return recipeList;
}

// ==========================================================
//  NUEVA FUNCIÓN: Obtener Pastas Distintas
// ==========================================================
/**
 * Obtiene una lista de valores distintos de 'pasta' de la tabla 'models'.
 */
async function getDistinctPastas() {
    const query = `
        SELECT DISTINCT pasta 
        FROM models 
        WHERE pasta IS NOT NULL AND pasta <> '' 
        ORDER BY pasta;
    `;
    const { rows } = await pool.query(query);
    // Devuelve solo los nombres como un array de strings
    return rows.map(row => row.pasta);
}
// ==========================================================
//  FIN DE LA NUEVA FUNCIÓN
// ==========================================================


module.exports = {
    getModelDetailsByIds,
    updateModelByIds,
    getRecipeList,
    getRecipeDetails,
    createNewModel,
    getRecipesByLine,
    getDistinctPastas 
};