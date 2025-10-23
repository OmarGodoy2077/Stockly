# 📑 Referencia Rápida Frontend - Stockly v1.3.0

**Última Actualización:** 22 de Octubre, 2025

---

## 🎯 ¿Qué hay en este Frontend?

### Autenticación & Usuarios
- Login, Registro, Cambio de contraseña
- Gestión de múltiples empresas
- Switch entre empresas
- Roles: owner, admin, seller, inventory

### Inventario
- Listar/Crear/Editar productos
- Categorías jerárquicas
- Atributos dinámicos
- Stock consolidado
- Búsqueda y filtros

### Ventas
- Crear venta con OCR (serial automático)
- Listar ventas
- Garantía automática
- Estadísticas de ventas

### Compras
- Crear compra
- **Profit automático** (margen, ganancia)
- Análisis de rentabilidad
- Estadísticas

### Invoices ⭐ NUEVO
- Crear invoice desde venta
- Agregar items (envío, descuentos, etc)
- **Generar PDF profesional**
- Descargar PDF
- Estados: Draft → Pending → Paid
- Estadísticas de invoices

### Reportes
- Costo vs Ingresos
- Gráficos y análisis
- Por período (mes, año)

### Dashboard
- KPIs principales
- Resumen ejecutivo
- Acciones rápidas

---

## 📂 Estructura Carpetas Clave

```
src/
├── pages/           ← Páginas principales
├── components/      ← Componentes reutilizables
├── services/        ← Llamadas API
├── context/         ← Estado global
├── types/           ← Tipos TypeScript
├── utils/           ← Funciones auxiliares
└── hooks/           ← Custom hooks
```

---

## 🚀 Comandos

```bash
npm install      # Instalar dependencias
npm run dev      # Servidor desarrollo (http://localhost:5173)
npm run build    # Compilar para producción
npm run preview  # Ver build localmente
npm run lint     # Verificar errores
```

---

## ⚙️ Configuración

**Archivo:** `Frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_DEBUG=false
```

---

## 🔗 API Backend

**Documentación:** [API_REFERENCE.md](../Backend/docs/API_REFERENCE.md)

Todos los endpoints están documentados:
- Autenticación
- Usuarios, Empresas
- Productos, Categorías, Atributos
- Ventas, Compras
- **Invoices** (nuevo)
- Reportes

---

## 📱 Tecnologías

- React 18 + TypeScript
- Vite (fast build)
- TailwindCSS (styling)
- Axios (HTTP)
- React Router (navegación)

---

## 🎨 Páginas Principales

| Página | Ruta | Función |
|--------|------|---------|
| Dashboard | `/` | KPIs y resumen |
| Login | `/login` | Autenticación |
| Productos | `/products` | Inventario |
| Ventas | `/sales` | Registrar venta |
| Compras | `/purchases` | Registrar compra |
| Invoices | `/invoices` | Recibos/facturas |
| Reportes | `/reports` | Análisis |
| Configuración | `/settings` | Usuarios, roles |

---

## 🐛 Troubleshooting

| Error | Solución |
|-------|----------|
| Cannot find module | `npm install` |
| Port in use | `npm run dev -- --port 5174` |
| CORS error | Revisar VITE_API_BASE_URL |
| Login falla | Backend corriendo? Variables correctas? |
| Token no funciona | Limpiar localStorage, login de nuevo |

---

## 📚 Más Info

- **Setup completo:** [SETUP.md](./SETUP.md)
- **Backend README:** [Backend/README.md](../Backend/README.md)
- **API completa:** [Backend/docs/API_REFERENCE.md](../Backend/docs/API_REFERENCE.md)
- **Arquitectura:** [Backend/docs/ARCHITECTURE.md](../Backend/docs/ARCHITECTURE.md)

---

**Frontend v1.3.0 | Estado: ✅ Producción**

