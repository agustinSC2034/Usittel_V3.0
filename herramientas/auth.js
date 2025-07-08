// Sistema de autenticación para herramientas Usittel (JavaScript puro)
class UsittelAuth {
    constructor() {
        this.checkAuth();
    }

    // Verificar si el usuario está autenticado
    checkAuth() {
        const isAuthenticated = sessionStorage.getItem('usittel_authenticated');
        const currentUser = sessionStorage.getItem('usittel_user');
        
        if (isAuthenticated !== 'true' || !currentUser) {
            // No está autenticado, redirigir al login
            this.redirectToLogin();
            return false;
        }
        
        return true;
    }

    // Redirigir al login
    redirectToLogin() {
        // Solo redirigir si no estamos ya en login.html
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }

    // Cerrar sesión
    logout() {
        sessionStorage.removeItem('usittel_authenticated');
        sessionStorage.removeItem('usittel_user');
        this.redirectToLogin();
    }

    // Obtener usuario actual
    getCurrentUser() {
        return sessionStorage.getItem('usittel_user');
    }

    // Verificar si es admin
    isAdmin() {
        return this.getCurrentUser() === 'admin';
    }

    // Mostrar información del usuario
    showUserInfo() {
        const user = this.getCurrentUser();
        if (user) {
            const userInfo = document.createElement('div');
            userInfo.className = 'fixed top-4 right-4 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-lg z-50';
            userInfo.innerHTML = `
                <div class="flex items-center space-x-2">
                    <span class="text-sm text-gray-600">Usuario:</span>
                    <span class="text-sm font-medium text-blue-600">${user}</span>
                    <button onclick="auth.logout()" class="text-xs text-red-600 hover:text-red-800 ml-2">
                        Cerrar sesión
                    </button>
                </div>
            `;
            document.body.appendChild(userInfo);
        }
    }

    // Verificar autenticación en tiempo real
    verifyAuth() {
        if (!this.checkAuth()) {
            return false;
        }
        return true;
    }
}

// Inicializar autenticación
const auth = new UsittelAuth();

// Proteger contra acceso directo a archivos sensibles
if (window.location.pathname.includes('nap_data.json') || 
    window.location.pathname.includes('nap_data.js') ||
    window.location.pathname.includes('cajas_naps.csv')) {
    auth.redirectToLogin();
}

// Verificar autenticación cada 30 segundos
setInterval(() => {
    auth.verifyAuth();
}, 30000); 