"use client";

/**
 * Mapa de sucursales con MapLibre GL (tiles OpenFreeMap).
 * Sin logo/watermark de Mapbox; atribución OSM compacta (requerida por licencia).
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import maplibregl, { type Map, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type BranchMapItem = {
  id: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  openTime: string;
  closeTime: string;
  phone: string | null;
};

/** Estilo vectorial gratuito (sin API key). */
const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/** Quita attributions del style JSON para no mostrar paneles OpenFreeMap/MapTiles. */
function stripStyleAttribution(node: unknown): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach(stripStyleAttribution);
    return;
  }
  const obj = node as Record<string, unknown>;
  if ("attribution" in obj) obj.attribution = "";
  for (const v of Object.values(obj)) stripStyleAttribution(v);
}

function makePinEl(active: boolean) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `maplibre-pin${active ? " is-active" : ""}`;
  el.innerHTML = `<span class="maplibre-pin-dot" aria-hidden="true"></span>`;
  el.setAttribute("aria-label", "Sucursal en el mapa");
  return el;
}

export function BranchesMap({ branches }: { branches: BranchMapItem[] }) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<MapMarker[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    branches[0]?.id ?? null,
  );
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");

  type MapMarker = { id: string; marker: Marker; el: HTMLButtonElement };

  // Init map once
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    if (branches.length === 0) return;

    let cancelled = false;
    let map: Map | null = null;

    (async () => {
      try {
        const res = await fetch(MAP_STYLE_URL);
        if (!res.ok) throw new Error(`style HTTP ${res.status}`);
        const style = (await res.json()) as maplibregl.StyleSpecification;
        stripStyleAttribution(style);
        if (cancelled || !mapEl.current) return;

        map = new maplibregl.Map({
          container: mapEl.current,
          style,
          center: [branches[0].lng, branches[0].lat],
          zoom: 12,
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
        });

        map.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          "top-right",
        );
        // Sin AttributionControl de MapLibre (evita chips OpenFreeMap/MapTiles).
        // Crédito legal OSM va en .map-attrib del DOM (abajo).

        map.on("load", () => {
          if (cancelled || !map) return;
          setMapReady(true);
          const bounds = new maplibregl.LngLatBounds();
          for (const b of branches) bounds.extend([b.lng, b.lat]);
          if (branches.length === 1) {
            map.setCenter([branches[0].lng, branches[0].lat]);
            map.setZoom(14);
          } else {
            map.fitBounds(bounds, { padding: 56, maxZoom: 14, duration: 0 });
          }
        });

        map.on("error", (e) => {
          console.error("[BranchesMap]", e.error);
          setMapError("No se pudo cargar el mapa. Revisa la conexión.");
        });

        mapRef.current = map;
      } catch (e) {
        console.error("[BranchesMap] style", e);
        if (!cancelled) setMapError("No se pudo cargar el mapa. Revisa la conexión.");
      }
    })();

    return () => {
      cancelled = true;
      for (const m of markersRef.current) m.marker.remove();
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Markers + selection sync
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // clear old
    for (const m of markersRef.current) m.marker.remove();
    markersRef.current = [];

    for (const b of branches) {
      const el = makePinEl(b.id === selectedId);
      el.title = b.name;
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        setSelectedId(b.id);
        map.flyTo({ center: [b.lng, b.lat], zoom: Math.max(map.getZoom(), 14), essential: true });
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([b.lng, b.lat])
        .addTo(map);
      markersRef.current.push({ id: b.id, marker, el });
    }
  }, [branches, mapReady, selectedId]);

  function selectBranch(id: string) {
    setSelectedId(id);
    const b = branches.find((x) => x.id === id);
    const map = mapRef.current;
    if (b && map) {
      map.flyTo({ center: [b.lng, b.lat], zoom: Math.max(map.getZoom(), 14), essential: true });
    }
  }

  return (
    <div className="map-layout">
      <div className="map-list" role="list">
        {branches.map((b) => {
          const active = b.id === selectedId;
          return (
            <div
              key={b.id}
              role="listitem"
              className={`card card-selectable${active ? " is-selected" : ""}`}
              onClick={() => selectBranch(b.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  selectBranch(b.id);
                }
              }}
              tabIndex={0}
            >
              <div className="card-body">
                <div className="row" style={{ justifyContent: "space-between", gap: "0.5rem" }}>
                  <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{b.name}</h3>
                  {active && <span className="badge badge-success">Seleccionada</span>}
                </div>
                <p className="small muted" style={{ margin: "0.35rem 0 0.25rem" }}>
                  {b.address}, {b.city}
                </p>
                <p className="tiny muted" style={{ margin: 0 }}>
                  {b.openTime} – {b.closeTime}
                  {b.phone ? ` · ${b.phone}` : ""}
                </p>
                <div className="row" style={{ marginTop: "0.75rem" }}>
                  <Link
                    href={`/agendar?branchId=${b.id}`}
                    className="btn btn-primary btn-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Agendar aquí
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="map-canvas maplibre-host" aria-label="Mapa de sucursales">
        <div ref={mapEl} className="maplibre-root" />
        <a
          className="map-attrib"
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
        >
          © OpenStreetMap
        </a>
        {mapError && (
          <div className="maplibre-fallback">
            <p className="muted small">{mapError}</p>
          </div>
        )}
        {!mapReady && !mapError && (
          <div className="maplibre-fallback maplibre-loading">
            <p className="tiny muted">Cargando mapa…</p>
          </div>
        )}
      </div>
    </div>
  );
}
