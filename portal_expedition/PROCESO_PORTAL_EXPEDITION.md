# Proceso de Gestión de Expediciones desde el Portal - Portal Expedition

## Índice
1. [Prerequisitos](#prerequisitos)
2. [Configuración Inicial](#configuración-inicial)
3. [Proceso de Gestión de Expediciones - Flujo Completo](#proceso-de-gestión-de-expediciones---flujo-completo)
4. [Pasos Detallados](#pasos-detallados)
5. [Funcionalidades del Portal](#funcionalidades-del-portal)
6. [Casos Especiales](#casos-especiales)

---

## Prerequisitos

### Módulos Requeridos
El módulo `portal_expedition` depende de los siguientes módulos:
- `base` - Base de Odoo
- `portal_admin_theme` - Tema del portal
- `portal_account` - Portal de cuenta
- `stock_reception` - Módulo de recepción
- `portal_catalog` - Catálogo de productos

### Configuraciones del Sistema
No se requieren configuraciones especiales del sistema. El módulo funciona con la configuración estándar.

### Acceso al Portal
**IMPORTANTE**: Este módulo está diseñado para ser usado **exclusivamente desde el portal del cliente**, no desde el backend de Odoo.

**URL del Portal**: `/account/expedition`

---

## Configuración Inicial

### 1. Permisos de Usuario
- El usuario debe tener acceso al portal
- El usuario debe estar asociado a un `account.partner`
- El usuario solo puede ver y gestionar expediciones de su `account.partner`

### 2. Productos Disponibles
- Los productos deben estar disponibles en el catálogo
- Los productos deben tener stock disponible (para filtros)

---

## Proceso de Gestión de Expediciones - Flujo Completo

El módulo `portal_expedition` permite crear y gestionar expediciones (órdenes de venta) desde el portal del cliente.

```
Portal → Crear Expedición → Ver Lista → Ver Detalles → Seguimiento
```

### Resumen del Flujo

1. **FASE 1: Creación de Expedición** (Portal)
   - Cliente crea orden de venta desde el portal
   - Selecciona productos, dirección de envío, transportista
   - Se crea `sale.order` en estado `draft`

2. **FASE 2: Visualización de Expediciones** (Portal)
   - Ver lista de órdenes de venta
   - Filtrar por estado, fecha, tracking
   - Exportar datos a Excel

3. **FASE 3: Detalles de Expedición** (Portal)
   - Ver información completa de la orden
   - Ver estado de los pickings
   - Ver información de envío
   - Comunicación mediante chatter

---

## Pasos Detallados

### **FASE 1: Creación de Expedición**

**⚠️ IMPORTANTE**: Esta fase debe realizarse **directamente desde el portal del cliente**.

**Acceso**: Portal del cliente → Menú **"Expeditions"** → Botón **"Crear Expedición"**

**Ruta**: `/account/expedition/create` (JSON)

**Pasos**:
1. **Desde el portal del cliente**: Abrir modal de creación de expedición
2. **Desde el portal del cliente**: Completar información de envío:
   - **OBLIGATORIO**: Dirección de envío:
     - Nombre del destinatario
     - Calle, número
     - Código postal, ciudad
     - Estado/Provincia, País
     - Teléfono, email
   - **OBLIGATORIO**: Al menos un producto con cantidad
   - **OPCIONAL**: `carrier_id` - Transportista
   - **OPCIONAL**: `client_order_ref` - Referencia del cliente

3. **Desde el portal del cliente**: Agregar productos:
   - **OBLIGATORIO**: Seleccionar producto desde catálogo
   - **OBLIGATORIO**: Especificar cantidad
   - Se pueden agregar múltiples productos

4. **Desde el portal del cliente**: Crear expedición
   - El sistema crea automáticamente:
     - `sale.order` en estado `draft`
     - Dirección de envío (`res.partner` con `type='delivery'`)
     - Líneas de orden (`sale.order.line`) para cada producto
     - Asocia la orden al `account.partner` del usuario

**Validaciones**:
- Debe haber al menos un producto
- La cantidad debe ser mayor que 0
- El producto debe existir y estar disponible
- La dirección de envío se crea automáticamente si no existe

**Nota**: La orden se crea en estado `draft`. Debe confirmarse desde el backend para generar los pickings de expedición.

---

### **FASE 2: Visualización de Expediciones**

**Acceso**: Portal del cliente → Menú **"Expeditions"**

**Ruta**: `/account/expedition` (HTTP)

**Funcionalidades**:

1. **Lista de Expediciones**:
   - Muestra todas las órdenes de venta del `account.partner` del usuario
   - Columnas visibles:
     - Nombre/Referencia de la orden
     - Referencia de seguimiento
     - Fecha de orden
     - Fecha de entrega
     - Estado de venta

2. **Filtros Rápidos**:
   - **All** - Todas las expediciones
   - **Draft** - Borrador
   - **Billing** - Facturación
   - **Preparing** - Preparando
   - **To be Shipped** - Por enviar
   - **Shipped** - Enviado
   - **Cancel** - Cancelado

3. **Búsqueda Avanzada**:
   - Búsqueda por nombre
   - Búsqueda por referencia de seguimiento
   - Filtro por fecha de orden
   - Filtro por fecha de entrega
   - Filtro por estado de venta
   - Filtro por estado de picking

4. **Exportación**:
   - Exportar lista a Excel
   - Incluye todas las columnas visibles
   - Respeta filtros y búsquedas aplicadas

5. **Paginación**:
   - Límite configurable por usuario
   - Navegación entre páginas

---

### **FASE 3: Detalles de Expedición**

**Acceso**: Portal del cliente → Menú **"Expeditions"** → Click en expedición

**Ruta**: `/account/expedition/details/<id>`

**Información Mostrada**:

1. **Información General**:
   - Nombre/Referencia de la orden
   - Fecha de orden
   - Cliente
   - Dirección de envío
   - Estado de la orden

2. **Información de Productos**:
   - Lista de productos en la orden
   - Cantidades
   - Precios (si aplica)

3. **Información de Envío**:
   - Referencia de seguimiento
   - Transportista
   - Estado de los pickings
   - Fecha de entrega

4. **Comunicación**:
   - Chatter para mensajes
   - Notificaciones bidireccionales:
     - Si el usuario del portal escribe → notifica al usuario del backend
     - Si el usuario del backend escribe → notifica al usuario del portal

---

## Funcionalidades del Portal

### 1. Búsqueda de Productos

**Endpoint**: `/account/expedition/product-search` (JSON)

**Funcionalidad**:
- Búsqueda de productos delegada al catálogo centralizado
- Filtro de stock aplicado (solo productos con stock disponible)

**Resultado**:
- Lista de productos con información básica

### 2. Catálogo de Productos

**Endpoint**: `/account/expedition/product-catalog` (JSON)

**Funcionalidad**:
- Muestra catálogo paginado de productos
- Delegado al catálogo centralizado
- Filtro de stock aplicado
- Búsqueda por término
- Paginación

### 3. Búsqueda de Transportistas

**Endpoint**: `/account/expedition/carrier-search` (JSON)

**Funcionalidad**:
- Búsqueda de transportistas por nombre o tipo
- Resultados limitados a 10

**Parámetros**:
- `term` - Término de búsqueda (opcional)

**Resultado**:
- Lista de transportistas con:
  - ID, nombre, tipo de entrega

### 4. Búsqueda de Direcciones

**Endpoint**: `/account/expedition/address-search` (JSON)

**Funcionalidad**:
- Búsqueda de direcciones por código postal, ciudad, estado, país
- Soporta búsqueda por fragmentos separados por comas
- Resultados limitados a 10

**Parámetros**:
- `term` - Término de búsqueda (puede incluir código postal, ciudad, estado, país)

**Resultado**:
- Lista de direcciones con:
  - Código postal, ciudad, estado, país
  - IDs para cada componente

### 5. Importación Masiva

**Endpoint**: `/account/dashboard/import_expeditions` (HTTP POST)

**Funcionalidad**:
- Importar múltiples órdenes de venta desde archivo Excel
- Formato: Excel con columnas específicas
- Crea órdenes automáticamente con la información del archivo
- Las órdenes se crean en estado `draft`

**Formato del Archivo**:
- Columnas requeridas: Referencia, Productos, Cantidades, etc.
- Se valida el formato antes de importar
- Se muestran errores si hay problemas

---

## Casos Especiales

### 1. Dirección de Envío Automática

**Situación**: Se especifica una dirección de envío que no existe.

**Comportamiento**:
- Se crea automáticamente un `res.partner` con `type='delivery'`
- Se asocia al `partner_id` comercial del usuario
- Se reutiliza si ya existe una dirección con los mismos datos

**Solución**:
- El sistema maneja automáticamente la creación de direcciones
- No se requiere acción adicional del usuario

### 2. Múltiples Productos en una Orden

**Situación**: Se agregan múltiples productos a la misma orden.

**Comportamiento**:
- Se crea una línea de orden (`sale.order.line`) por cada producto
- Cada línea tiene su propia cantidad
- Todas las líneas se asocian a la misma orden

**Solución**:
- Agregar todos los productos necesarios en el mismo formulario
- Cada producto se procesa como una línea independiente

### 3. Orden en Estado Draft

**Situación**: La orden se crea en estado `draft`.

**Comportamiento**:
- No se generan pickings automáticamente
- La orden debe confirmarse desde el backend
- Una vez confirmada, se generan los pickings de expedición

**Solución**:
- La orden queda pendiente de confirmación
- El almacén confirma la orden cuando está lista
- Los pickings se generan automáticamente al confirmar

### 4. Productos sin Stock Disponible

**Situación**: Se intenta crear una orden con productos sin stock.

**Comportamiento**:
- El catálogo filtra productos con stock disponible
- Si se crea la orden, los pickings quedan en `waiting` hasta que haya stock

**Solución**:
- Verificar stock disponible antes de crear la orden
- El sistema filtra automáticamente productos sin stock en el catálogo

### 5. Importación Masiva

**Situación**: Se importan múltiples órdenes desde Excel.

**Comportamiento**:
- Se valida el formato del archivo
- Se crean órdenes una por una
- Se muestran errores si hay problemas
- Se reporta el número de órdenes creadas
- Todas las órdenes se crean en estado `draft`

**Solución**:
- Verificar formato del archivo antes de importar
- Revisar errores reportados
- Corregir y reintentar si es necesario

### 6. Comunicación Bidireccional

**Situación**: Usuario del portal o backend escribe en el chatter.

**Comportamiento**:
- Si el usuario del portal escribe → se notifica al usuario del backend
- Si el usuario del backend escribe → se notifica al usuario del portal
- Las notificaciones se envían automáticamente

**Solución**:
- Usar el chatter para comunicarse
- Las notificaciones se envían automáticamente
- No se requiere acción adicional

---

## Resumen de Procesos que Pueden Fallar

### Tabla de Errores Comunes

| Fase | Proceso | Error Posible | Causa | Solución |
|------|---------|---------------|-------|----------|
| **FASE 1** | Crear expedición | Sin productos | No se seleccionaron productos | Seleccionar al menos un producto |
| **FASE 1** | Crear expedición | Sin dirección de envío | Datos de dirección incompletos | Completar todos los campos obligatorios |
| **FASE 1** | Crear expedición | Producto sin stock | Producto sin stock disponible | Verificar stock disponible |
| **FASE 1** | Crear expedición | Error al crear orden | Fallo en creación | Verificar datos y reintentar |
| **FASE 2** | Ver expediciones | No aparecen expediciones | Sin account.partner | Verificar asociación de usuario |
| **FASE 3** | Ver detalles | Orden no encontrada | ID inválido o sin permisos | Verificar permisos y ID |
| **General** | Importar órdenes | Formato inválido | Archivo Excel incorrecto | Verificar formato del archivo |

### Errores en la Creación de Expedición

**Situación**: Errores al crear una expedición desde el portal.

**Errores Posibles**:

1. **Sin productos seleccionados**:
   - **Error**: Validación falla
   - **Causa**: No se seleccionó ningún producto
   - **Solución**: Seleccionar al menos un producto antes de crear la orden

2. **Cantidad inválida**:
   - **Error**: Validación falla si cantidad <= 0
   - **Causa**: Se especificó cantidad 0 o negativa
   - **Solución**: Especificar cantidad mayor que 0

3. **Dirección de envío incompleta**:
   - **Error**: Validación falla si faltan campos obligatorios
   - **Causa**: Campos obligatorios de dirección no completados
   - **Solución**: Completar todos los campos obligatorios (nombre, calle, ciudad, país)

4. **Producto sin stock disponible**:
   - **Error**: Producto no aparece en catálogo
   - **Causa**: Producto sin stock disponible (filtro aplicado)
   - **Solución**: Verificar stock disponible o esperar a que haya stock

5. **Error al crear orden**:
   - **Error**: Fallo en creación de `sale.order`
   - **Causa**: Datos inválidos o configuración incorrecta
   - **Solución**: 
     - Verificar que todos los campos obligatorios están completos
     - Verificar que los productos existen
     - Reintentar la creación

### Errores en la Visualización de Expediciones

**Situación**: Errores al ver la lista de expediciones.

**Errores Posibles**:

1. **No aparecen expediciones**:
   - **Causa**: El usuario no tiene `account.partner` asociado
   - **Solución**: Verificar que el usuario tiene `account.partner` configurado

2. **Órdenes de otro cliente**:
   - **Causa**: Filtro de `account.partner` no funciona correctamente
   - **Solución**: Verificar permisos y configuración del módulo

### Errores en la Búsqueda de Productos

**Situación**: Errores al buscar productos desde el portal.

**Errores Posibles**:

1. **No aparecen productos**:
   - **Causa**: Productos sin stock disponible (filtro aplicado)
   - **Solución**: Verificar stock disponible o esperar a que haya stock

2. **Productos no válidos**:
   - **Causa**: Productos de tipo `service` o no almacenables
   - **Solución**: Solo se muestran productos almacenables con stock

### Errores en la Búsqueda de Direcciones

**Situación**: Errores al buscar direcciones de envío.

**Errores Posibles**:

1. **Dirección no encontrada**:
   - **Causa**: Dirección no existe o no es tipo `delivery`
   - **Solución**: Crear nueva dirección o verificar tipo

### Errores en la Importación Masiva

**Situación**: Errores al importar órdenes desde Excel.

**Errores Posibles**:

1. **Formato de archivo inválido**:
   - **Error**: Archivo no es Excel válido
   - **Causa**: Formato incorrecto o archivo corrupto
   - **Solución**: Verificar formato del archivo (XLSX)

2. **Errores en líneas**:
   - **Error**: Algunas líneas fallan
   - **Causa**: Datos inválidos en el archivo
   - **Solución**: 
     - Revisar errores reportados
     - Corregir datos inválidos
     - Reintentar la importación

3. **Productos no encontrados**:
   - **Error**: Productos en archivo no existen
   - **Causa**: SKU o nombre incorrecto
   - **Solución**: Verificar que los productos existen en el sistema

### Guía Rápida de Solución de Problemas

1. **No aparecen productos**: Verificar que hay stock disponible
2. **Error al crear orden**: Verificar que todos los campos obligatorios están completos
3. **Dirección no se crea**: Verificar formato de los datos de dirección
4. **No se generan pickings**: Verificar que la orden está confirmada desde el backend
5. **No aparecen expediciones**: Verificar que el usuario tiene `account.partner` asociado
6. **Error en importación**: Verificar formato del archivo y revisar errores reportados

---

## Resumen de Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CREAR EXPEDICIÓN (Portal)                                │
│    - Abrir modal de creación                                │
│    - Completar dirección de envío                          │
│    - Agregar productos                                      │
│    - Crear orden                                            │
│    → Crea sale.order en estado draft                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. VER LISTA DE EXPEDICIONES (Portal)                       │
│    - Ver todas las órdenes del account.partner             │
│    - Filtrar por estado, fecha, tracking                   │
│    - Buscar por nombre, referencia                         │
│    - Exportar a Excel                                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. VER DETALLES DE EXPEDICIÓN (Portal)                      │
│    - Ver información completa                              │
│    - Ver estado de pickings                                │
│    - Ver información de envío                             │
│    - Comunicación mediante chatter                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Notas Importantes

### Diferencias con Backend

1. **Estado Inicial**: Las órdenes se crean en estado `draft`, no se confirman automáticamente
2. **Direcciones**: Se crean automáticamente si no existen
3. **Filtros**: El catálogo filtra productos con stock disponible
4. **Comunicación**: Notificaciones bidireccionales automáticas en el chatter

### Mejores Prácticas

1. **Especificar dirección completa**: Incluir todos los datos de la dirección de envío
2. **Verificar stock antes de crear**: Asegurar que hay stock disponible
3. **Usar referencia del cliente**: Incluir referencia para tracking interno
4. **Usar búsqueda avanzada**: Aprovechar los filtros para encontrar expediciones específicas
5. **Exportar regularmente**: Exportar listas para mantener registros externos
6. **Usar chatter**: Comunicarse con el almacén mediante el chatter

### Troubleshooting

1. **No aparecen productos**: Verificar que hay stock disponible
2. **Error al crear orden**: Verificar que todos los campos obligatorios están completos
3. **Dirección no se crea**: Verificar formato de los datos de dirección
4. **No se generan pickings**: Verificar que la orden está confirmada desde el backend
5. **No aparecen expediciones**: Verificar que el usuario tiene `account.partner` asociado

---

## Referencias

- **Módulo**: `portal_expedition`
- **Modelos principales**:
  - `sale.order` - Orden de venta
  - `sale.order.line` - Línea de orden
  - `stock.picking` - Picking de expedición
  - `res.partner` - Direcciones de envío
  - `delivery.carrier` - Transportistas

---

**Última actualización**: 2025-01-XX
**Versión del módulo**: 18.0.1.0.0
