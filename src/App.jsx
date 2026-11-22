import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw, Download, Heart, ImagePlus, Disc3, Check, Music2 } from 'lucide-react';

const frames = [
  { id: 'cream', name: 'Sunday paper', bg: '#f3eadb', ink: '#5b4036', accent: '#a44c4d' },
  { id: 'rose', name: 'Rosy hours', bg: '#e9c9c7', ink: '#603b40', accent: '#a65c64' },
  { id: 'noir', name: 'After hours', bg: '#292323', ink: '#f4e8d8', accent: '#c68b79' },
  { id: 'red', name: 'Cherry club', bg: '#791f2b', ink: '#f7e9d8', accent: '#e4b7a8' },
  { id: 'blue', name: 'Blue hour', bg: '#d9e0df', ink: '#394d50', accent: '#789596' },
  { id: 'butter', name: 'Butter note', bg: '#eee2b9', ink: '#65513a', accent: '#ad7952' },
];

const filters = [
  { id: 'natural', name: 'Original', css: 'none' },
  { id: 'warm', name: 'Warm film', css: 'sepia(.22) saturate(1.12) contrast(1.04)' },
  { id: 'mono', name: 'B&W', css: 'grayscale(1) contrast(1.08)' },
  { id: 'soft', name: 'Soft glow', css: 'brightness(1.08) saturate(.82) sepia(.12)' },
];

function spotifyEmbedUrl(value) {
  const input = value.trim();
  const uriMatch = input.match(/^spotify:(track|album|playlist|episode|show):([a-zA-Z0-9]+)$/);
  if (uriMatch) return `https://open.spotify.com/embed/${uriMatch[1]}/${uriMatch[2]}?utm_source=generator&theme=0`;
  try {
    const url = new URL(input);
    if (!['open.spotify.com', 'www.open.spotify.com'].includes(url.hostname)) return null;
    const match = url.pathname.match(/^\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/);
    return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0` : null;
  } catch { return null; }
}
const shotCount = 4;

export default function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [shots, setShots] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [taking, setTaking] = useState(false);
  const [frame, setFrame] = useState(frames[0]);
  const [spotifyInput, setSpotifyInput] = useState('');
  const [spotifyEmbed, setSpotifyEmbed] = useState('');
  const [spotifyError, setSpotifyError] = useState('');
  const [filter, setFilter] = useState(filters[0]);
  const [developing, setDeveloping] = useState(false);
  const [stripUrl, setStripUrl] = useState('');
  const [caption, setCaption] = useState('a little piece of today');
  const [flash, setFlash] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const startCamera = useCallback(async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access needs HTTPS or localhost, and a supported browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch (error) {
      setCameraError(error.name === 'NotAllowedError' ? 'Camera permission was blocked. Allow camera access in your browser settings.' : 'Could not open the camera. Check that it is connected and not being used by another app.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    clearTimeout(timerRef.current);
  }, []);

  const takeSnapshot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
    ctx.filter = filter.css;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
    return canvas.toDataURL('image/jpeg', 0.92);
  };

  const runSession = async () => {
    if (!cameraOn) { await startCamera(); return; }
    if (taking) return;
    setShots([]); setStripUrl(''); setShowResult(false); setTaking(true);
    const captured = [];
    for (let i = 0; i < shotCount; i++) {
      for (let n = 3; n > 0; n--) {
        setCountdown(n);
        await new Promise(resolve => { timerRef.current = setTimeout(resolve, 850); });
      }
      setCountdown('SMILE');
      setFlash(true);
      await new Promise(resolve => setTimeout(resolve, 160));
      const shot = takeSnapshot();
      if (shot) captured.push(shot);
      setFlash(false);
      setShots([...captured]);
      setCountdown(null);
      if (i < shotCount - 1) await new Promise(resolve => setTimeout(resolve, 750));
    }
    setTaking(false);
    setCountdown(null);
    if (captured.length) {
      setShots(captured);
      setDeveloping(true);
      await new Promise(resolve => setTimeout(resolve, 2400));
      setDeveloping(false);
      setShowResult(true);
    }
  };

  const makeStrip = async () => {
    if (!shots.length) return;
    const width = 620, pad = 28, gap = 12, photoW = width - pad * 2, photoH = 390;
    const height = pad * 2 + shotCount * photoH + (shotCount - 1) * gap + 110;
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = frame.bg; ctx.fillRect(0, 0, width, height);
    // Scalloped paper edge, inspired by vintage lace stationery.
    ctx.fillStyle = frame.accent + '55';
    for (let x = 12; x < width; x += 18) { ctx.beginPath(); ctx.arc(x, 9, 5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(x, height - 9, 5, 0, Math.PI * 2); ctx.fill(); }
    for (let y = 12; y < height; y += 18) { ctx.beginPath(); ctx.arc(9, y, 5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(width - 9, y, 5, 0, Math.PI * 2); ctx.fill(); }
    // subtle paper grain
    for (let i = 0; i < 5200; i++) {
      ctx.fillStyle = `rgba(${frame.id === 'noir' ? '255,240,220' : '70,45,35'},${Math.random() * 0.055})`;
      ctx.fillRect(Math.random() * width, Math.random() * height, 1.5, 1.5);
    }
    for (let i = 0; i < shots.length; i++) {
      const img = new Image(); img.src = shots[i];
      await new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
      const y = pad + i * (photoH + gap);
      ctx.fillStyle = frame.ink; ctx.fillRect(pad - 3, y - 3, photoW + 6, photoH + 6);
      ctx.save();
      ctx.beginPath(); ctx.rect(pad, y, photoW, photoH); ctx.clip();
      const scale = Math.max(photoW / img.width, photoH / img.height);
      const sw = photoW / scale, sh = photoH / scale;
      ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, pad, y, photoW, photoH);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2; ctx.strokeRect(pad + 5, y + 5, photoW - 10, photoH - 10);
      // Tiny printed registration marks for a tactile lab-print finish.
      ctx.fillStyle = frame.accent;
      ctx.fillRect(pad + 10, y + photoH - 8, 18, 2);
    }
    ctx.fillStyle = frame.ink;
    ctx.textAlign = 'center';
    ctx.font = 'italic 30px Georgia'; ctx.fillText("thePhoto's", width / 2, height - 66);
    ctx.font = '15px monospace'; ctx.fillStyle = frame.accent; ctx.fillText(caption.slice(0, 48), width / 2, height - 34);
    ctx.textAlign = 'left';
    const url = canvas.toDataURL('image/png');
    setStripUrl(url);
    return url;
  };

  const saveStrip = async () => {
    const url = stripUrl || await makeStrip();
    if (!url) return;
    const a = document.createElement('a'); a.href = url; a.download = `thephotos-${Date.now()}.png`; a.click();
  };

  const loadSpotify = () => {
    const embed = spotifyEmbedUrl(spotifyInput);
    if (!embed) { setSpotifyError('Paste a valid Spotify track, album, playlist, or podcast link.'); return; }
    setSpotifyError('');
    setSpotifyEmbed(embed);
  };

  return <main className="app-shell">
    <div className="grain" />
    <header className="topbar">
      <a className="wordmark" href="#"><span className="wordmark-star">✳</span> thePhoto's</a>
      <div className="top-note">A LITTLE PHOTOBOOTH EXPERIENCE <span>·</span> EST. 2026</div>
      <div className="top-right"><span className="status-dot" /> MADE FOR YOUR MEMORIES</div>
    </header>

    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">YOUR VERY OWN LITTLE PHOTO STUDIO</p>
        <h1>Keep the moments<br/><em>that feel like you.</em></h1>
        <p className="intro">A tiny corner of the internet to make something worth keeping. Pick a song, find your light, and let the camera roll.</p>
        <div className="hero-meta"><span>01 — SET THE MOOD</span><span>02 — TAKE YOUR SHOTS</span><span>03 — KEEP IT FOREVER</span></div>
      </div>
      <div className="disc-stage" aria-label="Decorative record">
        <div className="disc"><div className="disc-label"><span>thePhoto's</span><small>MEMORY MIX · SIDE A</small><i>✳</i></div></div>
        <div className="disc-sticker">PLAY<br/>YOUR<br/>MOMENT</div>
        <div className="disc-caption">a soundtrack for<br/>the little things</div>
      </div>
    </section>

    <section className="studio-grid">
      <aside className="side-panel">
        <div className="section-kicker">01 / SOUNDTRACK</div>
        <div className="panel-title">Set the mood<span>♪</span></div>
        <div className="music-card spotify-card">
          <div className="album-art vinyl-art"><div className="album-hole" /><span>the<br/>Photo's</span></div>
          <div className="track-info"><span className="tiny-label">YOUR SOUNDTRACK</span><strong>{spotifyEmbed ? 'Spotify is connected' : 'A song for this moment'}</strong><small>{spotifyEmbed ? 'READY TO PLAY BELOW' : 'PASTE A SPOTIFY LINK'}</small></div>
          <Music2 size={18} className="spotify-mark" />
        </div>
        <div className="spotify-input-wrap">
          <input className="spotify-input" value={spotifyInput} onChange={e => setSpotifyInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadSpotify()} placeholder="Paste Spotify song or playlist link" aria-label="Spotify link" />
          <button className="spotify-load" onClick={loadSpotify}>LOAD</button>
        </div>
        {spotifyError && <p className="error-message">{spotifyError}</p>}
        {spotifyEmbed ? <div className="spotify-embed"><iframe title="Spotify player" src={spotifyEmbed} width="100%" height="152" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" /></div> : <p className="micro-copy">Paste a Spotify share link. Playback happens in Spotify's official mini player.</p>}
        <div className="divider-line" />
        <div className="section-kicker">02 / THE FRAME</div>
        <div className="panel-title">Pick your paper<span>✳</span></div>
        <div className="frame-options">
          {frames.map(f => <button key={f.id} onClick={() => setFrame(f)} className={`frame-option ${frame.id === f.id ? 'selected' : ''}`} style={{'--swatch': f.bg, '--ink': f.ink}}><span className="swatch"><i/></span><span>{f.name}</span>{frame.id === f.id && <b>✓</b>}</button>)}
        </div>
        <div className="filter-heading"><label className="caption-label">03 / YOUR FILM FINISH</label><span className="filter-note">APPLIED TO NEW SHOTS</span></div>
        <div className="filter-options">
          {filters.map(f => <button key={f.id} className={`filter-option ${filter.id === f.id ? 'selected' : ''}`} onClick={() => setFilter(f)}><span className={`filter-preview filter-${f.id}`}/>{f.name}{filter.id === f.id && <Check size={12}/>}</button>)}
        </div>
        <label className="caption-label">A NOTE AT THE BOTTOM</label>
        <input className="caption-input" value={caption} onChange={e => setCaption(e.target.value)} maxLength={48} />
      </aside>

      <section className="camera-panel">
        <div className="camera-heading"><div><div className="section-kicker">03 / IN FRONT OF THE LENS</div><div className="panel-title">Your little studio</div></div><span className="live-tag"><i/> {cameraOn ? 'CAMERA READY' : 'STANDBY'}</span></div>
        <div className={`viewfinder ${flash ? 'flash' : ''}`}>
          <video ref={videoRef} autoPlay playsInline muted className={cameraOn ? 'visible' : ''} style={{ filter: filter.css }}/>
          {!cameraOn && <div className="camera-placeholder"><div className="placeholder-mark"><Camera size={34}/></div><span>YOUR MOMENT GOES HERE</span><small>Find a little light. We'll take it from here.</small></div>}
          <div className="viewfinder-corners"><i/><i/><i/><i/></div>
          <div className="viewfinder-top"><span>TP — 001</span><span>● REC <b>HD</b></span></div>
          {countdown !== null && <div className="countdown">{countdown}</div>}
          {taking && countdown === null && <div className="shot-progress">PHOTO {shots.length + 1} / {shotCount}</div>}
          <div className="viewfinder-bottom"><span>◉ AUTO</span><span>♡ KEEP THIS ONE</span><span>ISO 400</span></div>
        </div>
        <div className="camera-controls">
          <div className="shot-counter">{Array.from({length: shotCount}, (_, i) => <span key={i} className={i < shots.length ? 'filled' : ''}>{i < shots.length ? '✳' : `0${i+1}`}</span>)}</div>
          <button className="capture-button" onClick={runSession} disabled={taking}><span className="capture-inner">{taking ? <span className="loader"/> : <Camera size={19}/>}</span><span>{!cameraOn ? 'OPEN CAMERA' : taking ? 'CAPTURING YOUR MOMENTS' : 'TAKE 4 PHOTOS'}</span></button>
          {cameraOn && <button className="text-button" onClick={stopCamera}>TURN OFF</button>}
        </div>
        {cameraError && <p className="error-message">{cameraError}</p>}
        {!cameraOn && <p className="permission-note">Your camera is only used for this session. Photos are processed in your browser.</p>}
        {shots.length > 0 && <div className="captured-row">{shots.map((s,i)=><img key={i} src={s} alt={`Photo ${i+1}`}/>)}</div>}
      </section>
    </section>

    {developing && <div className="developing-overlay" role="status" aria-live="polite"><div className="developing-card"><div className="developing-disc"><Disc3 size={58}/></div><span className="section-kicker">THE LITTLE PHOTO LAB</span><h2>Developing your<br/><em>memories...</em></h2><p>Good things take a little time.</p><div className="developing-track"><i/></div><span className="developing-foot">PLEASE DON'T CLOSE THIS WINDOW</span></div></div>}

    {showResult && <section className="result-section">
      <div className="result-heading"><div><div className="section-kicker">04 / FRESH FROM THE DARKROOM</div><h2>Your memories,<br/><em>developed.</em></h2></div><span className="result-stamp">ONE OF A KIND<br/>✳ JUST FOR YOU</span></div>
      <div className="result-layout">
        <div className="strip-wrap">
          <div className={`lace-edge lace-${frame.id}`}><div className="photo-strip" style={{'--paper':frame.bg,'--ink':frame.ink,'--accent':frame.accent}}>
            {shots.map((s,i)=><img key={i} src={s} alt={`Photo strip frame ${i+1}`}/>)}
            <div className="strip-brand">thePhoto's <span>✳</span></div><div className="strip-caption">{caption}</div>
          </div></div>
        </div>
        <div className="result-copy"><span className="tiny-label">A LITTLE SOMETHING TO KEEP</span><p>Some days deserve more than a camera roll. Here's your little strip of today — made by you, kept by you.</p><button className="primary-button" onClick={saveStrip}><Download size={16}/> SAVE THIS STRIP</button><button className="secondary-button" onClick={makeStrip}><ImagePlus size={15}/> PREPARE DOWNLOAD</button><button className="text-button retake" onClick={() => {setShots([]);setShowResult(false);setStripUrl('');}}><RotateCcw size={14}/> START A NEW SESSION</button></div>
      </div>
    </section>}

    <footer className="footer"><span>thePhoto's © 2026</span><span>MADE OF LITTLE MOMENTS <Heart size={11} fill="currentColor"/></span><span>KEEP A COPY. KEEP A MEMORY.</span></footer>
  </main>;
}
