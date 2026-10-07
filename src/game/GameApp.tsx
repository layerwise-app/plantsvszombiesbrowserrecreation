import { useEffect, useRef, useState } from 'react';
import { Game, GRID } from './engine';
import { render, preload } from './renderer';
import { PLANTS, ZOMBIES, activeRows, plantInfo, type PlantKind } from './data';
import './game.css';

type Screen = 'menu' | 'choose' | 'battle' | 'almanac';
const ROOT = '/pvz/reference/graphics/';
const SAVE_KEY = 'pvz-adventure-v1';
const SETTINGS_KEY = 'pvz-settings-v1';
function card(id: PlantKind) { return ROOT + `Cards/card_${plantInfo(id).card}.png`; }
function SeedImage({ id }: { id: PlantKind }) { return <><img src={card(id)} alt={plantInfo(id).name} /><span className="seed-price">{plantInfo(id).cost}</span></>; }
function PlantImage({ id, className = '' }: { id: PlantKind; className?: string }) {
  const p = plantInfo(id); const name = p.sprite.split('/').at(-1);
  return <img className={className} src={ROOT + `${p.sprite}/${name}_0.png`} alt={p.name} draggable={false} />;
}
export function GameApp() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [level, setLevel] = useState(1);
  const [furthest, setFurthest] = useState(1);
  const [seeds, setSeeds] = useState<PlantKind[]>(['pea']);
  const [paused, setPaused] = useState(false);
  const [modal, setModal] = useState<'options' | 'help' | 'locked' | null>(null);
  const [muted, setMuted] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [saveWarning, setSaveWarning] = useState('');
  const [tick, setTick] = useState(0);
  const [scale, setScale] = useState(1);
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const mutedRef = useRef(muted);
  const music = useRef<HTMLAudioElement | null>(null);
  const soundPool = useRef(new Map<string, HTMLAudioElement>());
  const [wonSaved, setWonSaved] = useState(false);
  const game = gameRef.current;
  mutedRef.current = muted;
  function sound(name: string) {
    if (mutedRef.current) return;
    let audio = soundPool.current.get(name);
    if (!audio) { audio = new Audio(`/pvz/reference/sound/${name}.ogg`); audio.volume = .38; soundPool.current.set(name, audio); }
    if (!audio.paused && name === 'shoot') return;
    audio.currentTime = 0; void audio.play().catch(() => {});
  }
  useEffect(() => {
    preload();
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      const progress = Math.min(10, Math.max(1, Number(saved.level) || 1));
      setLevel(progress); setFurthest(progress);
      const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      setMuted(Boolean(settings.muted)); setMusicOn(settings.musicOn !== false);
    } catch { setSaveWarning('Local saving is unavailable in this browser.'); }
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setScale(Math.min(width / 800, height / 600));
    });
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ muted, musicOn })); } catch { /* Play remains available without storage. */ }
    if (music.current) { music.current.muted = muted || !musicOn; }
  }, [muted, musicOn]);
  useEffect(() => {
    music.current?.pause();
    if (screen !== 'menu') {
      const track = screen === 'battle' ? 'dayLevel' : 'chooseYourSeeds';
      music.current = new Audio(`/pvz/reference/music/${track}.opus`);
      music.current.loop = true; music.current.volume = .2; music.current.muted = mutedRef.current || !musicOn;
      void music.current.play().catch(() => {});
    }
    return () => music.current?.pause();
  }, [screen, musicOn]);
  useEffect(() => {
    function hide() { if (document.hidden && screen === 'battle') setPaused(true); }
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [screen]);
  useEffect(() => {
    if (screen !== 'battle') return;
    let raf = 0; let last = 0; let accumulator = 0; let ui = 0;
    function frame(now: number) {
      if (!last) last = now;
      const elapsed = Math.min(.1, (now - last) / 1000); last = now;
      if (!paused && !modal) { accumulator += elapsed; while (accumulator >= 1 / 60) { gameRef.current?.step(1 / 60); accumulator -= 1 / 60; } }
      const ctx = canvas.current?.getContext('2d');
      if (ctx && gameRef.current) render(ctx, gameRef.current, hover);
      ui += elapsed; if (ui > .1) { setTick(t => t + 1); ui = 0; }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame); return () => cancelAnimationFrame(raf);
  }, [screen, paused, modal, hover]);
  useEffect(() => {
    if (game?.status === 'won' && !wonSaved) {
      const next = Math.min(10, level + 1); setFurthest(f => Math.max(f, next)); setWonSaved(true);
      try { localStorage.setItem(SAVE_KEY, JSON.stringify({ level: Math.max(furthest, next), completedDay: level === 10 })); } catch { setSaveWarning('Your progress could not be saved.'); }
    }
  }, [tick, wonSaved, level, furthest, game]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (screen !== 'battle') return;
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') { e.preventDefault(); setPaused(p => !p); }
      if (e.key.toLowerCase() === 's' && level >= 5 && !paused && !modal) { gameRef.current?.select('shovel'); setTick(t => t + 1); }
      const index = Number(e.key) - 1;
      if (index >= 0 && index < seeds.length && !paused && !modal) { gameRef.current?.select(seeds[index]); setTick(t => t + 1); }
    }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [screen, seeds, level, paused, modal]);
  function choose(target = level) {
    sound('buttonclick'); setLevel(target);
    setSeeds(PLANTS.filter(p => p.unlock <= target).slice(0, 6).map(p => p.id)); setScreen('choose'); setPaused(false); setModal(null);
  }
  function start() {
    if (!seeds.length) return;
    gameRef.current = new Game(level, sound); setWonSaved(false); setPaused(false); setModal(null); setScreen('battle'); setTick(t => t + 1);
    sound('plantGrow');
  }
  function toggleSeed(id: PlantKind) {
    sound('clickCard'); setSeeds(old => old.includes(id) ? old.filter(s => s !== id) : old.length < 6 ? [...old, id] : old);
  }
  function pointer(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!game || paused || modal || game.status !== 'playing') return;
    const bounds = e.currentTarget.getBoundingClientRect(); const x = (e.clientX - bounds.left) * 800 / bounds.width; const y = (e.clientY - bounds.top) * 600 / bounds.height;
    const sun = [...game.suns].reverse().find(s => !s.collected && Math.hypot(s.x - x, s.y - y) < 36);
    if (sun) game.collect(sun.id);
    else game.place(Math.floor((y - GRID.y) / GRID.height), Math.floor((x - GRID.x) / GRID.width));
    setTick(t => t + 1);
  }
  const nextPlant = PLANTS.find(p => p.unlock === level + 1);
  return <main className="pvz-page">
      <div className="game-host" ref={host}>
        <div className="game-stage" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
          {screen === 'menu' && <div className="main-menu">
            <img className="main-logo" src="/pvz/original/logo.png" alt="Plants vs. Zombies" />
            <div className="welcome-sign"><span>WELCOME BACK,</span><strong>Neighbor!</strong><button onClick={() => setModal('help')}>Ready to defend your lawn?</button></div>
            <button className="adventure-image" aria-label="Start Adventure" onClick={() => choose()}><img src={`/pvz/original/${furthest > 1 ? 'SelectorScreen_Adventure_button' : 'SelectorScreen_StartAdventure_Button1'}.png`} alt="Adventure" />{furthest > 1 && <span className="adventure-level" aria-label={`Level 1-${level}`}><span className="stone-digit world-digit" aria-hidden="true" style={{ backgroundPositionX: '-12px' }} /><span className="stone-level-digits" aria-hidden="true">{String(level).split('').map((digit, index) => <span key={index} className="stone-digit" style={{ backgroundPositionX: `${-Number(digit) * 12}px` }} />)}</span></span>}</button>
            <button className="mode-image minigames-image" onClick={() => setModal('locked')} aria-label="Puzzles"><img src="/pvz/original/SelectorScreen_Challenges_button.png" alt="Puzzles" /></button>
            <button className="mode-image survival-image" onClick={() => setModal('locked')} aria-label="Mini-games"><img src="/pvz/original/SelectorScreen_Survival_button.png" alt="Mini-games" /></button>
            <button className="almanac-book" onClick={() => setScreen('almanac')}><img src="/pvz/reference/graphics/Plants/SunFlower/SunFlower_0.png" alt="" /><span>ALMANAC</span></button>
            <div className="menu-bottom"><button onClick={() => setModal('options')}>OPTIONS</button><button onClick={() => setModal('help')}>HELP</button><button onClick={() => setModal('locked')}>MORE WAYS TO PLAY</button></div>
            <span className="menu-version">A little sunshine. A lot of zombies.</span>
          </div>}
          {screen === 'choose' && <div className="choose-scene">
            <div className="seed-bank preview-bank"><span className="sun-count">50</span>{seeds.map(id => <button key={id} onClick={() => toggleSeed(id)} aria-label={`Remove ${plantInfo(id).name}`}><SeedImage id={id} /></button>)}</div>
            <button className="game-menu-btn" onClick={() => setScreen('menu')}>Menu</button>
            <div className="seed-chooser"><h1>{level <= 2 ? 'Ready, set, plant!' : 'Choose your plants!'}</h1><div className="chooser-cards">{PLANTS.map(p => <button key={p.id} className={`${seeds.includes(p.id) ? 'chosen' : ''} ${p.unlock > level ? 'locked-seed' : ''}`} disabled={p.unlock > level} onClick={() => toggleSeed(p.id)} title={`${p.name}: ${p.description}`} aria-label={`${p.name}, ${p.cost} sun${p.unlock > level ? ', locked' : ''}`}><SeedImage id={p.id} />{p.unlock > level && <span className="unlock-label">1–{p.unlock}</span>}</button>)}</div><div className="chooser-explain"><PlantImage id={level === 1 ? 'pea' : 'sunflower'} /><div><h2>{level === 1 ? 'Protect your brains!' : 'A sunny strategy'}</h2><p>{level === 1 ? 'Collect the falling sun. Choose a Peashooter, then click a square on the middle lane.' : 'Start with Sunflowers to produce more sun. Plant attackers in every lane and keep your lawn safe.'}</p></div></div><p className="seed-count">{seeds.length} / 6 seed slots · Level 1–{level}</p><button className="stone-button lets-rock" disabled={!seeds.length} onClick={start}>LET’S ROCK!</button></div>
            <div className="zombie-preview"><h2>YOUR UNINVITED GUESTS</h2>{(['normal', ...(level >= 3 ? ['cone'] : []), ...(level >= 6 ? ['pole'] : []), ...(level >= 8 ? ['bucket'] : [])] as (keyof typeof ZOMBIES)[]).map((kind, i) => { const z = ZOMBIES[kind]; return <img key={kind} style={{ top: 80 + i * 75, left: i % 2 * 55 }} src={ROOT + `Zombies/${z.sprite}/${z.walk}/${z.walk}_0.png`} alt={z.name} />; })}</div>
          </div>}
          {screen === 'battle' && game && <div className="battle-scene">
            <canvas ref={canvas} width={800} height={600} aria-label={`Level 1-${level} lawn. ${game.sun} sun. Select a seed and click a lawn square to plant.`} onPointerDown={pointer} onPointerMove={e => { const b = e.currentTarget.getBoundingClientRect(); const col = Math.floor(((e.clientX - b.left) * 800 / b.width - GRID.x) / 80); const row = Math.floor(((e.clientY - b.top) * 600 / b.height - GRID.y) / 98); setHover(row >= 0 && row < 5 && col >= 0 && col < 9 ? { row, col } : null); }} onPointerLeave={() => setHover(null)} />
            <div className="seed-bank"><span className="sun-count" aria-live="polite">{game.sun}</span>{seeds.map(id => { const p = plantInfo(id); const cooldown = game.cooldown[id] || 0; return <button key={id} className={`seed-packet ${game.selected === id ? 'selected' : ''} ${cooldown > 0 || game.sun < p.cost ? 'unavailable' : ''}`} disabled={paused || Boolean(modal) || game.status !== 'playing'} onClick={() => { game.select(id); setTick(t => t + 1); }} aria-label={`${p.name}, ${p.cost} sun${cooldown > 0 ? `, recharging ${Math.ceil(cooldown)} seconds` : ''}`} title={`${p.name} · ${p.cost} sun`}><SeedImage id={id} />{cooldown > 0 && <span className="cooldown-shade" style={{ height: `${cooldown / p.cooldown * 100}%` }} />}</button>; })}</div>
            {level >= 5 && <button className={`shovel-btn ${game.selected === 'shovel' ? 'selected' : ''}`} aria-label="Shovel: remove a plant" disabled={paused || game.status !== 'playing'} onClick={() => { game.select('shovel'); setTick(t => t + 1); }}><img src="/pvz/original/Shovel.png" alt="Shovel" /></button>}
            <button className="game-menu-btn" onClick={() => setPaused(true)}>Menu</button>
            {game.time < 15 && <div className="tutorial-note">{level === 1 ? 'Click the sunshine! Then plant a Peashooter on the lawn.' : 'Plant Sunflowers first. More sun means more plants!'}</div>}
            {game.messageUntil > game.time && <div className={`wave-message ${game.message.length > 30 ? 'huge-wave' : ''}`}>{game.message}</div>}
            <div className="battle-bottom"><span>Level 1–{level}</span><div className="wave-progress" aria-label={`Wave progress ${Math.round(game.spawned / game.waves.length * 100)} percent`}><div style={{ width: `${game.spawned / game.waves.length * 100}%` }} /><img src={ROOT + 'Screen/LevelProgressZombieHead.png'} alt="" style={{ left: `${game.spawned / game.waves.length * 88}%` }} /><img className="wave-flag" src={ROOT + 'Screen/LevelProgressFlag.png'} alt="Final wave" /></div></div>
            <div className="lawn-controls">{activeRows(level).flatMap(row => Array.from({ length: 9 }, (_, col) => <button className="lawn-cell" style={{ left: GRID.x + col * 80, top: GRID.y + row * 98 }} key={`${row}-${col}`} disabled={paused || Boolean(modal) || game.status !== 'playing'} aria-label={`Plant at row ${row + 1}, column ${col + 1}`} onPointerEnter={() => setHover({ row, col })} onPointerLeave={() => setHover(null)} onClick={() => { game.place(row, col); setTick(t => t + 1); }} />))}{game.suns.filter(s => !s.collected).map(s => <button className="sun-collect-control" style={{ left: s.x - 32, top: s.y - 32 }} key={s.id} disabled={paused || Boolean(modal) || game.status !== 'playing'} aria-label={`Collect sun ${s.id}`} onClick={() => { game.collect(s.id); setTick(t => t + 1); }} />)}</div>
            {game.status !== 'playing' && <div className="game-overlay"><div className="result-panel"><h1>{game.status === 'won' ? 'Your lawn is safe!' : 'The zombies ate your brains!'}</h1>{game.status === 'won' ? <>{nextPlant ? <><p>You got a new plant!</p><img className="reward-card" src={card(nextPlant.id)} alt={nextPlant.name} /><h2>{nextPlant.name}</h2><p>{nextPlant.description}</p></> : <><PlantImage className="result-plant" id="sunflower" /><p>{level === 10 ? 'You completed the daytime recreation! Night and later worlds are not yet available.' : 'Another beautiful day in the neighborhood.'}</p></>}<button className="stone-button" onClick={() => level < 10 ? choose(level + 1) : setScreen('menu')}>{level < 10 ? 'NEXT LEVEL' : 'MAIN MENU'}</button></> : <><p>Your plants fought bravely. Try a little more sunshine.</p><button className="stone-button" onClick={start}>TRY AGAIN</button><button className="text-button" onClick={() => choose()}>Choose different plants</button></>}</div></div>}
          </div>}
          {screen === 'almanac' && <div className="almanac-scene"><button className="game-menu-btn" onClick={() => setScreen('menu')}>Back</button><h1>Suburban Almanac</h1><p>Know your plants. Keep your brains.</p><div className="almanac-plants">{PLANTS.map(p => <article key={p.id} className={p.unlock > furthest ? 'not-unlocked' : ''}><PlantImage id={p.id} /><div><h2>{p.name}</h2><p>{p.description}</p><small>{p.cost} sun · {p.cooldown}s recharge · {p.unlock <= furthest ? 'Unlocked' : `Unlock at 1–${p.unlock}`}</small></div></article>)}</div></div>}
          {(paused || modal) && <div className="game-overlay"><div className="options-panel"><h1>{modal === 'help' ? 'How to Play' : modal === 'locked' ? 'More ways to play' : 'Options'}</h1>{modal === 'help' ? <div className="help-copy"><p>Collect sun, pick a seed packet, and click or tap an empty lawn square. Keep the zombies away from your house!</p><p>Sunflowers make sun. Wall-nuts buy time. Cherry Bombs clear a 3 × 3 area. Each seed needs time to recharge.</p><p><b>1–6</b> select a seed · <b>S</b> shovel · <b>P / Esc</b> pause</p><p>Finish a level to unlock new plants and save your progress. The first ten daytime levels are playable; later worlds and mini-games are not yet recreated.</p></div> : modal === 'locked' ? <div className="help-copy"><p>Adventure is ready for your green thumb.</p><p>Mini-games, Survival, and the later Adventure worlds are not yet recreated. Play through the daytime campaign to meet the plants and zombies.</p></div> : <><label className="option-row"><span>Sound effects</span><input type="checkbox" checked={!muted} onChange={e => setMuted(!e.target.checked)} /></label><label className="option-row"><span>Music</span><input type="checkbox" checked={musicOn} onChange={e => setMusicOn(e.target.checked)} /></label><p className="settings-note">Progress is saved on this device.</p>{screen === 'battle' && <><button className="stone-button small-stone" onClick={start}>RESTART LEVEL</button><button className="stone-button small-stone" onClick={() => { setPaused(false); setModal(null); setScreen('menu'); }}>MAIN MENU</button></>}</>}<button className="stone-button" onClick={() => { setPaused(false); setModal(null); }}>{screen === 'battle' ? 'BACK TO GAME' : 'BACK'}</button></div></div>}
          {saveWarning && <p role="alert" className="save-warning">{saveWarning}</p>}
        </div>
      </div>
  </main>;
}
