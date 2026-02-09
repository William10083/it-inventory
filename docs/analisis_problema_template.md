# Análisis del Problema: Template Incorrecto en "Descargar Acta para Firmar"

## Contexto
El usuario reporta que el botón "Descargar Acta para Firmar" está usando el template de cese (RETURN_COMPUTER) en lugar del template de asignación (ASSIGNMENT_COMPUTER).

## Investigación

### Flujo del Botón
1. **Frontend**: `AssignmentActaModal.jsx` línea 112
   - Botón: "Descargar Acta para Firmar"
   - Función: `downloadGeneratedActa()`
   - Endpoint: `/assignments/${assignmentId}/acta`

2. **Backend**: `routes/assignments.py` líneas 170-333
   - Endpoint: `@router.get("/assignments/{assignment_id}/acta")`
   - Líneas 222-226: Busca template ASSIGNMENT_COMPUTER por defecto
   - Línea 251-258: Llama a `generate_batch_acta()` con `template=comp_template`

### Verificación Necesaria
- ¿El template ID 6 es realmente el correcto?
- ¿Hay algún otro template de ASSIGNMENT_COMPUTER que esté marcado como default?
- ¿El archivo DOCX del template contiene el placeholder {{TABLA}} correcto?

## Próximos Pasos
1. Verificar qué template se está cargando realmente
2. Verificar el contenido del archivo DOCX del template
3. Probar la generación de un acta y verificar el resultado
