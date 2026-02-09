# Proceso de Gestión de Recepciones desde el Portal - Portal Reception

## Índice
1. [Prerequisitos](#prerequisitos)
2. [Configuración Inicial](#configuración-inicial)
3. [Proceso de Gestión de Recepciones - Flujo Completo](#proceso-de-gestión-de-recepciones---flujo-completo)
4. [Pasos Detallados](#pasos-detallados)
5. [Funcionalidades del Portal](#funcionalidades-del-portal)
6. [Casos Especiales](#casos-especiales)

---

## Prerequisitos

### Módulos Requeridos
El módulo `portal_reception` depende de los siguientes módulos:
- `portal_account` - Portal de cuenta
- `portal_catalog` - Catálogo de productos

### Configuraciones del Sistema
No se requieren configuraciones especiales del sistema. El módulo funciona con la configuración estándar.

### Acceso al Portal
**IMPORTANTE**: Este módulo está diseñado para ser usado **exclusivamente desde el portal del cliente**, no desde el backend de Odoo.

**URL del Portal**: `/account/reception`

---

## Configuración Inicial

### 1. Permisos de Usuario
- El usuario debe tener acceso al portal
- El usuario debe estar asociado a un `account.partner`
- El usuario solo puede ver y gestionar recepciones de su `account.partner`

### 2. Productos Disponibles
- Los productos deben estar disponibles en el catálogo
- No se requieren restricciones especiales de `account_partner_id` para recepciones

---

## Proceso de Gestión de Recepciones - Flujo Completo

El módulo `portal_reception` permite crear y gestionar recepciones de paquetes desde el portal del cliente.

```
Portal → Crear Recepción → Ver Lista → Ver Detalles → Seguimiento
```

### Resumen del Flujo

1. **FASE 1: Creación de Recepción** (Portal)
   - Cliente crea recepción desde el portal
   - Selecciona productos, tipo de paquete, tracking ref
   - Se crea `stock.picking` y `stock.quant.package` automáticamente

2. **FASE 2: Visualización de Recepciones** (Portal)
   - Ver lista de recepciones
   - Filtrar por estado, tipo de paquete, fecha
   - Exportar datos a Excel

3. **FASE 3: Detalles de Recepción** (Portal)
   - Ver información completa de la recepción
   - Ver estado del picking
   - Ver información de paquetes

---

## Pasos Detallados

### **FASE 1: Creación de Recepción**

**⚠️ IMPORTANTE**: Esta fase debe realizarse **directamente desde el portal del cliente**.

**Acceso**: Portal del cliente → Menú **"RMA"** → Botón **"Crear Recepción"**

**Ruta**: `/account/reception/create` (JSON)

**Pasos**:
1. **Desde el portal del cliente**: Abrir modal de creación de recepción
2. **Desde el portal del cliente**: Completar información de envío:
   - **OBLIGATORIO**: `tracking_number` - Referencia de seguimiento internacional
   - **OBLIGATORIO**: `scheduled_date` - Fecha programada (formato: DD-MM-YYYY HH:MM)
   - **OBLIGATORIO**: `package_type_id` - Tipo de paquete
   - **OPCIONAL**: `tracking_number_optional` - Referencia de seguimiento opcional
   - **OPCIONAL**: `carrier_id` - Transportista
   - **OPCIONAL**: `carrier_name` - Nombre del transportista
   - **OPCIONAL**: Dimensiones del paquete:
     - `width` - Ancho (cm)
     - `height` - Alto (cm)
     - `length` - Largo (cm)
   - **OPCIONAL**: Pesos:
     - `weight` - Peso del producto
     - `package_weight` - Peso del paquete/contenedor

3. **Desde el portal del cliente**: Agregar productos:
   - **OBLIGATORIO**: Seleccionar producto desde catálogo
   - **OBLIGATORIO**: Especificar cantidad
   - **OPCIONAL**: `package` - Número de paquete (si hay múltiples paquetes)
     - Si no se especifica, se asigna al paquete 1
     - Se pueden agrupar productos por número de paquete

4. **Desde el portal del cliente**: Crear recepción
   - El sistema crea automáticamente:
     - `stock.quant.package` para cada paquete único
     - `stock.picking` de tipo recepción (`incoming`)
     - `stock.move` para cada producto
     - `stock.move.line` asociadas a los paquetes correspondientes
     - `procurement.group` único para evitar fusiones

**Validaciones**:
- Debe haber al menos un producto
- El tipo de paquete es obligatorio
- La referencia de seguimiento internacional es obligatoria
- La fecha programada debe ser válida

**Nota**: Los productos se agrupan por número de paquete. Si se especifica `package = '1'` para varios productos, todos van al mismo paquete.

---

### **FASE 2: Visualización de Recepciones**

**Acceso**: Portal del cliente → Menú **"RMA"**

**Ruta**: `/account/reception` (HTTP)

**Funcionalidades**:

1. **Lista de Recepciones**:
   - Muestra todas las recepciones del `account.partner` del usuario
   - Columnas visibles:
     - Nombre/Referencia del picking
     - Origen
     - Cliente
     - Fecha programada
     - Estado
     - Paquete
     - Tipo de paquete

2. **Filtros Rápidos**:
   - **All** - Todas las recepciones
   - **Pending** - Pendientes
   - **Done** - Completadas
   - **Cancel** - Canceladas

3. **Búsqueda Avanzada**:
   - Búsqueda por nombre
   - Búsqueda por paquete
   - Filtro por peso
   - Filtro por peso de envío
   - Filtro por tipo de paquete
   - Filtro por fecha programada
   - Filtro por estado

4. **Exportación**:
   - Exportar lista a Excel
   - Incluye todas las columnas visibles
   - Respeta filtros y búsquedas aplicadas

5. **Paginación**:
   - Límite configurable por usuario
   - Navegación entre páginas

---

### **FASE 3: Detalles de Recepción**

**Acceso**: Portal del cliente → Menú **"RMA"** → Click en recepción

**Ruta**: `/account/reception/details/<id>`

**Información Mostrada**:

1. **Información General**:
   - Nombre/Referencia del picking
   - Origen
   - Cliente
   - Fecha programada
   - Estado del picking

2. **Información de Paquetes**:
   - Nombre del paquete
   - Tipo de paquete
   - Referencia de seguimiento internacional
   - Referencia de seguimiento opcional
   - Transportista
   - Peso del paquete

3. **Información de Productos**:
   - Lista de productos en la recepción
   - Cantidades
   - Paquetes asociados

4. **Historial**:
   - Cambios de estado
   - Mensajes del chatter
   - Actividades relacionadas

---

## Funcionalidades del Portal

### 1. Búsqueda de Productos

**Endpoint**: `/account/reception/product-search` (JSON)

**Funcionalidad**:
- Búsqueda de productos delegada al catálogo centralizado
- No se aplican filtros de stock (se pueden recibir productos sin stock)

**Resultado**:
- Lista de productos con información básica

### 2. Catálogo de Productos

**Endpoint**: `/account/reception/product-catalog` (JSON)

**Funcionalidad**:
- Muestra catálogo paginado de productos
- Delegado al catálogo centralizado
- Búsqueda por término
- Paginación

### 3. Búsqueda de Transportistas

**Endpoint**: `/account/reception/carrier-search` (JSON)

**Funcionalidad**:
- Búsqueda de transportistas por nombre o tipo
- Resultados limitados a 10

**Parámetros**:
- `term` - Término de búsqueda (opcional)

**Resultado**:
- Lista de transportistas con:
  - ID, nombre, tipo de entrega

### 4. Búsqueda de Tipos de Paquete

**Endpoint**: `/account/reception/package-type-search` (JSON)

**Funcionalidad**:
- Búsqueda de tipos de paquete por nombre o tipo de transportista
- Resultados limitados a 10

**Parámetros**:
- `term` - Término de búsqueda (opcional)

**Resultado**:
- Lista de tipos de paquete con:
  - ID, nombre
  - Dimensiones (ancho, alto, largo)
  - Peso base

---

## Casos Especiales

### 1. Múltiples Paquetes en una Recepción

**Situación**: Se especifican diferentes números de paquete para los productos.

**Comportamiento**:
- Se crea un `stock.quant.package` por cada número de paquete único
- Cada paquete tiene su propio nombre generado automáticamente
- Los productos se agrupan por número de paquete en las líneas de movimiento

**Solución**:
- Especificar el número de paquete para cada producto
- El sistema agrupa automáticamente los productos por paquete

### 2. Productos con Tracking Serial

**Situación**: Producto con `tracking = 'serial'`.

**Comportamiento**:
- Se crea una línea de movimiento (`stock.move.line`) por cada unidad
- Cada línea tiene `quantity = 1`
- Todas las líneas se asocian al mismo paquete

**Solución**:
- El sistema maneja automáticamente la creación de líneas individuales
- No se requiere acción adicional del usuario

### 3. Productos sin Tracking

**Situación**: Producto con `tracking = 'none'` o `tracking = 'lot'`.

**Comportamiento**:
- Se crea una sola línea de movimiento con la cantidad total
- La línea se asocia al paquete correspondiente

**Solución**:
- El sistema maneja automáticamente la creación de líneas
- No se requiere acción adicional del usuario

### 4. Cálculo de Peso

**Situación**: Se especifican pesos de producto y paquete.

**Comportamiento**:
- El peso total del picking se calcula como suma de (peso_producto × cantidad) para todos los productos
- El peso del paquete se calcula como: `weight + package_weight` (o `base_weight` del tipo de paquete si no se especifica)

**Solución**:
- Especificar pesos si es necesario para tracking
- El sistema calcula automáticamente los pesos totales

### 5. Fecha Programada

**Situación**: Se especifica fecha programada en formato local.

**Comportamiento**:
- La fecha se convierte automáticamente a UTC
- Se considera la zona horaria del usuario (`user.tz`)

**Solución**:
- Introducir la fecha en formato: `DD-MM-YYYY HH:MM`
- El sistema convierte automáticamente a UTC

### 6. Procurement Group Único

**Situación**: Se crea un `procurement.group` único para cada recepción.

**Comportamiento**:
- Previene que la recepción se fusione con otras recepciones
- El nombre del grupo es la referencia de seguimiento internacional

**Solución**:
- El sistema maneja automáticamente la creación del grupo
- No se requiere acción adicional del usuario

---

## Resumen de Procesos que Pueden Fallar

### Tabla de Errores Comunes

| Fase | Proceso | Error Posible | Causa | Solución |
|------|---------|---------------|-------|----------|
| **FASE 1** | Crear recepción | Sin productos | No se seleccionaron productos | Seleccionar al menos un producto |
| **FASE 1** | Crear recepción | Sin tipo de paquete | No se seleccionó package_type_id | Seleccionar tipo de paquete |
| **FASE 1** | Crear recepción | Sin tracking ref | No se especificó global_tracking_ref | Introducir referencia de seguimiento |
| **FASE 1** | Crear recepción | Sin fecha programada | No se especificó scheduled_date | Introducir fecha programada |
| **FASE 1** | Crear recepción | Fecha inválida | Formato de fecha incorrecto | Usar formato DD-MM-YYYY HH:MM |
| **FASE 1** | Crear recepción | Error al crear picking | Fallo en creación | Verificar datos y reintentar |
| **FASE 2** | Ver recepciones | No aparecen recepciones | Sin account.partner | Verificar asociación de usuario |

### Errores en la Creación de Recepción

**Situación**: Errores al crear una recepción desde el portal.

**Errores Posibles**:

1. **Sin productos seleccionados**:
   - **Error**: Validación falla
   - **Causa**: No se seleccionó ningún producto
   - **Solución**: Seleccionar al menos un producto antes de crear la recepción

2. **Sin tipo de paquete**:
   - **Error**: Validación falla
   - **Causa**: No se seleccionó `package_type_id`
   - **Solución**: Seleccionar un tipo de paquete válido

3. **Sin referencia de seguimiento**:
   - **Error**: Validación falla
   - **Causa**: No se especificó `global_tracking_ref`
   - **Solución**: Introducir la referencia de seguimiento internacional

4. **Sin fecha programada**:
   - **Error**: Validación falla
   - **Causa**: No se especificó `scheduled_date`
   - **Solución**: Introducir la fecha programada en formato DD-MM-YYYY HH:MM

5. **Fecha inválida**:
   - **Error**: Validación falla
   - **Causa**: Formato de fecha incorrecto
   - **Solución**: Usar formato DD-MM-YYYY HH:MM (ej: "25-01-2025 14:30")

6. **Error al crear picking**:
   - **Error**: Fallo en creación de `stock.picking` o `stock.quant.package`
   - **Causa**: Datos inválidos o configuración incorrecta
   - **Solución**: 
     - Verificar que todos los campos obligatorios están completos
     - Verificar que el tipo de paquete existe
     - Reintentar la creación

### Errores en la Visualización de Recepciones

**Situación**: Errores al ver la lista de recepciones.

**Errores Posibles**:

1. **No aparecen recepciones**:
   - **Causa**: El usuario no tiene `account.partner` asociado
   - **Solución**: Verificar que el usuario tiene `account.partner` configurado

### Errores en la Búsqueda de Productos

**Situación**: Errores al buscar productos desde el portal.

**Errores Posibles**:

1. **No aparecen productos**:
   - **Causa**: El catálogo no está configurado correctamente
   - **Solución**: Verificar configuración del catálogo

### Errores en la Búsqueda de Transportistas

**Situación**: Errores al buscar transportistas.

**Errores Posibles**:

1. **No aparecen transportistas**:
   - **Causa**: No hay transportistas configurados
   - **Solución**: Configurar transportistas en el backend

### Errores en la Búsqueda de Tipos de Paquete

**Situación**: Errores al buscar tipos de paquete.

**Errores Posibles**:

1. **No aparecen tipos de paquete**:
   - **Causa**: No hay tipos de paquete configurados
   - **Solución**: Configurar tipos de paquete en el backend

### Guía Rápida de Solución de Problemas

1. **No aparecen productos**: Verificar que el catálogo está configurado correctamente
2. **Error al crear recepción**: Verificar que todos los campos obligatorios están completos (tipo de paquete, tracking ref, fecha)
3. **Paquetes no se crean**: Verificar que se especificó tipo de paquete
4. **Productos no se agrupan**: Verificar que se especificó número de paquete correctamente
5. **Fecha incorrecta**: Verificar formato de fecha (DD-MM-YYYY HH:MM)
6. **No aparecen recepciones**: Verificar que el usuario tiene `account.partner` asociado

---

## Resumen de Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CREAR RECEPCIÓN (Portal)                                 │
│    - Abrir modal de creación                                │
│    - Completar información de envío                         │
│    - Agregar productos (con número de paquete si aplica)   │
│    - Crear recepción                                        │
│    → Crea stock.picking, stock.quant.package, moves        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. VER LISTA DE RECEPCIONES (Portal)                        │
│    - Ver todas las recepciones del account.partner         │
│    - Filtrar por estado, tipo de paquete, fecha            │
│    - Buscar por nombre, paquete                            │
│    - Exportar a Excel                                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. VER DETALLES DE RECEPCIÓN (Portal)                       │
│    - Ver información completa                              │
│    - Ver estado del picking                                │
│    - Ver información de paquetes                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Notas Importantes

### Diferencias con Backend

1. **Creación Automática**: El picking se confirma y asigna automáticamente al crear desde el portal
2. **Paquetes Automáticos**: Los paquetes se crean automáticamente con nombres generados
3. **Agrupación**: Los productos se agrupan automáticamente por número de paquete
4. **Procurement Group**: Se crea un grupo único para evitar fusiones

### Mejores Prácticas

1. **Especificar tracking ref**: Siempre incluir referencia de seguimiento internacional
2. **Agrupar por paquetes**: Usar números de paquete para agrupar productos físicamente
3. **Especificar dimensiones**: Incluir dimensiones y pesos si están disponibles
4. **Usar búsqueda avanzada**: Aprovechar los filtros para encontrar recepciones específicas
5. **Exportar regularmente**: Exportar listas para mantener registros externos

### Troubleshooting

1. **No aparecen productos**: Verificar que el catálogo está configurado correctamente
2. **Error al crear recepción**: Verificar que todos los campos obligatorios están completos
3. **Paquetes no se crean**: Verificar que se especificó tipo de paquete
4. **Productos no se agrupan**: Verificar que se especificó número de paquete correctamente
5. **Fecha incorrecta**: Verificar formato de fecha (DD-MM-YYYY HH:MM)

---

## Referencias

- **Módulo**: `portal_reception`
- **Modelos principales**:
  - `stock.picking` - Picking de recepción
  - `stock.quant.package` - Paquetes
  - `stock.move` - Movimientos de stock
  - `stock.move.line` - Líneas de movimiento
  - `procurement.group` - Grupo de procuración
  - `stock.package.type` - Tipos de paquete
  - `delivery.carrier` - Transportistas

---

**Última actualización**: 2025-01-XX
**Versión del módulo**: 18.0.1.0.0
