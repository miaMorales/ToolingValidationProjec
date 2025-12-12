-- Verificar stencils compartidos (mismo st_bc usado en múltiples modelos)
-- Este query muestra cuáles stencils están registrados para más de un modelo

SELECT 
    st_bc,
    COUNT(DISTINCT (pn_pcb, model_side)) as num_modelos,
    STRING_AGG(DISTINCT pn_pcb || ' ' || model_side, ', ' ORDER BY pn_pcb || ' ' || model_side) as modelos
FROM stencils
WHERE st_bc IS NOT NULL
GROUP BY st_bc
HAVING COUNT(DISTINCT (pn_pcb, model_side)) > 1
ORDER BY num_modelos DESC;

-- Ver detalles de un stencil específico (reemplaza 'TU_CODIGO' con el st_bc real)
-- SELECT s.st_bc, s.pn_pcb, s.model_side, s.st_status, m.model_name
-- FROM stencils s
-- LEFT JOIN models m ON s.pn_pcb = m.pn_pcb AND s.model_side = m.model_side
-- WHERE s.st_bc = 'TU_CODIGO';
