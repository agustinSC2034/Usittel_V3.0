# 🔒 Sistema de Seguridad - Herramientas Usittel

## Descripción
Este sistema protege los datos sensibles de las cajas NAPs mediante autenticación básica y múltiples capas de seguridad.

## 🚀 Cómo usar

### 1. Acceso inicial
- Navegar a: `http://localhost:8000/herramientas/login.html`
- O simplemente: `http://localhost:8000/herramientas/` (redirige automáticamente)

### 2. Credenciales disponibles
```
Usuario: admin
Contraseña: usittel2025#
```

### 3. Funcionalidades
- ✅ Acceso protegido a `tools.html`
- ✅ Protección de archivos de datos (`nap_data.json`, `nap_data.js`, `cajas_naps.csv`)
- ✅ Bloqueo de acceso directo a archivos sensibles
- ✅ Sesión persistente durante la navegación
- ✅ Botón de cerrar sesión visible

## 🛡️ Capas de Seguridad

### 1. Autenticación Frontend
- Verificación de credenciales en JavaScript
- Sesión almacenada en `sessionStorage`
- Redirección automática si no está autenticado

### 2. Protección de Archivos
- `.htaccess` bloquea acceso directo a archivos sensibles
- Solo permite acceso a archivos HTML, CSS, JS e imágenes
- Bloquea archivos CSV, JSON, Excel y Python

### 3. Headers de Seguridad
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

## ⚠️ Limitaciones de Seguridad

### ⚠️ IMPORTANTE: Este es un sistema básico
- Las credenciales están en el código JavaScript (visibles en el navegador)
- **NO es seguro para producción** con datos altamente sensibles
- Para mayor seguridad, implementar autenticación en el servidor

### 🔧 Para producción recomendamos:
1. **Autenticación en servidor** (PHP, Node.js, Python)
2. **Base de datos de usuarios** con contraseñas hasheadas
3. **HTTPS obligatorio**
4. **Rate limiting** para prevenir ataques de fuerza bruta
5. **Logs de acceso** para auditoría

## 📁 Estructura de Archivos

```
herramientas/
├── login.html          # Página de autenticación
├── auth.js             # Sistema de autenticación
├── tools.html          # Herramienta principal (protegida)
├── .htaccess           # Reglas de seguridad del servidor
├── nap_data.json       # Datos de NAPs (protegido)
├── nap_data.js         # Datos de NAPs JS (protegido)
├── cajas_naps.csv      # Datos originales (protegido)
└── README_SEGURIDAD.md # Este archivo
```

## 🔄 Actualización de Credenciales

Para cambiar las credenciales, editar `login.html` en la sección:

```javascript
const VALID_CREDENTIALS = {
    'admin': 'usittel2025#'
};
```

## 🚨 En caso de compromiso

1. **Cambiar inmediatamente** todas las contraseñas
2. **Revisar logs** del servidor web
3. **Considerar migrar** a sistema de autenticación en servidor
4. **Auditar accesos** a los datos de NAPs

## 📞 Contacto
Para problemas de seguridad, contactar al administrador del sistema. 