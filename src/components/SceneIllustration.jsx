import React, { useId } from 'react';
import './scene.css';

const PALETTES = {
  'savane-seche': {
    label: 'Savane sèche au pied d’un baobab, près de Ouagadougou',
    sky: ['#f3c985', '#c9783c'],
    sun: '#fbe7b0',
    cloud: '#f7dfb5',
    hillFar: '#b67545',
    hillMid: '#8d4f2c',
    ground: '#6b351c',
    tree: '#2b170d',
    pattern: '#5a2d16',
    water: '#6f8fa8',
    accent: '#d9a441'
  },
  'pluie-abondante': {
    label: 'Pluie bienfaisante sur la savane et le baobab',
    sky: ['#4a5a72', '#1f2a3d'],
    sun: '#c9d6e2',
    cloud: '#38445a',
    hillFar: '#3f5a45',
    hillMid: '#2f4a35',
    ground: '#1b2a1b',
    tree: '#111b11',
    pattern: '#243a26',
    water: '#7fa3b8',
    accent: '#d9a441'
  },
  'harmattan-vent': {
    label: 'Vent d’Harmattan et poussière sur la savane',
    sky: ['#d8b48c', '#a86b45'],
    sun: '#e8c9a0',
    cloud: '#e3c39a',
    hillFar: '#8a5331',
    hillMid: '#5f3820',
    ground: '#4a2a18',
    tree: '#241209',
    pattern: '#6b3a22',
    water: '#8a6a4a',
    accent: '#d9a441'
  },
  'mosquee-banco': {
    label: 'Vieille mosquée de Bobo-Dioulasso au crépuscule',
    sky: ['#e8b06a', '#a85a32'],
    sun: '#f7d9a0',
    cloud: '#f0c893',
    hillFar: '#8d4f2c',
    hillMid: '#6b3a22',
    ground: '#5a2f1a',
    tree: '#3a1d10',
    pattern: '#7a4526',
    water: '#8a6a4a',
    accent: '#d9a441'
  },
  fleuve: {
    label: 'Le fleuve Mouhoun traversant la savane',
    sky: ['#f0c98a', '#c98a52'],
    sun: '#fbe7b0',
    cloud: '#f7dfb5',
    hillFar: '#a86b3f',
    hillMid: '#7d4a28',
    ground: '#5c341c',
    tree: '#2b170d',
    pattern: '#5a2d16',
    water: '#4c7d8a',
    accent: '#d9a441'
  },
  desert: {
    label: 'Dunes du Sahel et caravane au crépuscule',
    sky: ['#e7c18a', '#c98f55'],
    sun: '#fbe3b0',
    cloud: '#f2d4a6',
    hillFar: '#c98f55',
    hillMid: '#a86b3f',
    ground: '#8a5331',
    tree: '#3a2414',
    pattern: '#8a5331',
    water: '#8a6a4a',
    accent: '#d9a441'
  }
};

function Baobab({ color, x = 0, y = 0, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill={color}>
      <path d="M-22 130 C-18 82 -16 40 -18 0 L18 0 C20 40 22 82 22 130 Z" />
      <g stroke={color} strokeWidth="13" strokeLinecap="round" fill="none">
        <path d="M0 0 C-8 -34 -30 -54 -62 -70" />
        <path d="M4 0 C20 -38 46 -58 80 -72" />
        <path d="M0 0 C-2 -48 2 -70 0 -92" />
        <path d="M-4 -18 C-30 -38 -50 -44 -72 -42" />
        <path d="M8 -22 C34 -44 56 -50 72 -46" />
        <path d="M-2 122 C-30 128 -44 134 -52 142" strokeWidth="9" />
        <path d="M8 124 C32 130 46 136 54 144" strokeWidth="9" />
      </g>
      <g opacity="0.96">
        <circle cx="-64" cy="-74" r="22" />
        <circle cx="82" cy="-76" r="25" />
        <circle cx="0" cy="-96" r="20" />
        <circle cx="46" cy="-80" r="17" />
        <circle cx="-78" cy="-46" r="14" />
        <circle cx="76" cy="-48" r="13" />
      </g>
      <g opacity="0.35" fill="#ffffff">
        <circle cx="-70" cy="-80" r="7" />
        <circle cx="76" cy="-82" r="8" />
        <circle cx="4" cy="-102" r="6" />
      </g>
    </g>
  );
}

function Cloud({ x, y, scale = 1, color, slow = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className={slow ? 'scene-cloud scene-cloud--slow' : 'scene-cloud'} opacity="0.85">
        <ellipse cx="0" cy="0" rx="42" ry="16" fill={color} />
        <ellipse cx="26" cy="-8" rx="30" ry="18" fill={color} />
        <ellipse cx="-28" cy="-4" rx="24" ry="14" fill={color} />
      </g>
    </g>
  );
}

function Huts({ color, accent }) {
  return (
    <g fill={color}>
      <g transform="translate(170 360) scale(0.9)">
        <path d="M-26 0 L0 -34 L26 0 Z" fill={accent} opacity="0.55" />
        <rect x="-18" y="0" width="36" height="30" />
      </g>
      <g transform="translate(240 372) scale(0.7)">
        <path d="M-26 0 L0 -34 L26 0 Z" fill={accent} opacity="0.45" />
        <rect x="-18" y="0" width="36" height="26" />
      </g>
      <g transform="translate(620 366) scale(0.85)">
        <path d="M-26 0 L0 -34 L26 0 Z" fill={accent} opacity="0.5" />
        <rect x="-18" y="0" width="36" height="28" />
      </g>
    </g>
  );
}

function Mosque({ color, accent }) {
  return (
    <g transform="translate(520 352) scale(1.15)" fill={color}>
      <rect x="-86" y="-60" width="172" height="62" />
      <rect x="-30" y="-134" width="60" height="136" />
      <path d="M-38 -134 Q0 -176 38 -134 Z" />
      <rect x="-72" y="-98" width="20" height="100" />
      <path d="M-82 -98 Q-62 -124 -42 -98 Z" />
      <rect x="52" y="-98" width="20" height="100" />
      <path d="M42 -98 Q62 -124 82 -98 Z" />
      <g fill={accent} opacity="0.55">
        <rect x="-84" y="-64" width="168" height="4" />
        <rect x="-28" y="-138" width="56" height="4" />
        <path d="M-12 -60 L0 -78 L12 -60 Z" />
        <rect x="-62" y="-38" width="10" height="26" rx="5" />
        <rect x="-30" y="-38" width="10" height="26" rx="5" />
        <rect x="20" y="-38" width="10" height="26" rx="5" />
        <rect x="52" y="-38" width="10" height="26" rx="5" />
      </g>
      <g stroke={color} strokeWidth="4" fill="none" opacity="0.9">
        <path d="M-86 -30 L86 -30" />
        <path d="M-86 -16 L86 -16" />
      </g>
    </g>
  );
}

function Palm({ x, y, scale = 1, color }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} stroke={color} fill="none" strokeLinecap="round">
      <path d="M0 0 C-4 -30 -2 -60 4 -88" strokeWidth="7" />
      <g strokeWidth="5">
        <path d="M4 -88 C-24 -100 -40 -92 -52 -78" />
        <path d="M4 -88 C28 -104 44 -96 56 -82" />
        <path d="M4 -88 C-8 -114 -2 -128 10 -136" />
        <path d="M4 -88 C20 -116 34 -120 44 -118" />
      </g>
    </g>
  );
}

function Camel({ x, y, scale = 1, color, delay = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className="scene-camel" style={{ animationDelay: `${delay}s` }}>
      <g fill={color}>
        <ellipse cx="0" cy="0" rx="20" ry="9" />
        <path d="M-10 -6 Q-4 -20 2 -6 Z" />
        <path d="M2 -6 Q8 -18 14 -6 Z" />
        <path d="M18 -3 C24 -10 26 -16 30 -18 L33 -14 C29 -10 27 -4 26 2 Z" />
        <rect x="-14" y="6" width="4" height="14" />
        <rect x="-4" y="6" width="4" height="14" />
        <rect x="8" y="6" width="4" height="14" />
        <rect x="16" y="6" width="4" height="14" />
      </g>
      <path d="M-20 -1 L-26 -4" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

export default function SceneIllustration({
  variant = 'savane-seche',
  animated = true,
  storyStep = -1,
  className = ''
}) {
  const uid = useId().replace(/[:]/g, '');
  const p = PALETTES[variant] || PALETTES['savane-seche'];
  const rainy = variant === 'pluie-abondante';
  const dusty = variant === 'harmattan-vent' || variant === 'desert';
  const isDesert = variant === 'desert';
  const isMosque = variant === 'mosquee-banco';
  const isRiver = variant === 'fleuve';

  const rain = Array.from({ length: 64 }, (_, i) => ({
    x: (i * 137 + 40) % 820,
    y: (i * 89) % 450,
    delay: ((i * 53) % 100) / 100,
    duration: 0.55 + ((i * 17) % 40) / 100
  }));

  const dust = Array.from({ length: 26 }, (_, i) => ({
    x: (i * 173) % 760,
    y: 260 + ((i * 61) % 170),
    r: 1.5 + ((i * 7) % 5) / 2,
    delay: ((i * 37) % 100) / 12,
    duration: 4 + ((i * 11) % 30) / 10
  }));

  return (
    <div
      className={`scene-illustration ${animated ? '' : 'scene-paused'} ${
        variant === 'mosquee-banco'
          ? `guimbi-scene ${storyStep < 0 ? 'guimbi-scene--auto' : `guimbi-scene--${storyStep}`}`
          : ''
      } ${className}`}
    >
      <svg
        viewBox="0 0 800 450"
        role="img"
        aria-label={
          variant === 'mosquee-banco'
            ? `${p.label}. Illustration symbolique de Guimbi Ouattara et Samori Touré, avec une scène de négociation.`
            : p.label
        }
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.sky[0]} />
            <stop offset="100%" stopColor={p.sky[1]} />
          </linearGradient>
          <linearGradient id={`ground-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.ground} />
            <stop offset="100%" stopColor={p.tree} />
          </linearGradient>
          <radialGradient id={`sun-${uid}`}>
            <stop offset="0%" stopColor={p.sun} stopOpacity="0.95" />
            <stop offset="45%" stopColor={p.sun} stopOpacity="0.35" />
            <stop offset="100%" stopColor={p.sun} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`vignette-${uid}`} cx="50%" cy="44%" r="78%">
            <stop offset="55%" stopColor="#0b0d20" stopOpacity="0" />
            <stop offset="100%" stopColor="#0b0d20" stopOpacity="0.62" />
          </radialGradient>
          <pattern id={`dots-${uid}`} width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill={p.pattern} opacity="0.35" />
            <circle cx="11" cy="9" r="1.2" fill={p.pattern} opacity="0.2" />
          </pattern>
          <clipPath id={`clip-${uid}`}>
            <rect width="800" height="450" />
          </clipPath>
        </defs>

        <g clipPath={`url(#clip-${uid})`}>
          <rect width="800" height="450" fill={`url(#sky-${uid})`} />

          <g className="scene-layer layer-far">
            <g className={animated ? 'scene-sun' : undefined}>
              <circle cx={isDesert ? 560 : 630} cy={isDesert ? 118 : 104} r={isDesert ? 110 : 88} fill={`url(#sun-${uid})`} />
              <circle cx={isDesert ? 560 : 630} cy={isDesert ? 118 : 104} r={isDesert ? 34 : 26} fill={p.sun} opacity="0.92" />
            </g>
            <Cloud x={150} y={86} scale={1.05} color={p.cloud} />
            <Cloud x={360} y={54} scale={0.75} color={p.cloud} slow />
            <Cloud x={isMosque ? 210 : 690} y={isMosque ? 60 : 130} scale={0.9} color={p.cloud} slow />
            <g stroke={p.tree} strokeWidth="2.4" fill="none" opacity="0.55" className={animated ? 'scene-bird' : undefined}>
              <path d="M0 0 Q5 -5 10 0" />
              <path d="M16 6 Q20 2 24 6" />
              <path d="M32 -2 Q36 -6 40 -2" />
            </g>
          </g>

          <g className="scene-layer layer-mid">
            {isDesert ? (
              <>
                <path d="M0 300 C130 262 240 320 360 292 C500 258 640 316 800 288 L800 450 L0 450 Z" fill={p.hillFar} opacity="0.85" />
                <path d="M0 342 C150 306 270 366 430 336 C580 308 690 358 800 334 L800 450 L0 450 Z" fill={p.hillMid} opacity="0.95" />
              </>
            ) : (
              <>
                <path d="M0 302 C120 262 220 302 340 282 C470 260 560 302 680 278 C740 266 780 272 800 282 L800 450 L0 450 Z" fill={p.hillFar} opacity="0.9" />
                <path d="M0 336 C120 306 230 342 360 322 C490 302 600 342 720 318 C760 310 785 314 800 320 L800 450 L0 450 Z" fill={p.hillMid} opacity="0.95" />
              </>
            )}
          </g>

          <g className="scene-layer layer-near">
            {isMosque && <Mosque color={p.hillMid} accent={p.accent} />}
            {isMosque && (
              <>
                <Palm x={330} y={392} scale={1.05} color={p.tree} />
                <Palm x={700} y={404} scale={0.9} color={p.tree} />
                <g className="guimbi-figures" aria-hidden="true">
                  <g className="guimbi-figure guimbi-figure--princess">
                    <g transform="translate(270 352)">
                      <path d="M-19 0 Q0 -10 19 0 L28 52 L-28 52 Z" fill="#d9a441" />
                      <path d="M-13 3 Q0 -7 13 3 L18 35 L-18 35 Z" fill="#f3c985" opacity="0.8" />
                      <circle cx="0" cy="-13" r="13" fill="#3a1d10" />
                      <path d="M-17 -15 Q0 -39 17 -15 L13 -6 Q0 -13 -13 -6 Z" fill="#d9a441" />
                      <path d="M8 14 Q27 4 38 14" fill="none" stroke="#f3c985" strokeWidth="5" strokeLinecap="round" />
                    </g>
                  </g>
                  <g className="guimbi-figure guimbi-figure--leader">
                    <g transform="translate(530 352)">
                      <path d="M-21 0 Q0 -12 21 0 L31 52 L-31 52 Z" fill="#252b4c" />
                      <path d="M-14 3 Q0 -5 14 3 L20 34 L-20 34 Z" fill="#7780a4" opacity="0.75" />
                      <circle cx="0" cy="-13" r="13" fill="#3a1d10" />
                      <path d="M-18 -14 Q-10 -34 0 -29 Q12 -35 19 -14 L13 -7 Q0 -14 -13 -7 Z" fill="#efe3cc" />
                      <path d="M-8 14 Q-27 4 -38 14" fill="none" stroke="#efe3cc" strokeWidth="5" strokeLinecap="round" />
                    </g>
                  </g>
                  <g className="guimbi-pact">
                    <circle cx="400" cy="320" r="25" fill="#0b0d20" fillOpacity="0.82" stroke="#f5d78e" strokeOpacity="0.8" />
                    <path d="M387 321 L397 331 L415 309" fill="none" stroke="#f5d78e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                </g>
              </>
            )}
            {isRiver && (
              <>
                <path d="M0 352 C150 326 260 384 420 354 C560 328 680 376 800 350 L800 414 C660 438 540 396 400 420 C260 444 140 396 0 420 Z" fill={p.water} opacity="0.92" />
                <g stroke="#cfe6ea" strokeWidth="2" fill="none" opacity="0.55" className={animated ? 'scene-water' : undefined}>
                  <path d="M40 380 C90 372 130 388 180 380" />
                  <path d="M230 400 C280 392 320 408 370 400" />
                  <path d="M470 386 C520 378 560 394 610 386" />
                  <path d="M650 406 C700 398 740 414 790 406" />
                </g>
                <Baobab color={p.tree} x={150} y={318} scale={0.72} />
                <Huts color={p.hillMid} accent={p.accent} />
              </>
            )}
            {isDesert && (
              <>
                <g className={animated ? 'scene-camel' : undefined} style={{ animationDelay: '0.4s' }}>
                  <Camel x={300} y={370} scale={0.9} color={p.tree} delay={0.2} />
                </g>
                <Camel x={360} y={382} scale={0.8} color={p.tree} delay={0.9} />
                <Camel x={414} y={392} scale={0.7} color={p.tree} delay={1.4} />
                <g stroke={p.tree} strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.8">
                  <path d="M660 392 C658 372 660 356 666 344" />
                  <path d="M666 344 C650 338 640 344 632 352" />
                  <path d="M666 344 C682 336 692 342 700 350" />
                  <path d="M666 344 C666 328 672 320 680 316" />
                </g>
              </>
            )}
            {!isMosque && !isRiver && !isDesert && (
              <>
                <Baobab color={p.tree} x={520} y={338} scale={rainy ? 1.05 : 1} />
                <Huts color={p.hillMid} accent={p.accent} />
              </>
            )}
            {!isMosque && !isRiver && !isDesert && rainy && (
              <g fill={p.water} opacity="0.5">
                <ellipse cx="250" cy="408" rx="62" ry="8" />
                <ellipse cx="430" cy="424" rx="48" ry="6" />
                <ellipse cx="640" cy="414" rx="40" ry="5" />
              </g>
            )}
          </g>

          <g className="scene-layer layer-near">
            <path d="M0 386 C140 358 260 398 400 380 C540 362 660 398 800 378 L800 450 L0 450 Z" fill={`url(#ground-${uid})`} />
          </g>

          <g opacity="0.85">
            <g className={animated ? 'scene-grass' : undefined} stroke={p.accent} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.55">
              <path d="M70 430 C66 416 62 410 56 404" />
              <path d="M78 432 C80 416 84 408 92 400" />
              <path d="M700 436 C696 420 690 412 682 406" />
              <path d="M710 438 C714 422 720 414 728 408" />
            </g>
          </g>

          {rainy && (
            <g className="scene-rain" stroke="#d7e6f2" strokeWidth="1.4" opacity="0.65">
              {rain.map((drop, i) => (
                <line
                  key={i}
                  x1={drop.x}
                  y1={drop.y}
                  x2={drop.x - 3}
                  y2={drop.y + 16}
                  style={animated ? { animationDelay: `-${drop.delay}s`, animationDuration: `${drop.duration}s` } : undefined}
                />
              ))}
            </g>
          )}

          {dusty && (
            <g className="scene-dust" fill={p.sun} opacity="0.5">
              {dust.map((mote, i) => (
                <circle
                  key={i}
                  cx={mote.x}
                  cy={mote.y}
                  r={mote.r}
                  style={animated ? { animationDelay: `-${mote.delay}s`, animationDuration: `${mote.duration}s` } : undefined}
                />
              ))}
            </g>
          )}

          <rect width="800" height="450" fill={`url(#dots-${uid})`} opacity="0.55" />
          <rect width="800" height="450" fill={`url(#vignette-${uid})`} />
        </g>
      </svg>
    </div>
  );
}
