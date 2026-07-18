/* Salon Mockup — interactions (static, no backend) */

(function () {
  // Mobile public nav
  document.querySelectorAll("[data-nav-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelector(".public-nav")?.classList.toggle("is-open");
    });
  });

  // Admin sidebar mobile
  document.querySelectorAll("[data-sidebar-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelector(".admin-shell")?.classList.toggle("sidebar-open");
    });
  });
  document.querySelectorAll("[data-sidebar-close]").forEach((el) => {
    el.addEventListener("click", () => {
      document.querySelector(".admin-shell")?.classList.remove("sidebar-open");
    });
  });

  // Selectable cards
  document.querySelectorAll("[data-select-group]").forEach((group) => {
    group.querySelectorAll("[data-select-item]").forEach((item) => {
      item.addEventListener("click", () => {
        group
          .querySelectorAll("[data-select-item]")
          .forEach((i) => i.classList.remove("is-selected"));
        item.classList.add("is-selected");
        group.dispatchEvent(
          new CustomEvent("selection-change", {
            detail: { id: item.dataset.selectItem },
          })
        );
      });
    });
  });

  // Filter chips
  document.querySelectorAll("[data-filter-group]").forEach((group) => {
    group.querySelectorAll("[data-filter]").forEach((chip) => {
      chip.addEventListener("click", () => {
        group
          .querySelectorAll("[data-filter]")
          .forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");
        const filter = chip.dataset.filter;
        const target = group.dataset.filterGroup;
        document.querySelectorAll(`[data-filter-item="${target}"]`).forEach((el) => {
          if (filter === "all" || el.dataset.category === filter) {
            el.style.display = "";
          } else {
            el.style.display = "none";
          }
        });
      });
    });
  });

  // Booking wizard
  const wizard = document.querySelector("[data-wizard]");
  if (wizard) {
    let step = 0;
    const panels = [...wizard.querySelectorAll("[data-wizard-panel]")];
    const steps = [...wizard.querySelectorAll("[data-wizard-step]")];
    const summary = wizard.querySelector("[data-wizard-summary]");

    const state = {
      sucursal: "Roma Norte",
      servicio: "Corte clásico",
      profesional: "Leo M.",
      fecha: "Mié 16 jul",
      hora: "11:30",
      prepago: true,
    };

    function render() {
      panels.forEach((p, i) => p.classList.toggle("is-active", i === step));
      steps.forEach((s, i) => {
        s.classList.toggle("is-active", i === step);
        s.classList.toggle("is-done", i < step);
      });
      if (summary) {
        summary.innerHTML = `
          <div class="row" style="justify-content:space-between">
            <span class="muted small">Sucursal</span><strong>${state.sucursal}</strong>
          </div>
          <div class="row" style="justify-content:space-between">
            <span class="muted small">Servicio</span><strong>${state.servicio}</strong>
          </div>
          <div class="row" style="justify-content:space-between">
            <span class="muted small">Profesional</span><strong>${state.profesional}</strong>
          </div>
          <div class="row" style="justify-content:space-between">
            <span class="muted small">Fecha y hora</span><strong>${state.fecha} · ${state.hora}</strong>
          </div>
          <div class="row" style="justify-content:space-between">
            <span class="muted small">Pago</span><strong>${state.prepago ? "Prepago (−10%)" : "En local"}</strong>
          </div>`;
      }
      const prev = wizard.querySelector("[data-wizard-prev]");
      const next = wizard.querySelector("[data-wizard-next]");
      if (prev) prev.disabled = step === 0;
      if (next) {
        next.textContent = step === panels.length - 1 ? "Confirmar cita" : "Continuar";
      }
    }

    wizard.querySelector("[data-wizard-next]")?.addEventListener("click", () => {
      if (step < panels.length - 1) {
        step += 1;
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        window.location.href = "confirmacion.html";
      }
    });

    wizard.querySelector("[data-wizard-prev]")?.addEventListener("click", () => {
      if (step > 0) {
        step -= 1;
        render();
      }
    });

    wizard.querySelectorAll("[data-pick]").forEach((el) => {
      el.addEventListener("click", () => {
        const key = el.dataset.pick;
        const val = el.dataset.value;
        if (key && val) state[key] = val;
        const group = el.closest("[data-select-group]");
        if (group) {
          group
            .querySelectorAll("[data-select-item], [data-pick], .slot, .day-chip")
            .forEach((i) => i.classList.remove("is-selected"));
        }
        el.classList.add("is-selected");
        if (el.classList.contains("slot") || el.classList.contains("day-chip")) {
          // also mark sibling selection within parent
        }
        render();
      });
    });

    // Day chips / slots independent groups
    wizard.querySelectorAll(".day-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        wizard.querySelectorAll(".day-chip").forEach((c) => c.classList.remove("is-selected"));
        chip.classList.add("is-selected");
        state.fecha = chip.dataset.value || state.fecha;
        render();
      });
    });
    wizard.querySelectorAll(".slot:not(.is-disabled)").forEach((slot) => {
      slot.addEventListener("click", () => {
        wizard.querySelectorAll(".slot").forEach((s) => s.classList.remove("is-selected"));
        slot.classList.add("is-selected");
        state.hora = slot.dataset.value || slot.textContent.trim();
        render();
      });
    });

    wizard.querySelectorAll("[name=pago]").forEach((input) => {
      input.addEventListener("change", () => {
        state.prepago = input.value === "prepago";
        document.querySelectorAll(".toggle-card").forEach((c) => c.classList.remove("is-selected"));
        input.closest(".toggle-card")?.classList.add("is-selected");
        render();
      });
    });

    render();
  }

  // Tabs (+ hash deep-link for Configuración sidebar subnav)
  document.querySelectorAll("[data-tabs]").forEach((root) => {
    const tabs = [...root.querySelectorAll("[data-tab]")];
    const panels = [...root.querySelectorAll("[data-tab-panel]")];

    function activate(id, { pushHash } = { pushHash: true }) {
      if (!id || !panels.some((p) => p.dataset.tabPanel === id)) return;
      tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === id));
      panels.forEach((p) =>
        p.classList.toggle("is-active", p.dataset.tabPanel === id)
      );
      document.querySelectorAll("[data-config-tab]").forEach((link) => {
        link.classList.toggle("is-active", link.dataset.configTab === id);
      });
      const group = document.querySelector('[data-nav-group="config"]');
      group?.classList.add("is-open");
      if (pushHash && location.hash.replace("#", "") !== id) {
        history.replaceState(null, "", "#" + id);
      }
    }

    tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.preventDefault();
        activate(tab.dataset.tab);
      });
    });

    // Sidebar config sub-links (same page or navigate with hash)
    document.querySelectorAll("[data-config-tab]").forEach((link) => {
      link.addEventListener("click", (e) => {
        const id = link.dataset.configTab;
        const onConfig = !!document.querySelector('[data-tab-panel]');
        if (onConfig && root.contains(document.querySelector(`[data-tab-panel="${id}"]`))) {
          e.preventDefault();
          activate(id);
        }
      });
    });

    const fromHash = location.hash.replace("#", "");
    const initial =
      (fromHash && panels.some((p) => p.dataset.tabPanel === fromHash) && fromHash) ||
      tabs.find((t) => t.classList.contains("is-active"))?.dataset.tab ||
      tabs[0]?.dataset.tab;
    if (initial) activate(initial, { pushHash: !!fromHash });

    window.addEventListener("hashchange", () => {
      const id = location.hash.replace("#", "");
      if (id) activate(id, { pushHash: false });
    });
  });

  // Open Configuración group when any config sub-link is active or on config page
  if (
    document.querySelector(".sidebar-parent.is-active") ||
    location.pathname.includes("config.html")
  ) {
    document.querySelector('[data-nav-group="config"]')?.classList.add("is-open");
  }

  // Fake form submits
  document.querySelectorAll("form[data-mock-form]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = form.dataset.success || "Listo (mock). No se envió nada real.";
      alert(msg);
    });
  });

  // Map pin ↔ list sync
  document.querySelectorAll("[data-branch]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.branch;
      document
        .querySelectorAll("[data-branch]")
        .forEach((b) => b.classList.toggle("is-selected", b.dataset.branch === id));
      document
        .querySelectorAll("[data-map-pin]")
        .forEach((p) => p.classList.toggle("is-active", p.dataset.mapPin === id));
    });
  });
  document.querySelectorAll("[data-map-pin]").forEach((pin) => {
    pin.addEventListener("click", () => {
      const id = pin.dataset.mapPin;
      document
        .querySelectorAll("[data-branch]")
        .forEach((b) => b.classList.toggle("is-selected", b.dataset.branch === id));
      document
        .querySelectorAll("[data-map-pin]")
        .forEach((p) => p.classList.toggle("is-active", p.dataset.mapPin === id));
    });
  });
})();
