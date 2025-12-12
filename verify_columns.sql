-- Verificar que las columnas plate_pcb y stencil_pcb existan en la tabla models
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'models' 
  AND column_name IN ('plate_pcb', 'stencil_pcb')
ORDER BY column_name;
