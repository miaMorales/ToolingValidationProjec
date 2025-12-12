-- Test: Ver el modelo P00.472-02 TOP para verificar plate_pcb y stencil_pcb
SELECT pn_pcb, model_side, model_qr, pasta, length, plate_pcb, stencil_pcb
FROM models
WHERE pn_pcb = 'P00.472-02' AND model_side = 'TOP';

-- Test: Actualizar el modelo con valores de prueba
-- UPDATE models 
-- SET plate_pcb = 'P00.266-00', stencil_pcb = 'P00.472-00'
-- WHERE pn_pcb = 'P00.472-02' AND model_side = 'TOP';

-- Verificar después del update
-- SELECT pn_pcb, model_side, plate_pcb, stencil_pcb
-- FROM models
-- WHERE pn_pcb = 'P00.472-02' AND model_side = 'TOP';
