-- Agregar columna stencil_pcb a la tabla models
-- Esta columna permite que un modelo use los stencils de otro modelo
-- Similar a como plate_pcb permite compartir plates

ALTER TABLE models 
ADD COLUMN stencil_pcb VARCHAR(50);

COMMENT ON COLUMN models.stencil_pcb IS 'PN PCB del cual este modelo puede usar stencils (opcional, si es NULL usa su propio pn_pcb)';
