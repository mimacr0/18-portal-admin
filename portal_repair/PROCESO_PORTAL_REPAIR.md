# Proceso de Gestión de Reparaciones desde el Portal - Portal Repair

## Índice
1. [Prerequisitos](#prerequisitos)
2. [Configuración Inicial](#configuración-inicial)
3. [Proceso de Gestión de Reparaciones - Flujo Completo](#proceso-de-gestión-de-reparaciones---flujo-completo)
4. [Pasos Detallados](#pasos-detallados)
5. [Funcionalidades del Portal](#funcionalidades-del-portal)
6. [Casos Especiales](#casos-especiales)

---

## Prerequisitos

### Módulos Requeridos
El módulo `portal_repair` depende de los siguientes módulos:
- `base` - Base de Odoo
- `portal_admin_theme` - Tema del portal
- `portal_account` - Portal de cuenta
- `portal_catalog` - Catálogo de productos
- `repair_module` - Módulo de reparaciones

### Configuraciones del Sistema
No se requieren configuraciones especiales del sistema. El módulo funciona con la configuración estándar.

### Acceso al Portal
**IMPORTANTE**: Este módulo está diseñado para ser usado **exclusivamente desde el portal del cliente**, no desde el backend de Odoo.

**URL del Portal**: `/account/repair`

---

## Configuración Inicial

### 1. Permisos de Usuario
- El usuario debe tener acceso al portal
- El usuario debe estar asociado a un `account.partner`
- El usuario solo puede ver y gestionar reparaciones de su `account.partner`

### 2. Productos Disponibles
- Los productos deben tener `account_partner_id` asociado
- Los productos deben ser almacenables (`is_storable = True`)
- Los productos deben tener tracking `serial` o `none` (no se permiten `lot`)

---

## Proceso de Gestión de Reparaciones - Flujo Completo

El módulo `portal_repair` gestiona **alertas de reparación** (`quality.alert`) desde el portal del cliente. No gestiona directamente `repair.order` por razones de seguridad.

```
Portal → Crear Alerta → Ver Lista → Ver Detalles → Seguimiento
```

### Resumen del Flujo

1. **FASE 1: Creación de Alerta de Reparación** (Portal)
   - Cliente crea alerta desde el portal
   - Selecciona productos, cantidades, descripción del problema
   - Se crea `quality.alert` y `stock.picking` automáticamente

2. **FASE 2: Visualización de Alertas** (Portal)
   - Ver lista de alertas de reparación
   - Filtrar por estado, tipo, fecha
   - Exportar datos a Excel

3. **FASE 3: Detalles de Alerta** (Portal)
   - Ver información completa de la alerta
   - Ver estado de la reparación
   - Ver historial de cambios

---

## Pasos Detallados

### **FASE 1: Creación de Alerta de Reparación**

**⚠️ IMPORTANTE**: Esta fase debe realizarse **directamente desde el portal del cliente**.

**Acceso**: Portal del cliente → Menú **"SAT"** → Botón **"Crear Alerta de Reparación"**

**Ruta**: `/account/repair-alert/create` (JSON)

**Pasos**:
1. **Desde el portal del cliente**: Abrir modal de creación de alerta
2. **Desde el portal del cliente**: Completar información general:
   - **OBLIGATORIO**: `name` - Título de la alerta
   - **OBLIGATORIO**: `problem` - Descripción del problema
   - **OBLIGATORIO**: `maintenance_op` - Tipo de mantenimiento:
     - `repair` - Reparación
     - `review` - Revisión
     - `renew` - Renovación
     - `warranty` - Garantía
   - **OBLIGATORIO**: Al menos un producto con cantidad

3. **Desde el portal del cliente**: Agregar productos:
   - **OBLIGATORIO**: Seleccionar producto desde catálogo
   - **OBLIGATORIO**: Especificar cantidad
   - **OPCIONAL**: Para productos con `tracking = 'serial'`:
     - Seleccionar lote/serial desde lista disponible
   - **OPCIONAL**: Para productos con `tracking = 'none'`:
     - Seleccionar ubicación desde lista disponible

4. **Desde el portal del cliente**: Crear alerta
   - El sistema crea automáticamente:
     - `quality.alert` para cada línea de producto
     - `stock.picking` de traslado interno (si aplica)
     - `stock.move` asociado a la alerta

**Validaciones**:
- Debe haber al menos un producto
- Los productos deben tener `account_partner_id` del usuario
- Para productos con tracking, debe seleccionarse lote/serial válido
- Para productos sin tracking, debe seleccionarse ubicación válida

**Nota**: Se crea una `quality.alert` por cada línea de producto. Todas las alertas comparten los valores comunes (título, descripción, tipo de mantenimiento).

---

### **FASE 2: Visualización de Alertas**

**Acceso**: Portal del cliente → Menú **"SAT"**

**Ruta**: `/account/repair` (HTTP)

**Funcionalidades**:

1. **Lista de Alertas**:
   - Muestra todas las alertas de reparación del `account.partner` del usuario
   - Columnas visibles:
     - Nombre/Referencia
     - Producto
     - Estado (Stage)
     - Fecha de programación
     - Fecha de finalización
     - Tipo de mantenimiento

2. **Filtros Rápidos**:
   - **All** - Todas las alertas
   - **Active** - Alertas activas
   - **In transit** - En tránsito
   - **In warehouse** - En almacén
   - **Sent to repair** - Enviadas a reparación
   - **Repairing** - En reparación
   - **Done** - Completadas
   - **Cancel** - Canceladas

3. **Búsqueda Avanzada**:
   - Búsqueda por nombre
   - Búsqueda por producto
   - Filtro por fecha de programación
   - Filtro por fecha de finalización
   - Filtro por estado (stage)
   - Filtro por tipo de mantenimiento

4. **Exportación**:
   - Exportar lista a Excel
   - Incluye todas las columnas visibles
   - Respeta filtros y búsquedas aplicadas

5. **Paginación**:
   - Límite configurable por usuario
   - Navegación entre páginas

---

### **FASE 3: Detalles de Alerta**

**Acceso**: Portal del cliente → Menú **"SAT"** → Click en alerta

**Ruta**: `/account/repair-alert/details/<id>`

**Información Mostrada**:

1. **Información General**:
   - Título de la alerta
   - Descripción del problema
   - Tipo de mantenimiento
   - Estado actual (stage)
   - Producto asociado
   - Cantidad

2. **Información de Reparación**:
   - Fecha de programación
   - Fecha de finalización
   - Estado de la reparación (`repair.order`)

3. **Información de Stock**:
   - Picking asociado (si existe)
   - Ubicación actual
   - Lote/Serial (si aplica)

4. **Historial**:
   - Cambios de estado
   - Mensajes del chatter
   - Actividades relacionadas

---

## Funcionalidades del Portal

### 1. Búsqueda de Productos

**Endpoint**: `/account/repair-alert/product-search` (JSON)

**Funcionalidad**:
- Búsqueda de productos por:
  - Nombre
  - Código (`default_code`)
  - Código de barras (`barcode`)
  - Atributos de producto
- Filtros aplicados:
  - Solo productos del `account.partner` del usuario
  - Solo productos almacenables (`is_storable = True`)
  - Solo productos con tracking `serial` o `none`

**Resultado**:
- Lista de productos con:
  - ID, nombre, código, código de barras
  - Precio, moneda
  - Atributos
  - Imagen
  - Tipo de tracking

### 2. Catálogo de Productos

**Endpoint**: `/account/repair-alert/product-catalog` (JSON)

**Funcionalidad**:
- Muestra catálogo paginado de productos
- Filtros aplicados:
  - Solo productos del `account.partner` del usuario
  - Solo productos con tracking `serial` o `none`
- Búsqueda por término
- Paginación

### 3. Búsqueda de Lotes/Seriales

**Endpoint**: `/account/repair-alert/product-lots` (JSON)

**Funcionalidad**:
- Obtiene lotes disponibles para un producto
- Filtros aplicados:
  - Solo lotes con stock disponible
  - Solo en ubicaciones internas
- Optimizado con `read_group` para mejor rendimiento

**Parámetros**:
- `product_id` - ID del producto (obligatorio)
- `term` - Término de búsqueda (opcional)

### 4. Búsqueda de Ubicaciones

**Endpoint**: `/account/repair-alert/product-locations` (JSON)

**Funcionalidad**:
- Obtiene ubicaciones con stock disponible para un producto
- Filtros aplicados:
  - Solo ubicaciones internas
  - Solo ubicaciones con stock disponible
  - Excluye ubicación de reparaciones
- Optimizado con `read_group` para mejor rendimiento

**Parámetros**:
- `product_id` - ID del producto (obligatorio)
- `term` - Término de búsqueda (opcional)

---

## Casos Especiales

### 1. Productos sin Tracking

**Situación**: Producto con `tracking = 'none'`.

**Comportamiento**:
- Se debe seleccionar una ubicación con stock disponible
- El sistema crea `stock.picking` de traslado interno desde esa ubicación
- Se valida que haya stock suficiente en la ubicación

**Solución**:
- Seleccionar ubicación desde la lista disponible
- Verificar que hay stock suficiente

### 2. Productos con Tracking Serial

**Situación**: Producto con `tracking = 'serial'`.

**Comportamiento**:
- Se debe seleccionar un lote/serial específico
- El sistema crea `stock.picking` de traslado interno para ese serial
- Se valida que el serial exista y tenga stock disponible

**Solución**:
- Seleccionar serial desde la lista disponible
- Verificar que el serial existe y está disponible

### 3. Múltiples Productos en una Alerta

**Situación**: Se crean múltiples productos en el mismo formulario.

**Comportamiento**:
- Se crea una `quality.alert` por cada producto
- Todas las alertas comparten:
  - Título (`name`)
  - Descripción del problema (`description`)
  - Tipo de mantenimiento (`maintenance_type`)
- Cada alerta tiene su propio:
  - Producto
  - Cantidad
  - Lote/Serial o Ubicación

**Solución**:
- Agregar todos los productos necesarios en el mismo formulario
- Cada producto se procesa independientemente

### 4. Error al Crear Movimiento de Stock

**Situación**: Fallo al crear `stock.picking` o `stock.move`.

**Comportamiento**:
- La `quality.alert` creada se elimina automáticamente
- Se muestra mensaje de error al usuario
- No se crea ninguna alerta si falla alguna

**Solución**:
- Verificar que hay stock disponible
- Verificar que la ubicación es válida
- Verificar que el lote/serial existe
- Reintentar la creación

### 5. Productos sin Stock Disponible

**Situación**: No hay stock disponible para el producto/lote/ubicación seleccionado.

**Comportamiento**:
- No se muestran en las listas de búsqueda
- Si se intenta crear, falla con error de validación

**Solución**:
- Verificar stock disponible antes de crear la alerta
- Seleccionar otro lote/ubicación con stock disponible

---

## Resumen de Procesos que Pueden Fallar

### Tabla de Errores Comunes

| Fase | Proceso | Error Posible | Causa | Solución |
|------|---------|---------------|-------|----------|
| **FASE 1** | Crear alerta | Sin productos | No se seleccionaron productos | Seleccionar al menos un producto |
| **FASE 1** | Crear alerta | Producto sin account_partner_id | Producto no asociado | Asociar producto a account.partner |
| **FASE 1** | Crear alerta | Sin lote (tracking serial) | Producto serial sin lote | Seleccionar lote válido |
| **FASE 1** | Crear alerta | Sin ubicación (no tracking) | Producto sin ubicación con stock | Seleccionar ubicación con stock |
| **FASE 1** | Crear alerta | Error al crear picking | Fallo en creación de movimiento | Verificar datos y reintentar |
| **FASE 1** | Crear alerta | Alerta eliminada | Fallo al crear picking | Se elimina automáticamente |
| **FASE 2** | Ver alertas | No aparecen alertas | Sin account.partner | Verificar asociación de usuario |
| **FASE 3** | Ver detalles | Alerta no encontrada | ID inválido o sin permisos | Verificar permisos y ID |

### Errores en la Creación de Alerta

**Situación**: Errores al crear una alerta de reparación desde el portal.

**Errores Posibles**:

1. **Sin productos seleccionados**:
   - **Error**: Validación falla
   - **Causa**: No se seleccionó ningún producto
   - **Solución**: Seleccionar al menos un producto antes de crear la alerta

2. **Producto sin `account_partner_id`**:
   - **Error**: Producto no aparece en catálogo
   - **Causa**: El producto no tiene `account_partner_id` del usuario
   - **Solución**: Asociar el producto al `account.partner` del usuario

3. **Producto serial sin lote**:
   - **Error**: Validación falla
   - **Causa**: Producto con `tracking = 'serial'` pero no se seleccionó lote
   - **Solución**: Seleccionar un lote/serial válido desde la lista disponible

4. **Producto sin tracking sin ubicación**:
   - **Error**: Validación falla
   - **Causa**: Producto con `tracking = 'none'` pero no se seleccionó ubicación
   - **Solución**: Seleccionar una ubicación con stock disponible

5. **Error al crear movimiento de stock**:
   - **Error**: La alerta se elimina automáticamente
   - **Causa**: Fallo al crear `stock.picking` o `stock.move`
   - **Solución**: 
     - Verificar que hay stock disponible
     - Verificar que la ubicación es válida
     - Verificar que el lote/serial existe
     - Reintentar la creación

6. **Productos sin stock disponible**:
   - **Error**: No aparecen en listas de búsqueda
   - **Causa**: No hay stock disponible para el producto/lote/ubicación
   - **Solución**: 
     - Verificar stock disponible antes de crear la alerta
     - Seleccionar otro lote/ubicación con stock disponible

### Errores en la Visualización de Alertas

**Situación**: Errores al ver la lista de alertas.

**Errores Posibles**:

1. **No aparecen alertas**:
   - **Causa**: El usuario no tiene `account.partner` asociado
   - **Solución**: Verificar que el usuario tiene `account.partner` configurado

2. **Alertas de otro cliente**:
   - **Causa**: Filtro de `account.partner` no funciona correctamente
   - **Solución**: Verificar permisos y configuración del módulo

### Errores en la Búsqueda de Productos

**Situación**: Errores al buscar productos desde el portal.

**Errores Posibles**:

1. **No aparecen productos**:
   - **Causa**: Los productos no tienen `account_partner_id` del usuario
   - **Solución**: Asociar productos al `account.partner` del usuario

2. **Productos no almacenables**:
   - **Causa**: Productos con `is_storable = False`
   - **Solución**: Verificar que los productos son almacenables

3. **Productos con tracking lot**:
   - **Causa**: Productos con `tracking = 'lot'` no se permiten
   - **Solución**: Solo se permiten productos con `tracking = 'serial'` o `'none'`

### Errores en la Búsqueda de Lotes/Seriales

**Situación**: Errores al buscar lotes/seriales para un producto.

**Errores Posibles**:

1. **No aparecen lotes**:
   - **Causa**: No hay stock disponible con lotes
   - **Solución**: Verificar que hay stock disponible con lotes en ubicaciones internas

2. **Lotes reservados**:
   - **Causa**: Los lotes están reservados (`reserved_quantity >= quantity`)
   - **Solución**: Esperar a que se liberen o seleccionar otro lote

### Errores en la Búsqueda de Ubicaciones

**Situación**: Errores al buscar ubicaciones para un producto.

**Errores Posibles**:

1. **No aparecen ubicaciones**:
   - **Causa**: No hay stock disponible en ubicaciones internas
   - **Solución**: Verificar que hay stock disponible en ubicaciones internas

2. **Ubicación de reparaciones excluida**:
   - **Causa**: La ubicación de reparaciones se excluye automáticamente
   - **Solución**: Seleccionar otra ubicación con stock disponible

### Guía Rápida de Solución de Problemas

1. **No aparecen productos**: Verificar que los productos tienen `account_partner_id` correcto
2. **No aparecen lotes**: Verificar que hay stock disponible con lotes
3. **Error al crear alerta**: Verificar stock disponible, lote/ubicación válidos, y datos completos
4. **No se crea picking**: Verificar que la ubicación/lote es válido y hay stock disponible
5. **No aparecen alertas**: Verificar que el usuario tiene `account.partner` asociado
6. **Alerta eliminada automáticamente**: Verificar que el picking se creó correctamente, si falla, la alerta se elimina

---

## Resumen de Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CREAR ALERTA DE REPARACIÓN (Portal)                     │
│    - Abrir modal de creación                                │
│    - Completar información general                          │
│    - Agregar productos (con lote/ubicación si aplica)      │
│    - Crear alerta                                           │
│    → Crea quality.alert y stock.picking                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. VER LISTA DE ALERTAS (Portal)                            │
│    - Ver todas las alertas del account.partner             │
│    - Filtrar por estado, tipo, fecha                        │
│    - Buscar por nombre, producto                           │
│    - Exportar a Excel                                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. VER DETALLES DE ALERTA (Portal)                          │
│    - Ver información completa                              │
│    - Ver estado de reparación                              │
│    - Ver historial y mensajes                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Notas Importantes

### Diferencias con Backend

1. **Modelo**: El portal gestiona `quality.alert`, no `repair.order` directamente
2. **Seguridad**: Solo se pueden ver alertas del `account.partner` del usuario
3. **Creación**: Se crean automáticamente `stock.picking` al crear alertas
4. **Filtros**: Los productos se filtran automáticamente por `account.partner`

### Mejores Prácticas

1. **Describir el problema claramente**: Usar descripciones detalladas para facilitar la reparación
2. **Seleccionar el tipo correcto**: Elegir el tipo de mantenimiento adecuado
3. **Verificar stock antes de crear**: Asegurar que hay stock disponible antes de crear la alerta
4. **Usar búsqueda avanzada**: Aprovechar los filtros para encontrar alertas específicas
5. **Exportar regularmente**: Exportar listas para mantener registros externos

### Troubleshooting

1. **No aparecen productos**: Verificar que los productos tienen `account_partner_id` correcto
2. **No aparecen lotes**: Verificar que hay stock disponible con lotes
3. **Error al crear alerta**: Verificar stock disponible y datos válidos
4. **No se crea picking**: Verificar que la ubicación/lote es válido
5. **No aparecen alertas**: Verificar que el usuario tiene `account.partner` asociado

---

## Referencias

- **Módulo**: `portal_repair`
- **Modelos principales**:
  - `quality.alert` - Alerta de reparación
  - `repair.order` - Orden de reparación (solo lectura desde portal)
  - `stock.picking` - Picking de traslado interno
  - `product.product` - Productos
  - `stock.lot` - Lotes/Seriales
  - `stock.location` - Ubicaciones

---

**Última actualización**: 2025-01-XX
**Versión del módulo**: 18.0.1.0.0
