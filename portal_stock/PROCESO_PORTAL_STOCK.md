# Proceso de Gestión de Stock desde el Portal - Portal Stock

## Índice
1. [Prerequisitos](#prerequisitos)
2. [Configuración Inicial](#configuración-inicial)
3. [Proceso de Gestión de Stock - Flujo Completo](#proceso-de-gestión-de-stock---flujo-completo)
4. [Pasos Detallados](#pasos-detallados)
5. [Funcionalidades del Portal](#funcionalidades-del-portal)
6. [Gestión de Lotes/Seriales](#gestión-de-lotesseriales)
7. [Casos Especiales](#casos-especiales)

---

## Prerequisitos

### Módulos Requeridos
El módulo `portal_stock` depende de los siguientes módulos:
- `portal_account` - Portal de cuenta
- `repair_module` - Módulo de reparaciones

### Configuraciones del Sistema
No se requieren configuraciones especiales del sistema. El módulo funciona con la configuración estándar.

### Acceso al Portal
**IMPORTANTE**: Este módulo está diseñado para ser usado **exclusivamente desde el portal del cliente**, no desde el backend de Odoo.

**URL del Portal**: `/account/stock`

---

## Configuración Inicial

### 1. Permisos de Usuario
- El usuario debe tener acceso al portal
- El usuario debe estar asociado a un `account.partner`
- El usuario solo puede ver y gestionar productos de su `account.partner`

### 2. Productos Disponibles
- Los productos deben tener `account_partner_id` asociado
- Los productos deben ser almacenables (`is_storable = True`)

---

## Proceso de Gestión de Stock - Flujo Completo

El módulo `portal_stock` permite gestionar productos, stock y lotes/seriales desde el portal del cliente.

```
Portal → Ver Productos → Crear/Editar Productos → Ver Lotes → Seguimiento
```

### Resumen del Flujo

1. **FASE 1: Visualización de Productos** (Portal)
   - Ver lista de productos del `account.partner`
   - Filtrar por stock, estado, categoría
   - Exportar datos a Excel

2. **FASE 2: Creación/Edición de Productos** (Portal)
   - Crear nuevos productos
   - Editar productos existentes
   - Gestionar atributos y variantes

3. **FASE 3: Visualización de Lotes/Seriales** (Portal)
   - Ver lista de lotes/seriales
   - Ver detalles de lotes
   - Filtrar por producto, ubicación, estado

---

## Pasos Detallados

### **FASE 1: Visualización de Productos**

**Acceso**: Portal del cliente → Menú **"Stock"**

**Ruta**: `/account/stock` (HTTP)

**Funcionalidades**:

1. **Lista de Productos**:
   - Muestra todos los productos del `account.partner` del usuario
   - Columnas visibles:
     - Nombre
     - Código de barras
     - Stock disponible
     - Reparaciones (estado)
     - Estado (In Stock/Out of Stock)
     - Acciones

2. **Filtros Rápidos**:
   - **All** - Todos los productos
   - **In Stock** - Productos con stock disponible (excluye repuestos)
   - **Out of Stock** - Productos sin stock (excluye repuestos)
   - **In Stock Spare Parts** - Repuestos con stock disponible
   - **Out of Stock Spare Parts** - Repuestos sin stock

3. **Búsqueda Avanzada**:
   - Búsqueda por nombre
   - Búsqueda por SKU
   - Búsqueda por código de barras
   - Filtro por stock
   - Filtro por estado

4. **Exportación**:
   - Exportar lista a Excel
   - Incluye todas las columnas visibles
   - Respeta filtros y búsquedas aplicadas

5. **Paginación**:
   - Límite configurable por usuario
   - Navegación entre páginas

6. **Badges**:
   - Badge de tipo de producto (Product/Spare Parts)
   - Badge de estado de stock (In Stock/Out of Stock)

---

### **FASE 2: Creación de Productos**

**⚠️ IMPORTANTE**: Esta fase debe realizarse **directamente desde el portal del cliente**.

**Acceso**: Portal del cliente → Menú **"Stock"** → Botón **"Crear Producto"**

**Ruta**: `/account/stock/create/product` (JSON)

**Pasos**:
1. **Desde el portal del cliente**: Abrir modal de creación de producto
2. **Desde el portal del cliente**: Completar información básica:
   - **OBLIGATORIO**: `name` - Nombre del producto
   - **OPCIONAL**: `sku` - Código SKU (`default_code`)
   - **OPCIONAL**: `barcode` - Código de barras
   - **OPCIONAL**: `tracking` - Tipo de tracking:
     - `none` - Sin tracking
     - `serial` - Tracking por número de serie
   - **OPCIONAL**: Dimensiones:
     - `width` - Ancho (cm)
     - `height` - Alto (cm)
     - `length` - Largo (cm)
   - **OPCIONAL**: `volume` - Volumen (cm³)
   - **OPCIONAL**: `weight` - Peso (kg)
   - **OPCIONAL**: `image_base64` - Imagen del producto (base64)

3. **Desde el portal del cliente**: Agregar atributos (OPCIONAL):
   - Seleccionar atributo (Color, RAM, ROM, etc.)
   - Seleccionar valores del atributo
   - Se pueden agregar múltiples atributos
   - El sistema crea variantes automáticamente

4. **Desde el portal del cliente**: Crear producto
   - El sistema crea automáticamente:
     - `product.template` con la información básica
     - `product.product` (variante) si no hay atributos
     - Múltiples `product.product` (variantes) si hay atributos
     - `product.attribute.line` para cada atributo
     - Asocia el producto al `account.partner` del usuario

**Validaciones**:
- El nombre del producto es obligatorio
- El producto se crea como `type = 'consu'` (consumible)
- El producto se marca como `is_storable = True`
- Los precios se establecen en 0.0

**Nota**: Si se especifican atributos, el sistema crea todas las combinaciones posibles de variantes automáticamente.

---

### **FASE 3: Edición de Productos**

**Acceso**: Portal del cliente → Menú **"Stock"** → Click en producto → Botón **"Editar"**

**Ruta**: `/account/stock/update/product` (JSON)

**Pasos**:
1. **Desde el portal del cliente**: Abrir modal de edición
2. **Desde el portal del cliente**: Editar información:
   - **OPCIONAL**: `name` - Nombre del producto
   - **OPCIONAL**: `sku` - Código SKU
   - **OPCIONAL**: `barcode` - Código de barras
   - **OPCIONAL**: Dimensiones y peso
   - **OPCIONAL**: Imagen

3. **Desde el portal del cliente**: Actualizar variantes (si aplica):
   - Editar SKU de cada variante
   - Editar código de barras de cada variante
   - Editar dimensiones y peso de cada variante

4. **Desde el portal del cliente**: Guardar cambios
   - El sistema actualiza:
     - `product.template` con la información general
     - `product.product` (variantes) con información específica

**Validaciones**:
- Solo se pueden editar productos del `account.partner` del usuario
- Para productos con `tracking = 'serial'`, solo se actualiza la variante específica
- Para productos sin tracking, se actualiza tanto el template como la variante

---

### **FASE 4: Visualización de Lotes/Seriales**

**Acceso**: Portal del cliente → Menú **"Stock"** → Click en producto → Ver lotes

**Ruta**: `/account/lots` (HTTP)

**Funcionalidades**:

1. **Lista de Lotes/Seriales**:
   - Muestra todos los lotes/seriales de productos del `account.partner`
   - Columnas visibles:
     - Producto (con imagen)
     - Número de lote/serial
     - Estado del ciclo de vida
     - Ubicación
     - Cantidad disponible

2. **Filtros Rápidos**:
   - **All** - Todos los lotes
   - **Available** - Lotes disponibles
   - **Unavailable** - Lotes no disponibles

3. **Búsqueda Avanzada**:
   - Búsqueda por número de lote/serial
   - Búsqueda por referencia interna
   - Búsqueda por producto
   - Filtro por cantidad
   - Filtro por ubicación
   - Filtro por estado

4. **Exportación**:
   - Exportar lista a Excel
   - Incluye todas las columnas visibles
   - Respeta filtros y búsquedas aplicadas

5. **Detalles de Lote**:
   - Ver información completa del lote
   - Ver historial de movimientos
   - Ver ubicaciones actuales

---

## Funcionalidades del Portal

### 1. Importación de Productos

**Endpoint**: `/account/dashboard/import_products` (HTTP POST)

**Funcionalidad**:
- Importar múltiples productos desde archivo Excel
- Formato: Excel con columnas específicas
- Crea productos automáticamente con la información del archivo

**Formato del Archivo**:
- Columnas requeridas: Nombre, SKU, etc.
- Se valida el formato antes de importar
- Se muestran errores si hay problemas

### 2. Subida de Imágenes

**Endpoint**: `/account/stock/upload/image` (JSON)

**Funcionalidad**:
- Subir imagen para un producto
- Formato: Base64
- Se actualiza el campo `image_1920` del producto

**Parámetros**:
- `image_data` - Imagen en base64
- `record_id` - ID del producto

### 3. Búsqueda de Atributos

**Endpoint**: `/account/stock/get/attribute/values` (JSON)

**Funcionalidad**:
- Obtener valores disponibles para un atributo
- Se usa para completar selectores en el formulario

**Parámetros**:
- `attribute_id` - ID del atributo

---

## Gestión de Lotes/Seriales

### Visualización de Lotes

El módulo permite ver todos los lotes/seriales de productos del `account.partner` del usuario.

**Filtros Aplicados**:
- Solo productos del `account.partner` del usuario
- Solo productos almacenables (`is_storable = True`)
- Solo en ubicaciones internas

### Detalles de Lote

Al hacer click en un lote, se muestra:
- Información del producto
- Número de lote/serial
- Estado del ciclo de vida
- Ubicaciones actuales
- Cantidad disponible
- Historial de movimientos

---

## Casos Especiales

### 1. Productos con Atributos

**Situación**: Se crea un producto con múltiples atributos.

**Comportamiento**:
- Se crean todas las combinaciones posibles de variantes
- Cada variante tiene su propio SKU y código de barras (si se especifican)
- Todas las variantes comparten dimensiones y peso del template

**Solución**:
- Especificar atributos al crear el producto
- El sistema crea automáticamente todas las variantes
- Se pueden editar variantes individualmente después

### 2. Productos con Tracking Serial

**Situación**: Producto con `tracking = 'serial'`.

**Comportamiento**:
- Solo se puede editar la variante específica
- No se puede editar el template directamente
- Cada serial es una variante única

**Solución**:
- Editar cada variante individualmente
- El sistema preserva la relación con el template

### 3. Productos sin Tracking

**Situación**: Producto con `tracking = 'none'`.

**Comportamiento**:
- Se puede editar tanto el template como la variante
- Los cambios en el template se propagan a la variante
- Solo hay una variante por producto

**Solución**:
- Editar el template para cambiar información general
- Editar la variante para información específica

### 4. Importación Masiva

**Situación**: Se importan múltiples productos desde Excel.

**Comportamiento**:
- Se valida el formato del archivo
- Se crean productos uno por uno
- Se muestran errores si hay problemas
- Se reporta el número de productos creados

**Solución**:
- Verificar formato del archivo antes de importar
- Revisar errores reportados
- Corregir y reintentar si es necesario

### 5. Categoría de Repuestos

**Situación**: Productos en la categoría "Spare parts".

**Comportamiento**:
- Se muestran con badge azul "Spare Parts"
- Se filtran por separado en los filtros rápidos
- No aparecen en filtros generales de stock

**Solución**:
- Usar filtros específicos para repuestos
- Los repuestos se identifican automáticamente por categoría

---

## Resumen de Procesos que Pueden Fallar

### Tabla de Errores Comunes

| Fase | Proceso | Error Posible | Causa | Solución |
|------|---------|---------------|-------|----------|
| **FASE 2** | Crear producto | Sin nombre | No se especificó name | Especificar nombre del producto |
| **FASE 2** | Crear producto | SKU duplicado | SKU ya existe | Usar SKU único |
| **FASE 2** | Crear producto | Error al crear variantes | Fallo en creación | Verificar atributos y valores |
| **FASE 3** | Editar producto | Producto no encontrado | ID inválido o sin permisos | Verificar permisos y ID |
| **FASE 3** | Editar producto | Producto de otro cliente | account_partner_id diferente | Solo se pueden editar productos propios |
| **FASE 4** | Ver lotes | No aparecen lotes | Sin stock disponible | Verificar stock disponible |
| **General** | Importar productos | Formato inválido | Archivo Excel incorrecto | Verificar formato del archivo |
| **General** | Importar productos | Errores en líneas | Datos inválidos en archivo | Revisar errores reportados |

### Errores en la Creación de Productos

**Situación**: Errores al crear un producto desde el portal.

**Errores Posibles**:

1. **Sin nombre del producto**:
   - **Error**: Validación falla
   - **Causa**: No se especificó `name`
   - **Solución**: Especificar nombre del producto (obligatorio)

2. **SKU duplicado**:
   - **Error**: Validación falla
   - **Causa**: El SKU (`default_code`) ya existe
   - **Solución**: Usar un SKU único o dejar vacío

3. **Error al crear variantes**:
   - **Error**: Fallo en creación de variantes
   - **Causa**: Atributos o valores inválidos
   - **Solución**: 
     - Verificar que los atributos existen
     - Verificar que los valores son válidos
     - Reintentar la creación

### Errores en la Edición de Productos

**Situación**: Errores al editar un producto desde el portal.

**Errores Posibles**:

1. **Producto no encontrado**:
   - **Error**: Producto no existe o ID inválido
   - **Causa**: ID incorrecto o producto eliminado
   - **Solución**: Verificar que el producto existe

2. **Producto de otro cliente**:
   - **Error**: No se puede editar
   - **Causa**: El producto tiene `account_partner_id` diferente
   - **Solución**: Solo se pueden editar productos del `account.partner` del usuario

3. **Producto serial sin variante específica**:
   - **Error**: No se puede editar template
   - **Causa**: Producto con `tracking = 'serial'` requiere editar variante
   - **Solución**: Editar la variante específica, no el template

### Errores en la Importación de Productos

**Situación**: Errores al importar productos desde Excel.

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

3. **SKUs duplicados**:
   - **Error**: Múltiples líneas con mismo SKU
   - **Causa**: SKU duplicado en el archivo
   - **Solución**: Usar SKUs únicos o dejar vacíos

### Errores en la Visualización de Lotes

**Situación**: Errores al ver lotes/seriales.

**Errores Posibles**:

1. **No aparecen lotes**:
   - **Causa**: No hay stock disponible con lotes
   - **Solución**: Verificar que hay stock disponible con lotes

2. **Lotes de otro cliente**:
   - **Causa**: Lotes de productos de otro `account.partner`
   - **Solución**: Solo se muestran lotes de productos del `account.partner` del usuario

### Guía Rápida de Solución de Problemas

1. **No aparecen productos**: Verificar que los productos tienen `account_partner_id` correcto
2. **Error al crear producto**: Verificar que el nombre está especificado y el SKU es único
3. **Variantes no se crean**: Verificar que los atributos tienen valores seleccionados
4. **No aparecen lotes**: Verificar que hay stock disponible con lotes
5. **Imagen no se sube**: Verificar formato base64 y tamaño del archivo
6. **Error en importación**: Verificar formato del archivo y revisar errores reportados

---

## Resumen de Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. VER LISTA DE PRODUCTOS (Portal)                          │
│    - Ver productos del account.partner                     │
│    - Filtrar por stock, estado, categoría                  │
│    - Buscar por nombre, SKU, código de barras              │
│    - Exportar a Excel                                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. CREAR/EDITAR PRODUCTOS (Portal)                          │
│    - Crear nuevo producto                                  │
│    - Agregar atributos y variantes                         │
│    - Editar productos existentes                           │
│    - Subir imágenes                                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. VER LOTES/SERIALES (Portal)                              │
│    - Ver lotes de productos del account.partner            │
│    - Filtrar por producto, ubicación, estado                │
│    - Ver detalles de lotes                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Notas Importantes

### Diferencias con Backend

1. **Creación Simplificada**: Los productos se crean como `type = 'consu'` y `is_storable = True`
2. **Filtros Automáticos**: Solo se muestran productos del `account.partner` del usuario
3. **Atributos**: Se pueden agregar atributos al crear, generando variantes automáticamente
4. **Lotes**: Solo se pueden ver, no crear desde el portal

### Mejores Prácticas

1. **Usar SKU consistentes**: Mantener un formato consistente para SKUs
2. **Especificar códigos de barras**: Facilitar el escaneo y tracking
3. **Agregar imágenes**: Mejorar la identificación visual de productos
4. **Usar atributos correctamente**: Agrupar variantes relacionadas con atributos
5. **Exportar regularmente**: Mantener registros externos de productos

### Troubleshooting

1. **No aparecen productos**: Verificar que los productos tienen `account_partner_id` correcto
2. **Error al crear producto**: Verificar que el nombre está especificado
3. **Variantes no se crean**: Verificar que los atributos tienen valores seleccionados
4. **No aparecen lotes**: Verificar que hay stock disponible con lotes
5. **Imagen no se sube**: Verificar formato base64 y tamaño del archivo

---

## Referencias

- **Módulo**: `portal_stock`
- **Modelos principales**:
  - `product.template` - Plantilla de producto
  - `product.product` - Variante de producto
  - `product.attribute` - Atributos de producto
  - `product.attribute.value` - Valores de atributos
  - `stock.lot` - Lotes/Seriales
  - `stock.quant` - Cantidades de stock

---

**Última actualización**: 2025-01-XX
**Versión del módulo**: 18.0.1.0.0
