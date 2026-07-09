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
    const currentPath = window.location.pathname;
    const route = ROUTES[currentPath] ?? ROUTES['/404'];

    const userSession = authService.getSession();
    const userRole = userSession?.roles || [];

    if (route.requireAuth && !userSession) {
        window.history.replaceState({}, "", "/login");
        return renderRoute();
    }

    if (route.redirectIfAuth && userSession) {
        window.history.replaceState({}, "", "/dashboard");
        return renderRoute();
    }

    if (route.requireAuth && route.allowedRoles && !route.allowedRoles.some(role => userRole.includes(role))) {
        console.warn("Acceso denegado: Rol insuficiente.");
        showToast("Acceso Denegado", "error", "No tienes permiso para acceder a esta página.")
        window.history.replaceState({}, "", "/dashboard");
        return renderRoute();
    }

    if (route.title) {
        document.title = route.title;
    }

    app.innerHTML = `
        <div id="content">
            ${await route.renderView()}
        </div>
    `;

    setupNavBar();
    if (route.initSetup) {
        route.initSetup();
    }
}