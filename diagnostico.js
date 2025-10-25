#!/usr/bin/env node

/**
 * Script de Diagnóstico Automático - Sistema de Garantías
 * Uso: node diagnostico.js
 * 
 * Este script verifica automáticamente el estado del sistema de garantías
 * y proporciona un reporte detallado.
 */

const http = require('http');

// Configuración
const API_BASE = 'http://localhost:3000';
const API_KEY = process.env.API_TOKEN || 'Bearer YOUR_TOKEN_HERE';

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
    console.log('\n' + '='.repeat(70));
    log('cyan', `  ${title}`);
    console.log('='.repeat(70) + '\n');
}

async function makeRequest(method, path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Authorization': API_KEY,
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(data)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: data
                    });
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function runDiagnostics() {
    log('blue', '\n📊 INICIANDO DIAGNÓSTICO DEL SISTEMA DE GARANTÍAS\n');

    const results = {
        backend: false,
        warranties: false,
        products: false,
        status: []
    };

    // 1. Verificar Backend
    section('1. VERIFICAR CONECTIVIDAD DEL BACKEND');
    try {
        const health = await makeRequest('GET', '/api/v1/health');
        if (health.status === 200) {
            log('green', '✅ Backend está corriendo');
            results.backend = true;
            results.status.push('✅ Backend operativo');
        } else {
            log('red', '❌ Backend responde con error: ' + health.status);
            results.status.push('❌ Backend con error: ' + health.status);
        }
    } catch (error) {
        log('red', '❌ No se puede conectar al backend en ' + API_BASE);
        log('red', '   Error: ' + error.message);
        log('yellow', '   Asegúrate de ejecutar: npm run dev');
        results.status.push('❌ Backend no disponible');
        return results;
    }

    // 2. Verificar Garantías
    section('2. VERIFICAR GARANTÍAS EN EL SISTEMA');
    try {
        if (API_KEY === 'Bearer YOUR_TOKEN_HERE') {
            log('yellow', '⚠️  No hay token configurado');
            log('yellow', '   Establece: export API_TOKEN="Bearer TOKEN_AQUI"');
            log('yellow', '   O edita API_KEY en este script');
        } else {
            const response = await makeRequest('GET', '/api/v1/warranties?status=all&limit=1000');
            
            if (response.status === 200 && response.data.success) {
                const warranties = response.data.data.warranties || [];
                const total = response.data.data.pagination?.total || 0;
                
                log('green', `✅ Sistema de garantías accesible`);
                log('green', `   Total de garantías: ${total}`);
                
                if (total > 0) {
                    log('green', `   ✅ Hay ${total} garantía(s) en el sistema`);
                    results.warranties = true;
                    results.status.push(`✅ ${total} garantía(s) encontrada(s)`);
                    
                    // Verificar estructura de garantía
                    const firstWarranty = warranties[0];
                    log('blue', '\n   Estructura de primera garantía:');
                    log('blue', `   - ID: ${firstWarranty.id?.substring(0, 8)}...`);
                    log('blue', `   - Producto: ${firstWarranty.product_name}`);
                    log('blue', `   - Cliente: ${firstWarranty.customer_name}`);
                    log('blue', `   - Estado: ${firstWarranty.warranty_status}`);
                    log('blue', `   - Días restantes: ${firstWarranty.days_remaining}`);
                    
                    // Verificar sale_products
                    if (firstWarranty.sale_products && firstWarranty.sale_products.length > 0) {
                        log('green', `   ✅ sale_products está incluido (${firstWarranty.sale_products.length} producto(s))`);
                        results.products = true;
                        results.status.push('✅ Deserialización de sale_products funciona');
                    } else {
                        log('red', '   ❌ sale_products vacío o no incluido');
                        results.status.push('❌ Problema con deserialización de sale_products');
                    }
                } else {
                    log('yellow', '⚠️  No hay garantías en el sistema');
                    log('yellow', '   Solución: Crear una venta desde el frontend con warranty_months > 0');
                    results.status.push('⚠️  Sin garantías de prueba');
                }
            } else {
                log('red', '❌ Error accediendo a garantías: ' + response.status);
                if (response.data.message) {
                    log('red', '   ' + response.data.message);
                }
                results.status.push('❌ Error al obtener garantías');
            }
        }
    } catch (error) {
        log('red', '❌ Error en consulta de garantías: ' + error.message);
        results.status.push('❌ Error en consulta de garantías');
    }

    // 3. Verificar Endpoint de Diagnóstico
    section('3. VERIFICAR ENDPOINT DE DIAGNÓSTICO');
    try {
        if (API_KEY !== 'Bearer YOUR_TOKEN_HERE') {
            const response = await makeRequest('GET', '/api/v1/warranties/diagnostic');
            
            if (response.status === 200 && response.data.success) {
                const diagnostic = response.data.data;
                log('green', '✅ Endpoint de diagnóstico operativo');
                log('blue', `   Garantías reportadas: ${diagnostic.warranty_system.total_warranties}`);
                results.status.push('✅ Endpoint de diagnóstico funciona');
            } else {
                log('yellow', '⚠️  Endpoint de diagnóstico no disponible');
                log('yellow', '   (Esto es opcional, no bloquea el sistema)');
            }
        }
    } catch (error) {
        log('yellow', '⚠️  No se pudo acceder a endpoint de diagnóstico');
        log('yellow', '   (Esto es opcional)');
    }

    // 4. Estadísticas
    section('4. ESTADÍSTICAS');
    try {
        if (API_KEY !== 'Bearer YOUR_TOKEN_HERE') {
            const response = await makeRequest('GET', '/api/v1/warranties/statistics');
            
            if (response.status === 200 && response.data.success) {
                const stats = response.data.data;
                log('blue', `Total:           ${stats.total}`);
                log('green', `Activas:         ${stats.active}`);
                log('yellow', `Por vencer:      ${stats.expiring_soon}`);
                log('red', `Expiradas:       ${stats.expired}`);
            }
        }
    } catch (error) {
        // Ignorar errores aquí
    }

    // 5. Resumen
    section('5. RESUMEN DE DIAGNÓSTICO');
    
    results.status.forEach(status => {
        const icon = status.startsWith('✅') ? 'green' : status.startsWith('❌') ? 'red' : 'yellow';
        log(icon, '   ' + status);
    });

    // 6. Recomendaciones
    section('6. RECOMENDACIONES');

    if (!results.backend) {
        log('red', '🔴 CRÍTICO: Backend no está corriendo');
        log('yellow', '   Solución: npm run dev');
    } else if (!results.warranties) {
        log('yellow', '🟡 ADVERTENCIA: No hay garantías en el sistema');
        log('yellow', '   Solución: Crea una venta desde el frontend con warranty_months > 0');
    } else if (!results.products) {
        log('red', '🔴 CRÍTICO: sale_products no se está deserializando');
        log('yellow', '   Solución: Revisa warranty.model.js - método getByCompany()');
    } else {
        log('green', '🟢 TODO PARECE ESTAR FUNCIONANDO');
        log('green', '   Sistema de garantías operativo');
    }

    section('PRÓXIMOS PASOS');
    
    if (results.backend && results.warranties && results.products) {
        log('green', '1. ✅ Backend corriendo correctamente');
        log('green', '2. ✅ Garantías cargadas correctamente');
        log('green', '3. ✅ Productos en garantía deserializados');
        log('green', '\n📱 Abre http://localhost:5173/garantias en el navegador');
        log('green', '   Deberías ver la tabla de garantías con productos');
    } else {
        log('yellow', '1. Ejecuta: npm run dev (si no está corriendo)');
        log('yellow', '2. Crea una venta con warranty_months > 0');
        log('yellow', '3. Vuelve a ejecutar este diagnóstico');
    }

    console.log('\n' + '='.repeat(70) + '\n');

    return results;
}

// Ejecutar diagnósticos
runDiagnostics().catch(error => {
    log('red', '❌ Error en el diagnóstico: ' + error.message);
    process.exit(1);
});

