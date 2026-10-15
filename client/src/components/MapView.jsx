// A drawn radar-style map: "you" sit at the centre, pins are placed by distance (km)
// and bearing (ang). Swap this component for Leaflet or Google Maps in the real build.
export const KIND_COLOR = {
  rooms: "var(--rooms)",
  lostfound: "var(--lost)",
  rentals: "var(--rent)",
  services: "var(--serv)",
  alerts: "var(--alert)",
};

const MAX_KM = 5;
const LEGEND = [["rooms", "Rooms"], ["lostfound", "Lost & found"], ["rentals", "Rentals"], ["services", "Services"], ["alerts", "Alerts"]];

export default function MapView({ pins, radius, selected, onSelect, height = 380 }) {
  const ring = (radius / MAX_KM) * 90;
  return (
    <div className="map" style={{ height }}>
      <div className="map-grid" />
      <div className="map-ring" style={{ width: `${ring}%`, height: `${(ring * 1) }%` }} />
      <div className="map-you"><span>You</span></div>
      {pins
        .filter((p) => p.km <= radius)
        .map((p) => {
          const r = (p.km / MAX_KM) * 45;
          const rad = (p.ang * Math.PI) / 180;
          const left = 50 + r * Math.cos(rad);
          const top = 50 + r * Math.sin(rad);
          const on = selected === `${p.kind}-${p.id}`;
          return (
            <button
              key={`${p.kind}-${p.id}`}
              className={`pin ${on ? "on" : ""} ${p.kind === "alerts" ? "pulse" : ""}`}
              style={{ left: `${left}%`, top: `${top}%`, background: KIND_COLOR[p.kind] }}
              onClick={() => onSelect?.(p)}
              aria-label={p.label}
              title={p.label}
            />
          );
        })}
      <div className="map-scale">{radius} km radius</div>
      <ul className="map-legend" aria-label="Map legend">
        {LEGEND.map(([k, l]) => (
          <li key={k}><i style={{ background: KIND_COLOR[k] }} />{l}</li>
        ))}
      </ul>
    </div>
  );
}
