# 📱 Stockly - Manual de Usuario v1.3.0 ACTUALIZADO

**Última Actualización:** 23 de Octubre, 2025  
**Versión:** 1.3.0 - Completamente Actualizado  
**Estado:** ✅ Listo para Usar

---

## 📑 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Primeros Pasos](#primeros-pasos)
3. [Dashboard](#dashboard)
4. [Gestión de Inventario](#gestión-de-inventario)
5. [Compras](#compras)
6. [Ventas](#ventas)
7. [Invoices/Recibos](#invoicesrecibos---profesionales)
8. [Reportes](#reportes)
9. [Garantías y Servicio Técnico](#garantías-y-servicio-técnico)
10. [Configuración](#configuración)
11. [FAQ](#preguntas-frecuentes)

---

## 🎯 Introducción

**Stockly v1.3.0** es un sistema profesional y completo para:

✅ **Gestión de Inventario** - Categorías jerárquicas, atributos dinámicos, stock por estado  
✅ **Compras Inteligentes** - Profit tracking automático, análisis de rentabilidad  
✅ **Ventas Rápidas** - OCR integrado para seriales, garantías automáticas  
✅ **Invoices Profesionales** - PDFs con logo, numeración secuencial, almacenamiento  
✅ **Análisis de Ganancias** - Reportes en tiempo real, gráficos  
✅ **Garantías Completas** - Servicio técnico integrado  
✅ **Multi-empresa** - Un usuario en múltiples empresas  

---

## 🚀 Primeros Pasos

### Paso 1: Crear Cuenta

1. Accede a **https://stockly.app**
2. Haz clic en **"Registrarse"**
3. Completa formulario:
   - **Email:** Correo empresarial único
   - **Contraseña:** 8+ caracteres (mayúscula, número, símbolo)
   - **Nombre:** Tu nombre completo
   - **Empresa:** Nombre del negocio
   - **Email Empresa:** Email contacto

4. Clic en **"Crear Empresa y Cuenta"**
5. ¡Listo! Accederás al Dashboard

### Paso 2: Configuración Inicial (Importante)

1. Ve a **⚙️ Configuración**
2. En **"Datos de Empresa"** completa:
   - **Logo:** Se usa en invoices (JPG/PNG)
   - **Teléfono:** Tu contacto
   - **Dirección:** Ubicación física
   - **Datos Fiscales:** RUT/NIT/RFC (si aplica)

3. En **"Perfil"** actualiza:
   - Nombre y teléfono personal
   - Foto (opcional)

4. **Guardar todos los cambios**

### Paso 3: Invitar al Equipo

1. Ve a **⚙️ Configuración → Miembros**
2. Clic en **"+ Invitar Usuario"**
3. **Copiar código** que genera
4. **Compartir código** con empleados
5. Ellos se registran con ese código

**Roles:**
- 👑 **Owner:** Todo + invitar usuarios
- 🔑 **Admin:** Acceso completo
- 💰 **Seller:** Solo ventas e invoices
- 📦 **Inventory:** Solo productos

---

## 📊 Dashboard

Tu panel de control con:

| Sección | Qué Ves |
|---------|---------|
| **KPIs** | Ventas totales, ingresos, invoices, compras |
| **Gráfico Ventas** | Tendencia últimos 30 días |
| **Gráfico Compras** | Tendencia últimos 30 días |
| **Invoices Mes** | Total generadas este mes |
| **Acciones Rápidas** | Botones para crear venta, factura, etc |

**Navegación Principal:**
- 🏠 **Dashboard** - Panel principal
- 📦 **Inventario** - Productos y categorías
- 🛒 **Compras** - Registro de compras
- 💰 **Ventas** - Registro de ventas
- 📄 **Invoices** - Invoices/Recibos
- 📊 **Reportes** - Análisis y gráficos
- 🛡️ **Garantías** - Seguimiento garantías
- ⚙️ **Configuración** - Ajustes y usuarios

---

## 📦 Gestión de Inventario

### Crear Categoría

1. **Inventario → Productos**
2. Busca **"Categorías"** (panel izquierdo)
3. Clic **"+ Nueva Categoría"**
4. Completa:
   - **Nombre:** Ej: "Electrónica", "Ropa"
   - **Descripción:** Opcional
   - **Categoría Padre:** Para subcategorías (dejar vacío si es raíz)

5. Clic **"Crear"**

**Ejemplo estructura jerárquica:**
```
Electrónica
├── Computadoras
│   ├── Laptops
│   └── Desktops
└── Celulares

Ropa
├── Hombres
└── Mujeres
```

### Crear Producto

1. **Inventario → Productos**
2. Clic **"+ Nuevo Producto"**
3. **Información Básica:**
   - Nombre: "Laptop Dell XPS 13"
   - SKU: "DELL-XPS-001" (único)
   - Categoría: Selecciona
   - Descripción: Detalles
   - Precio Compra: Lo que pagas
   - Precio Venta: Lo que vendes

4. **Atributos** (opcional):
   - Clic **"+ Atributo"**
   - Ej: Color, Tamaño, RAM, Almacenamiento
   - Especifica valores posibles

5. **Stock Inicial:**
   - Cantidad
   - Estado: New, Used, Open Box

6. Clic **"Guardar"**

### Ver Stock Completo

1. **Inventario → Productos**
2. Busca producto
3. Clic en el producto
4. Verás desglose por estado:
   - **New:** Nuevos sin usar
   - **Used:** Usados
   - **Open Box:** En caja abierta
   - **Total Consolidado:** Sum todos

### Buscar Productos

1. **Inventario → Productos**
2. Usa barra búsqueda superior
3. Busca por:
   - Nombre: "laptop"
   - SKU: "DELL-XPS"
   - Categoría: "Electrónica"

4. Resultados instantáneos

---

## 🛒 Compras

### Crear Compra

1. **Compras → Nueva Compra**
2. **Proveedor:**
   - Nombre
   - Email (opcional)
   - Teléfono (opcional)

3. **Información Compra:**
   - Fecha de compra (hoy por defecto)
   - Número factura proveedor (opcional)

4. **Agregar Productos:**
   - Clic **"+ Agregar Producto"**
   - Selecciona producto
   - Cantidad
   - Precio unitario (puede diferir del registrado)
   - Estado: New, Used, Open Box

5. **Costos Adicionales:**
   - Costo envío (si aplica)
   - Descuento (%)
   - Impuestos (%)

6. **Automático:**
   - ✅ Total se calcula
   - ✅ Profit potencial por item
   - ✅ Margen de ganancia (%)

7. Clic **"Guardar Compra"**

### Ver Profit por Compra

1. **Compras**
2. Busca compra
3. Clic **"Detalles"**
4. Verás:
   - Total invertido
   - Profit potencial
   - Margen (%)
   - Profit real (si se vendió)

### Estadísticas Compras

En la página principal de **Compras** ves:
- Total compras este mes
- Monto total invertido
- Cantidad de proveedores
- Gráfico tendencia

---

## 💰 Ventas

### Crear Venta

1. **Ventas → Nueva Venta**
2. **Cliente:**
   - Nombre (requerido)
   - Email (opcional)
   - Teléfono (opcional)

3. **Productos:**
   - Clic **"+ Agregar Producto"**
   - Selecciona producto
   - Cantidad
   - Estado vendido: New, Used, Open Box
   - Precio se autocompleta

4. **Automático:**
   - ✅ Garantía se crea automáticamente
   - ✅ Stock disminuye
   - ✅ Datos cliente guardados

5. Clic **"Guardar Venta"**

### OCR - Escanear Serial (Opcional)

Para productos con número de serie:

1. En **"Agregar Producto"**
2. Clic **"Escanear Serial"** (cámara 📷)
3. Toma foto del serial o número
4. Sistema extrae automáticamente
5. Se guarda en la venta

### Descargar Comprobante

1. **Ventas**
2. Busca venta
3. Clic **"Descargar Comprobante"**
4. Se descarga PDF automáticamente

---

## 📄 Invoices/Recibos - Profesionales

### ¿Qué es un Invoice?

Documento formal con:
- ✅ Logo tu empresa
- ✅ Número secuencial automático (INV-YYYY-00001)
- ✅ Datos cliente
- ✅ Items con precios
- ✅ IVA calculado automático
- ✅ Total con descuentos

**Estados:**
- 📝 **Draft** - Borrador, editable
- ⏳ **Pending** - Listo, esperando pago
- ✅ **Paid** - Pagado
- ❌ **Cancelled** - Cancelado

### Crear Invoice desde Venta

**Recomendado:**

1. **Invoices → Crear Invoice**
2. Selecciona **"Desde venta"**
3. Busca venta
4. Items se cargan
5. Continúa paso 6

**Manual:**

1. **Invoices → Crear Invoice**
2. Selecciona **"Manual"**
3. Ingresa cliente
4. Continúa paso 6

### Paso 6: Completar Invoice

1. **Cliente:**
   - Nombre
   - Email
   - Teléfono
   - Dirección

2. **Items:**
   - Productos (de venta o manual)
   - Items adicionales:
     - 🚚 Envío
     - 💼 Comisión
     - 💰 Descuento
     - ➕ Otros

3. **Impuestos:**
   - IVA automático (12%)
   - O personalizado

4. Clic **"Generar Invoice"**

**Sistema:**
- ✅ Número secuencial único
- ✅ PDF profesional con logo
- ✅ Calcula totales
- ✅ Guarda en Cloudinary
- ✅ Listo para descargar

### Cambiar Estado

1. **Invoices**
2. Busca invoice
3. Clic **"Estado"**
4. Opciones:
   - Draft → Pending
   - Pending → Paid
   - Pending → Cancelled

### Descargar PDF

1. **Invoices**
2. Busca invoice
3. Clic **"Descargar PDF"**
4. Se descarga automáticamente

### Compartir Invoice

1. **Invoices**
2. Clic **"Compartir"**
3. Se genera link público
4. Comparte por:
   - Email
   - WhatsApp
   - SMS

---

## 📊 Reportes

### Costo vs Ingresos

1. **Reportes → Costo vs Ingresos**
2. Elige período:
   - Últimos 7 días
   - Últimos 30 días
   - Últimos 90 días
   - Rango personalizado

3. Ves:
   - 📈 Gráfico de línea
   - 📋 Tabla detallada (día a día)
   - 💰 Resumen totales:
     - Total costo
     - Total ingresos
     - **Ganancia neta**

### Análisis de Profit

1. **Reportes → Profit**
2. Por cada compra ves:
   - Costo total
   - Profit potencial
   - Margen (%)
   - % vendido

### Ventas por Período

1. **Reportes → Ventas**
2. Elige período
3. Ves:
   - Cantidad de ventas
   - Monto total
   - Ticket promedio
   - Gráfico tendencia

### Descargar Reporte

De cualquier reporte:
1. Clic **"Descargar"**
2. Elige formato:
   - CSV (para Excel)
   - PDF (para imprimir)

---

## 🛡️ Garantías y Servicio Técnico

### Ver Garantías Activas

1. **Garantías**
2. Ves lista de todas
3. Por cada garantía:
   - Cliente
   - Producto
   - Inicio y fin
   - **Días restantes**
   - Estado

### Registrar Servicio Técnico

1. **Garantías**
2. Busca garantía
3. Clic **"+ Servicio"**
4. Completa:
   - Fecha de servicio
   - Descripción del problema: "Pantalla rota"
   - Solución aplicada: "Se cambió pantalla"
   - Técnico: Tu nombre
   - Horas dedicadas

5. Clic **"Guardar"**

### Historial de Servicios

1. **Garantías**
2. Abre garantía
3. En **"Historial"** ves todos:
   - Fecha servicio
   - Problema / Solución
   - Técnico
   - Duración

---

## ⚙️ Configuración

### Perfil de Usuario

1. **⚙️ Configuración → Perfil**
2. Actualiza:
   - Nombre completo
   - Teléfono
   - Foto (opcional)

3. **Guardar**

### Cambiar Contraseña

1. **⚙️ Configuración → Seguridad**
2. Clic **"Cambiar Contraseña"**
3. Ingresa:
   - Contraseña actual
   - Nueva contraseña (8+ caracteres)
   - Confirma

4. Clic **"Cambiar"**

### Datos de Empresa

1. **⚙️ Configuración → Datos**
2. Actualiza:
   - Nombre oficial
   - Email contacto
   - Teléfono
   - Dirección completa
   - Logo (JPG/PNG)
   - Datos fiscales (RUT/NIT/RFC)

3. **Guardar**

### Gestionar Usuarios

1. **⚙️ Configuración → Miembros**
2. Ves lista de usuarios

**Agregar:**
- Clic **"+ Invitar"**
- Copia código
- Comparte

**Cambiar Rol:**
- Clic en usuario
- Selecciona nuevo rol

**Eliminar:**
- Clic en usuario
- Clic **"Eliminar"**

### Cambiar de Empresa

1. Barra superior (logo empresa)
2. Clic dropdown
3. Selecciona otra empresa
4. La interfaz cambia

---

## ❓ Preguntas Frecuentes

**P: ¿Qué pasa si no tengo categorías?**
R: Puedes crear productos sin categoría, pero se recomienda organizarlos.

**P: ¿Cuándo vence una garantía?**
R: En **Garantías** ves "Días restantes". Notificación 7 días antes.

**P: ¿Se disminuye stock automáticamente?**
R: Sí. Al crear venta, stock baja. Al crear compra, stock sube.

**P: ¿Puedo descargar invoice en otro formato?**
R: Solo PDF ahora. Exporta datos desde Reportes en CSV.

**P: ¿Cómo cambio logo del invoice?**
R: **⚙️ Configuración → Datos Empresa → Logo** y sube nuevo.

**P: ¿Qué es OCR?**
R: Lee números de serie de fotos automáticamente.

**P: Perdí acceso a empresa**
R: Contacta al Owner para que te reinvite.

**P: ¿Dónde veo ganancias totales?**
R: **Reportes → Costo vs Ingresos** muestra ganancia neta.

**P: ¿Tengo múltiples empresas?**
R: Sí. Switch en dropdown superior.

**P: ¿Cómo exporto datos?**
R: **Reportes → Descargar** en CSV o PDF.

**P: ¿Puedo editar invoice después de generarlo?**
R: Solo si está en **Draft**. En Pending ya no.

**P: ¿Hay límite de usuarios?**
R: No. Invita cuantos quieras.

---

## 📞 Soporte

Si tienes problemas:

1. **Verifica:**
   - Conexión a internet
   - Actualiza página (F5)
   - Limpia caché (Ctrl+Shift+Delete)

2. **Contacto:**
   - Email: support@stockly.app
   - WhatsApp: +51 999 888 777

3. **Videos:**
   - https://stockly.app/tutoriales

---

**¡Gracias por usar Stockly! 🙌**

Versión: 1.3.0 | Estado: ✅ Producción | Actualización: 23 Octubre 2025
