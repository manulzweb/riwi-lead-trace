import { authService } from "../services/auth.service";
import { ROUTES } from "./routes";
import { navBarComponent, setupNavBar } from "../components/navbar";
import { showToast } from "../components/alerts";

export function initRouter() {
    window.addEventListener("popstate", renderRoute);
    document.addEventListener("click", (event) => {
        const link = event.target.closest("a");
        if (!link) return;

        const href = link.getAttribute("href");
        if (!href || !href.startsWith("/")) return;

        event.preventDefault();
        window.history.pushState({}, "", href);
        renderRoute();
    });

    renderRoute();
}

export async function renderRoute() {
    const app = document.getElementById("root");
    let currentPath = window.location.pathname;

    // Guard: Redirigir la raíz (/) directamente a /login (el login redirigirá al dashboard si ya hay sesión)
    if (currentPath === "/") {
        window.history.replaceState({}, "", "/login");
        currentPath = "/login";
    }

    const route = ROUTES[currentPath] ?? ROUTES['/404'];

    let userSession = authService.getSession();
    
    const userRole = userSession?.roles || [];

    // 1. Redirigir al login si es una ruta privada y no está autenticado
    if (route.requireAuth && !userSession) {
        window.history.replaceState({}, "", "/login");
        return renderRoute();
    }

    // 2. Redirigir al dashboard si ya está autenticado e intenta ir a login/register o home (si configurado)
    if (route.redirectIfAuth && userSession) {
        window.history.replaceState({}, "", "/dashboard");
        return renderRoute();
    }

    // 3. Validar roles permitidos si la ruta está protegida por roles
    if (route.requireAuth && route.allowedRoles && !route.allowedRoles.some(role => userRole.includes(role))) {
        console.warn("Acceso denegado: Rol insuficiente.", { userRole, allowedRoles: route.allowedRoles });
        showToast("Acceso Denegado", "error", "No tienes permiso para acceder a esta página o tu sesión expiró.");
        
        if (currentPath !== "/dashboard") {
            window.history.replaceState({}, "", "/dashboard");
        } else {
            // Evitar loop infinito si ni siquiera tiene acceso al dashboard (ej. sesión corrupta o rol vacío)
            authService.clearSession();
            window.history.replaceState({}, "", "/login");
        }
        return renderRoute();
    }

    // 4. Actualizar el título de la página si está definido en las properties de la ruta
    if (route.title) {
        document.title = route.title;
    }

    // 5. Renderizado de la vista y componentes
    app.innerHTML = `
        <div id="content">
            ${await route.renderView()}
        </div>
    `;

    // 6. Ejecución de configuraciones iniciales
    setupNavBar();
    if (route.initSetup) {
        route.initSetup();
    }
}