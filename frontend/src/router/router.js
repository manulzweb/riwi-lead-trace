import { authService } from "../services/auth.service";
import { ROUTES } from "./routes";
import { setupNavBar } from "../components/navbar";
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

    // Guard: send the root (/) to /login; login redirects on if a session exists.
    if (currentPath === "/") {
        window.history.replaceState({}, "", "/login");
        currentPath = "/login";
    }

    const route = ROUTES[currentPath] ?? ROUTES['/404'];

    let userSession = authService.getSession();
    
    const userRole = userSession?.roles || [];

    // 1. Private route without session -> login.
    if (route.requireAuth && !userSession) {
        window.history.replaceState({}, "", "/login");
        return renderRoute();
    }

    // 2. Already authenticated on login/register -> dashboard.
    if (route.redirectIfAuth && userSession) {
        window.history.replaceState({}, "", "/dashboard");
        return renderRoute();
    }

    // 3. Check the allowed roles if the route is role-protected.
    if (route.requireAuth && route.allowedRoles && !route.allowedRoles.some(role => userRole.includes(role))) {
        console.warn("Acceso denegado: Rol insuficiente.", { userRole, allowedRoles: route.allowedRoles });
        showToast("Acceso Denegado", "error", "No tienes permiso para acceder a esta página o tu sesión expiró.");
        
        if (currentPath !== "/dashboard") {
            window.history.replaceState({}, "", "/dashboard");
        } else {
            // Avoid an infinite loop when not even the dashboard is allowed
            // (corrupt session or empty role).
            authService.clearSession();
            window.history.replaceState({}, "", "/login");
        }
        return renderRoute();
    }

    // 4. Update the page title if the route defines one.
    if (route.title) {
        document.title = route.title;
    }

    // 5. Actual render.
    const updateDOM = async () => {
        app.innerHTML = `
            <div id="content">
                ${await route.renderView()}
            </div>
        `;
        setupNavBar();
        if (route.initSetup) {
            route.initSetup();
        }
    };

    // 6. Use the View Transitions API when available.
    if (document.startViewTransition) {
        document.startViewTransition(() => updateDOM());
    } else {
        await updateDOM();
    }
}