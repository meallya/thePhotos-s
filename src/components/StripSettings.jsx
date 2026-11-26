export default function StripSettings({ config, onChange }) {
  const update=(patch)=>onChange({ ...config, ...patch });
  return <details className="strip-settings">
    <summary>Customize your strip</summary>
    <div className="strip-settings-content">
      <fieldset>
        <legend>Orientation</legend>
        <div className="strip-layout-options">
          {[["vertical","Vertical"],["horizontal","Horizontal"]].map(([value,label])=>
            <button key={value} type="button" className={config.layout===value?"selected":""}
              aria-pressed={config.layout===value}
              onClick={()=>update({layout:value,photoWidth:value==="vertical"?564:390,photoHeight:value==="vertical"?390:270})}>
              {label}
            </button>)}
        </div>
      </fieldset>
      <label className="strip-date-toggle">
        <input type="checkbox" checked={config.captionVisible??true}
          onChange={(event)=>update({captionVisible:event.target.checked})}/><span>Print caption</span>
      </label>
      <label className="strip-date-toggle">
        <input type="checkbox" checked={config.showDate}
          onChange={(event)=>update({showDate:event.target.checked})}/><span>Print session date</span>
      </label>
    </div>
  </details>;
}
