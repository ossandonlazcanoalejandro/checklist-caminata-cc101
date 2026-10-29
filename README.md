# Checklist Caminata CC-101

App web instalable en el celular (PWA) con los checklists de protocolos de
`01_Plantillas_Genericas_CC-101.xlsx`, para citar caminatas al 100% de avance constructivo.

**Flujo:** Familia → Subsistema (búsqueda por código o TAG) → Checklist (sección A + protocolos) →
Validar → Firma ITO / Inspección Codelco → PDF con el mismo formato de la planilla → Compartir (WhatsApp, correo, Teams).

- Funciona sin señal una vez abierta por primera vez (interior mina).
- Los avances quedan guardados en el teléfono. "Exportar respaldo" permite pasarlos a otro equipo.
- El resumen y el estado APTO / NO APTO usan las mismas reglas que la planilla Excel.

## Publicar en GitHub Pages (una sola vez)
1. Cree una cuenta en https://github.com.
2. **+ → New repository** → nombre `checklist-caminata-cc101` → **Public** → **Create repository**.
3. **Add file → Upload files** → seleccione los **13 archivos** de esta carpeta (no hay subcarpetas)
   y arrástrelos juntos → **Commit changes**. Verifique que en el repositorio aparezca `pdf-lib.min.js`.
4. **Settings → Pages** → Source: **Deploy from a branch** → Branch `main` / `(root)` → **Save**.
5. En 1–2 minutos: `https://SU-USUARIO.github.io/checklist-caminata-cc101/`

## Instalar en el celular
- **Android (Chrome):** abrir el enlace → menú ⋮ → **Instalar app** / *Agregar a la pantalla principal*.
- **iPhone (Safari):** abrir el enlace → **Compartir** → **Agregar a inicio**.

## Cuando modifique la planilla de plantillas
La app se genera desde `01_Plantillas_Genericas_CC-101.xlsx`:
- protocolos de cada hoja (filas desde la 13: N°, Disciplina, Protocolo, Nombre, Actividades, ¿Aplica?),
- asignación de subsistemas: hoja **Índice plantillas**, columna **Subsistemas asignados**.

Pasos:
1. Instale Python y luego `pip install openpyxl`.
2. En la carpeta `datos_para_actualizar_NO_SUBIR` ejecute:
   `python excel_a_data.py 01_Plantillas_Genericas_CC-101.xlsx reporte_listado_wbs_74.xlsx data.js`
   (el reporte WBS aporta descripción, sistema y TAG de cada subsistema).
3. En `sw.js` suba la versión: `cc101-v4` → `cc101-v5`.
4. Suba `data.js` y `sw.js` al repositorio (**Add file → Upload files**, se reemplazan).
   Los teléfonos toman la versión nueva la próxima vez que abran la app con señal.

No suba los Excel al repositorio: no son necesarios para la app.

## Privacidad
Con el plan gratuito, un sitio de GitHub Pages es **público**: cualquiera con el enlace ve la lista de subsistemas,
TAG y protocolos (no ve los avances ni las firmas, que quedan solo en cada teléfono). Si eso no está permitido,
publique los mismos archivos en un servidor interno o en un servicio con control de acceso.

## Créditos
PDF generado con [pdf-lib](https://github.com/Hopding/pdf-lib) (licencia MIT, `lib/pdf-lib-LICENSE.md`).
