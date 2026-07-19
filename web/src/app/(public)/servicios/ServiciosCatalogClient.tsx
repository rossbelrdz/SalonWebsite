"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ServiceMedia } from "@/components/ServiceMedia";
import { categoryLabel, formatPrice } from "@/lib/format";

export type ServiceCardData = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  priceCents: number;
  durationMin: number;
  mediaClass: string;
  imageUrl: string | null;
};

/** Orden de presentación de categorías (solo se muestran las que existan). */
const CATEGORY_ORDER = [
  "HAIR",
  "COLOR",
  "BEARD",
  "NAILS",
  "SPA",
  "MAKEUP",
  "OTHER",
] as const;

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function ServiciosCatalogClient({ services }: { services: ServiceCardData[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const present = new Set(services.map((s) => s.category));
    const ordered: string[] = CATEGORY_ORDER.filter((c) => present.has(c));
    for (const c of present) {
      if (!ordered.includes(c)) ordered.push(c);
    }
    return ordered;
  }, [services]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return services.filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (!q) return true;
      const hay = normalize(
        [s.name, s.description ?? "", categoryLabel(s.category)].join(" "),
      );
      return hay.includes(q);
    });
  }, [services, query, category]);

  return (
    <div className="servicios-catalog">
      <div className="servicios-toolbar">
        <label className="servicios-search">
          <span className="sr-only">Buscar servicios</span>
          <span className="servicios-search-icon" aria-hidden>
            ⌕
          </span>
          <input
            type="search"
            className="form-control"
            placeholder="Buscar servicio…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            enterKeyHint="search"
          />
          {query && (
            <button
              type="button"
              className="servicios-search-clear"
              onClick={() => setQuery("")}
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </label>

        <div
          className="filters servicios-tabs"
          role="tablist"
          aria-label="Categorías de servicio"
        >
          <button
            type="button"
            role="tab"
            aria-selected={category === "all"}
            className={`chip${category === "all" ? " is-active" : ""}`}
            onClick={() => setCategory("all")}
          >
            Todas
            <span className="chip-count">{services.length}</span>
          </button>
          {categories.map((c) => {
            const count = services.filter((s) => s.category === c).length;
            return (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={category === c}
                className={`chip${category === c ? " is-active" : ""}`}
                onClick={() => setCategory(c)}
              >
                {categoryLabel(c)}
                <span className="chip-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state card" style={{ padding: "2rem", textAlign: "center" }}>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>Sin resultados</p>
          <p className="muted small" style={{ margin: 0 }}>
            {query
              ? `No hay servicios que coincidan con “${query.trim()}”.`
              : "No hay servicios en esta categoría."}
          </p>
          {(query || category !== "all") && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: "1rem" }}
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
            >
              Ver todos
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="tiny muted servicios-count" aria-live="polite">
            {filtered.length}{" "}
            {filtered.length === 1 ? "servicio" : "servicios"}
            {category !== "all" ? ` · ${categoryLabel(category)}` : ""}
            {query.trim() ? ` · “${query.trim()}”` : ""}
          </p>
          <div className="grid-3">
            {filtered.map((s) => (
              <Link key={s.id} href={`/servicios/${s.id}`} className="card card-hover">
                <ServiceMedia
                  mediaClass={s.mediaClass}
                  imageUrl={s.imageUrl}
                  name={s.name}
                />
                <div className="card-body">
                  <span className="badge">{categoryLabel(s.category)}</span>
                  <h3 style={{ margin: "0.5rem 0", fontSize: "1.1rem" }}>{s.name}</h3>
                  <p className="small muted line-clamp-2">
                    {s.description || `${s.durationMin} min`}
                  </p>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span className="price">{formatPrice(s.priceCents)}</span>
                    <span className="tiny muted">{s.durationMin} min</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
