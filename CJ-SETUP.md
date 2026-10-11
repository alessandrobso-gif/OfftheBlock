# OffTheBlock × CJdropshipping — prueba inicial

Este ZIP conserva la web estática original y añade una función de Vercel para comprobar la conexión con CJ. **No importa productos, no crea pedidos y no cobra pagos.**

## Qué se añadió
- `api/cj-test.js`: función de servidor para autenticar con la API Key y hacer una consulta de categorías de solo lectura.
- `CJ-SETUP.md`: instrucciones para desplegar y probar.

## Antes de desplegar
1. En Vercel, abre el proyecto que publica OffTheBlock.
2. En **Settings → Environment Variables**, crea `CJ_API_KEY` con tu API Key de CJ.
3. Marca Production (y Preview si quieres probar previews). Guarda.
4. Sube los archivos de este ZIP al mismo repositorio/proyecto de Vercel y haz un nuevo deploy.
5. Abre `https://TU-DOMINIO/api/cj-test` en el navegador.

La respuesta correcta contiene `"ok": true`. Si da error, comparte el texto de error **sin compartir la API Key**.

## Seguridad
- No pegues la API Key en `index.html`, JavaScript del navegador ni en GitHub.
- No compartas capturas que muestren la clave.
- Este endpoint es solo una prueba; antes de producción conviene protegerlo con autenticación o retirarlo.
- La conexión de catálogo, cálculo de envío, checkout, pagos y creación de pedidos aún no está implementada.
