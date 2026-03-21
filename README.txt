Polar3 — Sistema Operativo 2026 · V2.5.0 móvil / PWA

Novedades principales de esta versión
- Base responsive reforzada para teléfonos Android y tablets.
- PWA lista: manifest, service worker e instalación desde navegador compatible.
- Botón y estado de instalación visibles en la barra superior.
- Mejoras táctiles: inputs más cómodos, bloques del calendario más estables en móvil y scroll horizontal más amigable en tablas.
- Se mantiene todo lo ya construido: KPIs, agenda anual, vistas imprimibles, hoja de jornada premium, checklist y columna horaria real.

Qué cambia en móvil
- El layout del topbar y del calendario se apila mejor en pantallas chicas.
- Botones e inputs usan tamaños más cómodos para tacto.
- La vista diaria / semanal / mensual del calendario ahora se adapta mejor en Android y tablets.

Importante sobre PWA
- La app queda lista para instalarse como PWA.
- Para que aparezca la instalación y funcione el service worker, debes abrirla desde:
  - localhost
  - o un dominio HTTPS
- Si la abres directamente como archivo local (file:///...), seguirá funcionando como web local, pero sin instalación PWA completa.

Archivos nuevos
- manifest.webmanifest
- sw.js
- /icons/polar3-icon.svg
- /icons/polar3-icon-maskable.svg

Cómo probar en PC
1. Abre index.html normalmente si solo quieres usarla en local.
2. Si quieres probar la instalación PWA real, sirve la carpeta con localhost o súbela a un hosting HTTPS.
3. Abre la URL desde Chrome o Edge.
4. Usa el botón "Instalar app" o el menú del navegador.

Cómo usar en Android / tablet
1. Abre la URL desde Chrome.
2. Espera que aparezca el botón "Instalar app" o entra al menú del navegador.
3. Elige "Instalar app" o "Agregar a pantalla de inicio".
4. Polar[3] quedará con formato de app independiente.

Lo que ya estaba incluido y se conserva
- KPIs automáticos conectados a Cobranzas y Cartera.
- KPI 01 alternable por pago / por familia única.
- Filtros por colegio y por período.
- Calendario anual operativo editable.
- Vista mensual, semanal y diaria imprimible.
- Hoja de jornada premium con checklist imprimible.
- Columna horaria real por jornada.


Versión V2.5.1: se quitó el espacio Legal de la navegación de la app móvil/PWA.


V2.6.0 — Pulido Android-first
- Inicio móvil con panel de acceso rápido
- Resumen operativo móvil: agenda, cobranzas, pendientes y respaldo
- Barra inferior fija para Inicio / Calendario / Cobranzas / KPIs / Menú
- Sidebar y topbar optimizados para Android
- Home desktop intacto; home móvil simplificado
