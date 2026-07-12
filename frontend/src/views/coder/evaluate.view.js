import { navBarComponent } from "../../components/navbar";
import { showToast } from "../../components/alerts";
import { renderRoute } from "../../router/router";

export const renderEvaluate = () => `
  ${navBarComponent()}
  <main class="mx-auto max-w-4xl px-6 py-10">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-[var(--text-main)]">Evaluation Form</h1>
      <p class="mt-2 text-[var(--text-muted)]">Provide structured upward feedback for your manager.</p>
    </div>

    <!-- Progress Bar -->
    <div class="mb-8">
      <div class="h-2 w-full rounded-full bg-[var(--border-main)]">
        <div class="h-2 w-1/3 rounded-full bg-[var(--brand-bg)] transition-all duration-300"></div>
      </div>
      <div class="mt-2 flex justify-between text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
        <span>Step 1 of 3</span>
        <span>Technical Mentorship</span>
      </div>
    </div>

    <form id="evaluate-form" class="space-y-6">
      
      <!-- Card: Technical Mentorship -->
      <section class="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-8 shadow-sm">
        <h2 class="mb-6 text-xl font-bold text-[var(--text-main)]">1. Technical Mentorship</h2>
        
        <!-- Question 1 -->
        <div class="mb-8 question-group">
          <p class="mb-4 text-base font-medium text-[var(--text-main)]">How effectively does the manager guide you through complex technical challenges?</p>
          <div class="grid grid-cols-5 gap-3">
            ${[
              { value: 1, label: "1 (Poor)" },
              { value: 2, label: "2" },
              { value: 3, label: "3 (Avg)" },
              { value: 4, label: "4" },
              { value: 5, label: "5 (Excl)" }
            ].map(opt => `
              <label class="cursor-pointer">
                <input type="radio" name="q1" value="${opt.value}" class="peer sr-only" />
                <div class="flex h-12 items-center justify-center rounded-xl border border-[var(--border-main)] bg-transparent text-sm font-medium text-[var(--text-muted)] transition-all peer-checked:border-[var(--brand-bg)] peer-checked:text-[var(--brand-bg)] peer-checked:shadow-sm hover:border-[var(--brand-hover)]">
                  ${opt.label}
                </div>
              </label>
            `).join('')}
          </div>
          <p class="error-msg mt-2 hidden text-sm text-[var(--danger-text)]">Please select an option.</p>
        </div>

        <!-- Question 2 -->
        <div class="mb-8 question-group">
          <p class="mb-4 text-base font-medium text-[var(--text-main)]">Are technical reviews constructive and actionable?</p>
          <div class="grid grid-cols-5 gap-3">
            ${[1, 2, 3, 4, 5].map(val => `
              <label class="cursor-pointer">
                <input type="radio" name="q2" value="${val}" class="peer sr-only" />
                <div class="flex h-12 items-center justify-center rounded-xl border border-[var(--border-main)] bg-transparent text-sm font-medium text-[var(--text-muted)] transition-all peer-checked:border-[var(--brand-bg)] peer-checked:text-[var(--brand-bg)] peer-checked:shadow-sm hover:border-[var(--brand-hover)]">
                  ${val}
                </div>
              </label>
            `).join('')}
          </div>
          <p class="error-msg mt-2 hidden text-sm text-[var(--danger-text)]">Please select an option.</p>
        </div>

        <!-- Comments -->
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-muted)]" for="comments">Optional Comments on Technical Mentorship</label>
          <textarea id="comments" name="comments" rows="4" placeholder="Provide specific examples..."
            class="w-full resize-none rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] p-4 text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-hover)]"></textarea>
        </div>
      </section>

      <!-- Card: Anonymous Submission -->
      <section class="flex items-center gap-4 rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-sm">
        <label class="relative inline-flex cursor-pointer items-center">
          <input type="checkbox" id="anonymous" name="anonymous" class="peer sr-only" />
          <div class="peer h-6 w-11 rounded-full bg-[var(--border-main)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[var(--brand-bg)] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--brand-hover)]"></div>
        </label>
        <div>
          <h3 class="text-base font-bold text-[var(--text-main)]">Anonymous Submission</h3>
          <p class="text-sm text-[var(--text-muted)]">When enabled, your feedback will be aggregated and anonymized before being shared with the manager. Identifying details will be removed to ensure candor.</p>
        </div>
      </section>

      <!-- Actions -->
      <div class="flex justify-end gap-4">
        <button type="button" id="draft-btn"
          class="cursor-pointer rounded-2xl border border-[var(--border-main)] bg-transparent px-6 py-3 text-sm font-bold text-[var(--text-main)] transition-all hover:bg-[var(--bg-base)] hover:shadow-sm">
          Save as draft
        </button>
        <button type="submit" id="submit-btn"
          class="cursor-pointer rounded-2xl bg-[var(--brand-bg)] px-6 py-3 text-sm font-bold text-[var(--brand-text)] transition-all hover:bg-[var(--brand-hover)] hover:shadow-md focus:ring-4 focus:ring-[var(--border-main)]">
          Submit Evaluation
        </button>
      </div>
    </form>
  </main>
`;

export const setupEvaluate = () => {
  const form = document.getElementById("evaluate-form");
  const draftBtn = document.getElementById("draft-btn");
  
  if (!form || !draftBtn) return;

  // Load draft if exists
  const savedDraft = localStorage.getItem("evaluation_draft");
  if (savedDraft) {
    try {
      const data = JSON.parse(savedDraft);
      if (data.q1) form.elements["q1"].value = data.q1;
      if (data.q2) form.elements["q2"].value = data.q2;
      if (data.comments) form.elements["comments"].value = data.comments;
      if (data.anonymous) form.elements["anonymous"].checked = data.anonymous;
    } catch (e) {
      console.error("Error loading draft", e);
    }
  }

  // Remove error message on change
  const questionGroups = form.querySelectorAll(".question-group");
  questionGroups.forEach(group => {
    const radios = group.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
      radio.addEventListener("change", () => {
        const errorMsg = group.querySelector(".error-msg");
        if (errorMsg) errorMsg.classList.add("hidden");
      });
    });
  });

  // Save as draft
  draftBtn.addEventListener("click", () => {
    const formData = new FormData(form);
    const data = {
      q1: formData.get("q1"),
      q2: formData.get("q2"),
      comments: formData.get("comments"),
      anonymous: formData.get("anonymous") === "on"
    };
    localStorage.setItem("evaluation_draft", JSON.stringify(data));
    showToast("Draft saved successfully", "success", "You can resume later.");
  });

  // Submit and Validation
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let isValid = true;

    // Validate radio groups
    questionGroups.forEach(group => {
      const radios = group.querySelectorAll('input[type="radio"]');
      const errorMsg = group.querySelector(".error-msg");
      const isAnswered = Array.from(radios).some(radio => radio.checked);
      
      if (!isAnswered) {
        if (errorMsg) errorMsg.classList.remove("hidden");
        isValid = false;
      } else {
        if (errorMsg) errorMsg.classList.add("hidden");
      }
    });

    if (!isValid) return;

    // Clear draft on successful submit
    localStorage.removeItem("evaluation_draft");
    showToast("Evaluation submitted!", "success", "Thank you for your feedback.");
    
    // Reset form or redirect
    setTimeout(() => {
      window.history.pushState({}, "", "/dashboard");
      renderRoute();
    }, 2000);
  });
};
