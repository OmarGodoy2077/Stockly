# 🚀 Guía Rápida de Ejecución - Stockly v1.3.0

**¡Comienza aquí si recién instalaste el proyecto!**

---

## 📚 Documentación Disponible

Antes de ejecutar, elige según tu rol:

| Rol | Documento | Contenido |
|-----|-----------|----------|
| 👤 Usuario Final | `MANUAL_DE_USUARIO_v1.3.0.md` | Cómo usar la app |
| 👨‍💻 Developer | `MANUAL_TECNICO_v1.3.0.md` | Setup + Desarrollo |
| 🔧 DevOps | `Backend/docs/DEPLOYMENT_GUIDE.md` | Despliegue |
| 📌 Índice General | `DOCUMENTACION.md` | Todas las guías |

---

## 🚀 Ejecución Rápida (2 minutos)

### Opción 1: Dos Terminales Separadas ⭐ RECOMENDADO

**Terminal 1 - Backend:**
```powershell
cd "w:\Proyectos FullStack\Stockly\Backend"
npm run dev
```
✅ Servidor: `http://localhost:3001`

**Terminal 2 - Frontend:**
```powershell
cd "w:\Proyectos FullStack\Stockly\Frontend"
npm run dev
```
✅ App: `http://localhost:5173`

---

## Comando Correcto del Backend

```powershell
npm run dev
```

**NO uses:**
```powershell
node run dev  # ❌ INCORRECTO - Produce error
```

---

## Ejecución Completa del Proyecto

### Opción 1: Dos Terminales Separadas

**Terminal 1 - Backend:**
```powershell
cd "w:\Proyectos FullStack\Stockly\Backend"
npm run dev
```
Puerto: `3001`

**Terminal 2 - Frontend:**
```powershell
cd "w:\Proyectos FullStack\Stockly\Frontend"
npm run dev
```
Puerto: `5173` (típicamente)

---

### Opción 2: Desde la Raíz del Proyecto

```powershell
# Ejecutar ambos simultáneamente (desde el directorio raíz del proyecto)
cd "w:\Proyectos FullStack\Stockly"

# En PowerShell puedes usar:
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd Backend; npm run dev"
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd Frontend; npm run dev"
```

---

## Verificación de Errores

Todos los errores han sido corregidos:

✅ **Backend:**
- Comando corregido a `npm run dev`
- Servidor ejecutándose en puerto 3001

✅ **Frontend:**
- Página de Compras: Muestra datos de la API
- Página de Ventas: Muestra datos de la API
- Error de `runtime.lastError`: Causado por extensiones del navegador (ignorable)

---

## URLs de Acceso

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| Compras | http://localhost:5173/purchases |
| Ventas | http://localhost:5173/sales |

---

## Troubleshooting

### Error: "Cannot find module 'run'"
```
Solución: Usa npm run dev (no node run dev)
```

### Error: "EADDRINUSE :::3001"
```
Solución: El puerto 3001 está en uso. Mata el proceso:
  Get-Process node | Stop-Process
```

### Frontend muestra página en blanco
```
Solución: 
  1. Verifica que el backend esté corriendo
  2. Abre la consola del navegador (F12)
  3. Revisa los errores en Network/Console
```

### Error de autenticación
```
Solución:
  1. Limpia las cookies del navegador
  2. Limpia localStorage: localStorage.clear()
  3. Intenta login de nuevo
```

---

**Última actualización:** 21/10/2025
