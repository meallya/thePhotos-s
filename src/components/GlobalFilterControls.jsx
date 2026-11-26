import { filters } from "../lib/photobooth.js";

export default function GlobalFilterControls({ filter, onChange, className = "" }) {
  return (
    <fieldset className={"global-filter-controls " + className}>
      <legend>CHOOSE A FILM PRESET</legend>
      <div className="filter-options" role="group" aria-label="Global film filter">
        {filters.map((item) => (
          <button key={item.id} type="button" aria-pressed={filter.id === item.id}
            className={"filter-option filter-card " + (filter.id === item.id ? "selected" : "")}
            onClick={() => onChange({ filterId: item.id })}>
            <span className="filter-card-content">
              <span className={"filter-preview filter-thumbnail filter-" + item.id} aria-hidden="true" />
              <span className="filter-label">{item.name}</span>
            </span>
            {filter.id === item.id && <span className="filter-check" aria-hidden="true">✓</span>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}