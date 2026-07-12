import { authService } from "../services/auth.service";
import { escapeHtml } from "../utils/validators";

export const sidebarComponent = (isActive) => {
  const user = authService.getSession();
  if (!user) return "";

  const role = user.roles ? user.roles[0] : "Usuario";

  return `
    <div id="sidebar-overlay" class="fixed inset-0 z-40 bg-black/50 opacity-0 pointer-events-none transition-opacity duration-300"></div>
    <aside id="main-sidebar" class="fixed top-0 left-0 z-50 h-full w-72 -translate-x-full bg-[var(--bg-panel)] flex flex-col border-r border-[var(--border-main)] shadow-2xl transition-transform duration-300 ease-in-out">
      
      <div class="p-6 border-b border-[var(--border-main)] flex items-center justify-between">
        <div>
          <h2 class="text-xl font-black text-[var(--text-main)] flex items-center gap-2">
            <svg class="w-6 h-6 text-[#7559ED]" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3v18h4v-7h6v7h4V3H5zm6 9H9V6h2v6zm4 0h-2V6h2v6z"/></svg>
            LeadTrace
          </h2>
          <p class="text-xs text-[var(--text-muted)] font-medium mt-1">Professional Feedback</p>
        </div>
        <button id="close-sidebar-btn" class="p-2 text-[var(--text-muted)] hover:bg-[var(--bg-base)] rounded-xl cursor-pointer hover:text-[var(--text-main)] transition-colors lg:hidden">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="px-6 py-4">
        <a href="/evaluations/new" class="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7559ED] py-3 text-sm font-bold text-white transition-all hover:bg-[#4139A3] hover:shadow-md cursor-pointer">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          New Evaluation
        </a>
      </div>

      <nav class="flex-1 px-4 py-2 space-y-2 overflow-y-auto">
        <a href="/dashboard" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive('/dashboard') ? 'bg-[var(--bg-base)] text-[#7559ED]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-base)]'}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          Home
        </a>
        <a href="/evaluations" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive('/evaluations') ? 'bg-[var(--bg-base)] text-[#7559ED]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-base)]'}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          Evaluations
        </a>
        <a href="/admin/metrics" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive('/admin/metrics') ? 'bg-[var(--bg-base)] text-[#7559ED]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-base)]'}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          Metrics
        </a>
        <a href="/settings" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive('/settings') ? 'bg-[var(--bg-base)] text-[#7559ED]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-base)]'}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          Settings
        </a>
      </nav>

      <div class="p-6 border-t border-[var(--border-main)]">
        <a href="/support" class="flex items-center gap-3 text-sm font-medium text-[var(--text-muted)] hover:text-[#7559ED] transition-colors mb-6">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Support
        </a>
        <a href="/profile" class="flex items-center gap-3 group">
          <div class="h-10 w-10 rounded-full bg-[var(--bg-base)] flex items-center justify-center overflow-hidden border border-[var(--border-main)] group-hover:border-[#7559ED] transition-colors">
            <svg class="w-6 h-6 text-[var(--text-muted)]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          </div>
          <div>
            <p class="text-sm font-bold text-[var(--text-main)] group-hover:text-[#7559ED] transition-colors">${escapeHtml(user.name)}</p>
            <p class="text-xs text-[var(--text-muted)] capitalize">${escapeHtml(role.replace('_', ' '))}</p>
          </div>
        </a>
      </div>
    </aside>
  `;
};
