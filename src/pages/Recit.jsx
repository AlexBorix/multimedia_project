import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  Headphones,
  Languages,
  MapPin,
  Pause,
  Play,
  Quote,
  RotateCcw,
  Volume2,
  VolumeX,
  WifiOff
} from 'lucide-react';
import { getConteurById, getRecitById, getRecits, getRegions } from '../lib/data';
import SceneIllustration from '../components/SceneIllustration';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const formatTime = (seconds) => {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  return `${Math.floor(safe / 60)}:${String(Math.floor(safe % 60)).padStart(2, '0')}`;
};

const asset = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

const typeLabels = {
  conte: 'Conte',
  legende: 'Légende',
  'recit-historique': 'Récit historique'
};

function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <BookOpen className="h-10 w-10 text-[#d9a441]" />
      <h1 className="mt-5 font-serif text-3xl text-[#efe3cc]">Ce récit est introuvable</h1>
      <p className="mt-2 text-sm text-[#efe3cc]/60">
        Il a peut-être changé de nom, ou la collecte est encore en cours.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#d9a441] px-5 py-3 text-sm font-semibold text-[#12142f] transition hover:bg-[#f5d78e]"
      >
        <ArrowLeft className="h-4 w-4" /> Retour à la carte
      </Link>
    </div>
  );
}

function RecitPlayer({ recit }) {
  const conteur = getConteurById(recit.conteur);
  const region = getRegions().find((item) => item.nom === recit.region);
  const langues = useMemo(() => Object.entries(recit.langues), [recit]);
  const recits = getRecits();
  const currentIndex = recits.findIndex((item) => item.id === recit.id);
  const nextRecit = recits[(currentIndex + 1) % recits.length];

  const [langueId, setLangueId] = useState(langues[0][0]);
  const [sceneId, setSceneId] = useState('debut');
  const [started, setStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState('intro');
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(recit.duree);
  const [ambianceOn, setAmbianceOn] = useState(false);
  const [audioError, setAudioError] = useState(null);

  const audioRef = useRef(null);
  const ambianceRef = useRef(null);
  const stageRef = useRef(null);
  const transcriptRef = useRef(null);
  const activeLineRef = useRef(null);
  const choiceRef = useRef(null);
  const endRef = useRef(null);
  const sceneEndHandledRef = useRef(false);
  const desiredTimeRef = useRef(null);
  const shouldAutoplayRef = useRef(false);
  const togglePlayRef = useRef(() => {});

  const langue = recit.langues[langueId] || langues[0][1];
  const scene = recit.scenes[sceneId] || recit.scenes.debut;

  const sceneSegments = useMemo(
    () => (scene.segments || []).map((index) => langue.segments[index]).filter(Boolean),
    [scene, langue]
  );

  const sceneStart = sceneSegments[0]?.debut ?? 0;
  const sceneEnd = sceneSegments[sceneSegments.length - 1]?.fin ?? 0;
  const sceneDuration = Math.max(0.1, sceneEnd - sceneStart);

  const activeIndex = useMemo(() => {
    if (!sceneSegments.length) return 0;
    const found = sceneSegments.findIndex(
      (segment) => currentTime >= segment.debut && currentTime < segment.fin
    );
    if (found !== -1) return found;
    return currentTime >= sceneEnd ? sceneSegments.length - 1 : 0;
  }, [sceneSegments, currentTime, sceneEnd]);

  const currentSegment = sceneSegments[activeIndex];
  const hasTranslation = Boolean(currentSegment?.fr && currentSegment.fr !== currentSegment.texte);
  const isFrench = langue.nomLangue.toLocaleLowerCase('fr').startsWith('fran');
  const hasAudio = Boolean(langue.audio);
  const illustrationStep = !hasAudio
    ? -1
    : sceneId !== 'debut'
      ? 3
      : Math.min(3, Math.floor((activeIndex * 4) / Math.max(sceneSegments.length, 1)));
  const words = currentSegment?.texte?.split(/\s+/) ?? [];
  const wordProgress = currentSegment
    ? clamp((currentTime - currentSegment.debut) / (currentSegment.fin - currentSegment.debut), 0, 1)
    : 0;
  const activeWordIndex =
    !started || phase !== 'play'
      ? Math.max(0, words.length - 1)
      : Math.min(words.length - 1, Math.floor(wordProgress * words.length));

  const relativeTime = clamp(currentTime - sceneStart, 0, sceneDuration);
  const progressPercent = (relativeTime / sceneDuration) * 100;

  useEffect(() => {
    document.title = `${recit.titre} · Voix du Faso`;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [recit.titre]);

  useEffect(() => {
    if (!started) return;
    const element = activeLineRef.current;
    const list = transcriptRef.current;
    if (!element || !list) return;
    const target = element.offsetTop - list.clientHeight / 2 + element.clientHeight / 2;
    list.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }, [activeIndex, started, sceneId, langueId]);

  useEffect(() => {
    const target = phase === 'choice' ? choiceRef.current : phase === 'ended' ? endRef.current : null;
    if (target) {
      window.setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120);
    }
  }, [phase]);

  useEffect(() => {
    const audio = ambianceRef.current;
    if (!audio) return;
    audio.src = asset(`/media/ambiance/${scene.ambiance}.wav`);
    audio.volume = 0.16;
    audio.loop = true;
    audio.load();
  }, [scene.ambiance]);

  useEffect(() => {
    const audio = ambianceRef.current;
    if (!audio) return;
    if (ambianceOn && started && phase !== 'ended') {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
    return () => audio.pause();
  }, [ambianceOn, started, phase, scene.ambiance]);

  const handleSceneEnd = useCallback(() => {
    if (sceneEndHandledRef.current) return;
    sceneEndHandledRef.current = true;
    audioRef.current?.pause();
    setIsPlaying(false);
    setPhase(scene.choix?.length ? 'choice' : 'ended');
  }, [scene.choix]);

  const playFrom = useCallback((time) => {
    desiredTimeRef.current = time;
    shouldAutoplayRef.current = true;
    setCurrentTime(time);
    const audio = audioRef.current;
    if (!audio) return;
    const attempt = () => {
      try {
        audio.currentTime = time;
      } catch {
        /* le média n’est pas encore prêt */
      }
      audio.play().catch(() => {
        setAudioError('La lecture audio a été bloquée. Appuyez de nouveau sur lecture.');
        setIsPlaying(false);
      });
    };
    if (audio.readyState >= 1) {
      attempt();
    } else {
      audio.addEventListener('loadedmetadata', attempt, { once: true });
    }
  }, []);

  const startStory = () => {
    setStarted(true);
    setPhase('play');
    sceneEndHandledRef.current = false;
    setAudioError(null);
    playFrom(sceneStart);
  };

  const togglePlay = () => {
    if (!started) {
      startStory();
      return;
    }
    if (phase !== 'play') return;
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => setAudioError('La lecture audio a été bloquée par le navigateur.'));
    } else {
      audio.pause();
    }
  };
  useEffect(() => {
    togglePlayRef.current = togglePlay;
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code !== 'Space' || event.repeat) return;
      const tag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tag)) return;
      event.preventDefault();
      togglePlayRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTimeUpdate = (event) => {
    const time = event.currentTarget.currentTime;
    setCurrentTime(time);
    if (time < sceneEnd - 0.15) sceneEndHandledRef.current = false;
    if (time >= sceneEnd - 0.04) handleSceneEnd();
  };

  const handleLoadedMetadata = (event) => {
    const audio = event.currentTarget;
    setAudioDuration(audio.duration || recit.duree);
    if (desiredTimeRef.current != null) {
      const time = desiredTimeRef.current;
      try {
        audio.currentTime = time;
      } catch {
        /* ignore */
      }
      setCurrentTime(time);
      desiredTimeRef.current = null;
    }
    if (shouldAutoplayRef.current) {
      shouldAutoplayRef.current = false;
      audio.play().catch(() => setAudioError('La lecture audio a été bloquée par le navigateur.'));
    }
  };

  const seekTo = (time) => {
    if (!started || phase !== 'play') return;
    const audio = audioRef.current;
    if (!audio) return;
    const next = clamp(time, sceneStart, sceneEnd);
    try {
      audio.currentTime = next;
    } catch {
      return;
    }
    setCurrentTime(next);
    sceneEndHandledRef.current = false;
  };

  const chooseScene = (choice) => {
    const nextScene = recit.scenes[choice.vers];
    if (!nextScene) return;
    const nextSegments = nextScene.segments
      .map((index) => langue.segments[index])
      .filter(Boolean);
    const start = nextSegments[0]?.debut ?? 0;
    sceneEndHandledRef.current = false;
    setSceneId(choice.vers);
    setPhase('play');
    setStarted(true);
    playFrom(start);
  };

  const replay = () => {
    const debut = recit.scenes.debut;
    const firstSegmentIndex = debut.segments[0];
    const start = langue.segments[firstSegmentIndex]?.debut ?? 0;
    sceneEndHandledRef.current = false;
    setSceneId('debut');
    setPhase('play');
    setStarted(true);
    setAudioError(null);
    playFrom(start);
  };

  const switchLanguage = (nextId) => {
    if (nextId === langueId) return;
    const wasPlaying = isPlaying && phase === 'play';
    const target = clamp(currentTime, sceneStart, Math.max(sceneStart, sceneEnd - 0.05));
    desiredTimeRef.current = target;
    shouldAutoplayRef.current = wasPlaying;
    setCurrentTime(target);
    setAudioError(null);
    setLangueId(nextId);
  };

  const handlePointerMove = (event) => {
    if (event.pointerType !== 'mouse' || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const py = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    stageRef.current.style.setProperty('--px', px.toFixed(3));
    stageRef.current.style.setProperty('--py', py.toFixed(3));
  };

  const resetParallax = () => {
    if (!stageRef.current) return;
    stageRef.current.style.setProperty('--px', '0');
    stageRef.current.style.setProperty('--py', '0');
  };

  const isBranching = Boolean(recit.scenes.debut.choix?.length);
  const typeLabel = typeLabels[recit.type] || recit.type;

  return (
    <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-5 sm:px-6 sm:pt-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(55%_60%_at_75%_0%,rgba(217,164,65,0.1),transparent_70%)]" />

      <div className="relative">
        <Link
          to={`/?region=${encodeURIComponent(recit.region)}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#efe3cc]/55 transition hover:text-[#d9a441]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Carte du Faso
          <span className="text-[#efe3cc]/25">/</span>
          <span className="text-[#efe3cc]/40">{recit.region}</span>
        </Link>

        <header className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#d9a441]/35 bg-[#d9a441]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#d9a441]">
                {typeLabel}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#efe3cc]/12 px-3 py-1 text-[10px] text-[#efe3cc]/60">
                <MapPin className="h-3 w-3 text-[#d9a441]" /> {recit.lieu} · {recit.region}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#efe3cc]/12 px-3 py-1 text-[10px] text-[#efe3cc]/60">
                {hasAudio ? (
                  <>
                    <Clock className="h-3 w-3 text-[#d9a441]" /> {formatTime(recit.duree)}
                  </>
                ) : (
                  <>
                    <BookOpen className="h-3 w-3 text-[#d9a441]" /> Texte intégral
                  </>
                )}
              </span>
              {isBranching && (
                <span className="rounded-full border border-[#efe3cc]/12 px-3 py-1 text-[10px] text-[#efe3cc]/60">
                  Récit à embranchements
                </span>
              )}
            </div>
            <h1 className="mt-3 max-w-3xl font-serif text-3xl leading-[1.08] text-[#efe3cc] sm:text-4xl lg:text-5xl">
              {recit.titre}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#efe3cc]/60">{recit.resume}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-full border border-[#efe3cc]/12 bg-[#0f1130]/70 px-3.5 py-2 text-[11px] text-[#efe3cc]/55">
            {hasAudio ? (
              <>
                <WifiOff className="h-3.5 w-3.5 text-[#7fa36b]" />
                Audio embarqué · lisible hors ligne
              </>
            ) : (
              <>
                <BookOpen className="h-3.5 w-3.5 text-[#d9a441]" />
                Narration en attente · texte disponible
              </>
            )}
          </div>
        </header>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
          <div className="order-2 space-y-5 lg:order-1">
            <div
              ref={stageRef}
              onPointerMove={handlePointerMove}
              onPointerLeave={resetParallax}
              className="scene-frame h-[320px] sm:h-[390px] lg:h-[430px]"
            >
              <SceneIllustration
                key={sceneId}
                variant={scene.themeVisuel}
                storyStep={illustrationStep}
                className="absolute inset-0 h-full w-full"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0d20] via-[#0b0d20]/25 to-transparent" />

              <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#efe3cc]/20 bg-[#0b0d20]/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#efe3cc]/80 backdrop-blur">
                    {langue.nomLangue}
                  </span>
                  <span className="rounded-full border border-[#efe3cc]/15 bg-[#0b0d20]/60 px-3 py-1 text-[10px] text-[#efe3cc]/65 backdrop-blur">
                    {sceneId === 'debut' ? (isBranching ? 'Ouverture' : 'Récit') : 'Dénouement'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden rounded-full border border-[#efe3cc]/15 bg-[#0b0d20]/60 px-3 py-1 text-[10px] text-[#efe3cc]/65 backdrop-blur sm:block">
                    {started ? `${formatTime(relativeTime)} / ${formatTime(sceneDuration)}` : formatTime(recit.duree)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAmbianceOn((value) => !value)}
                    aria-pressed={ambianceOn}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold backdrop-blur transition ${
                      ambianceOn
                        ? 'border-[#d9a441]/60 bg-[#d9a441]/20 text-[#f5d78e]'
                        : 'border-[#efe3cc]/15 bg-[#0b0d20]/60 text-[#efe3cc]/65 hover:text-[#efe3cc]'
                    }`}
                  >
                    {ambianceOn ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
                    Ambiance
                  </button>
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                {!started ? (
                  <div className="max-w-xl fade-up">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d9a441]">
                      {region?.chefLieu} · {recit.region}
                    </p>
                    <h2 className="mt-1.5 font-serif text-2xl leading-tight text-white sm:text-3xl">
                      {recit.titre}
                    </h2>
                    <p className="mt-2 text-xs leading-relaxed text-[#efe3cc]/75 sm:text-sm">{scene.description}</p>
                  </div>
                ) : (
                  <div className="max-w-2xl">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d9a441]">
                      {langue.nomLangue} · mot à mot
                    </p>
                    <p className="mt-1.5 font-serif text-lg leading-snug text-white sm:text-xl lg:text-[1.4rem]">
                      {words.map((word, index) => (
                        <span
                          key={`${index}-${word}`}
                          className={`recit-word ${
                            index < activeWordIndex
                              ? 'recit-word--past'
                              : index === activeWordIndex
                                ? 'recit-word--active'
                                : 'recit-word--future'
                          }`}
                        >
                          {word}
                          {index < words.length - 1 ? ' ' : ''}
                        </span>
                      ))}
                    </p>
                    {currentSegment && hasTranslation && (
                      <p className="mt-2 text-xs leading-relaxed text-[#efe3cc]/60 sm:text-sm">
                        {currentSegment.fr}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#efe3cc]/12 bg-[#0f1130]/80 p-4 sm:p-5">
              {!hasAudio ? (
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#d9a441]/35 bg-[#d9a441]/10">
                    <Headphones className="h-5 w-5 text-[#d9a441]" />
                  </span>
                  <div>
                    <p className="font-serif text-lg text-[#efe3cc]">Narration en attente</p>
                    <p className="text-[11px] text-[#efe3cc]/50">
                      Le texte intégral est disponible ci-dessous. La voix du conteur sera ajoutée à la collecte.
                    </p>
                  </div>
                </div>
              ) : !started ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={startStory}
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#d9a441] text-[#12142f] shadow-[0_10px_30px_rgba(217,164,65,0.3)] transition hover:bg-[#f5d78e]"
                      aria-label="Écouter le récit"
                    >
                      <Play className="ml-0.5 h-5 w-5 fill-current" />
                    </button>
                    <div>
                      <p className="font-serif text-lg text-[#efe3cc]">Écouter le récit</p>
                      <p className="text-[11px] text-[#efe3cc]/50">
                        {formatTime(recit.duree)} · {langue.nomLangue}
                        {!isFrench ? ' · traduction française' : ' · narration'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={startStory}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d9a441] px-5 py-2.5 text-xs font-semibold text-[#12142f] transition hover:bg-[#f5d78e] sm:hidden"
                  >
                    <Headphones className="h-4 w-4" /> Commencer
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={togglePlay}
                      disabled={phase !== 'play'}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#d9a441] text-[#12142f] transition hover:bg-[#f5d78e] disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={isPlaying ? 'Mettre en pause' : 'Lire le récit'}
                    >
                      {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-[10px] font-medium text-[#efe3cc]/50">
                        <span className="truncate">
                          {langue.nomLangue} · {sceneId === 'debut' ? 'Ouverture' : 'Dénouement'}
                        </span>
                        <span className="tabular-nums">
                          {formatTime(relativeTime)} / {formatTime(sceneDuration)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={sceneDuration}
                        step={0.05}
                        value={relativeTime}
                        disabled={phase !== 'play'}
                        onChange={(event) => seekTo(Number(event.target.value) + sceneStart)}
                        aria-label="Position dans le récit"
                        className="recit-range mt-2 w-full"
                        style={{
                          background: `linear-gradient(to right, #d9a441 ${progressPercent}%, rgba(239,227,204,0.14) ${progressPercent}%)`
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={replay}
                      aria-label="Recommencer le récit"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#efe3cc]/15 text-[#efe3cc]/55 transition hover:border-[#d9a441]/50 hover:text-[#d9a441]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#efe3cc]/8 pt-3">
                    {langues.length > 1 && (
                      <>
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#efe3cc]/40">
                          <Languages className="h-3.5 w-3.5 text-[#d9a441]" /> Langue
                        </span>
                        {langues.map(([id, value]) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => switchLanguage(id)}
                            aria-pressed={langueId === id}
                            className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                              langueId === id
                                ? 'border-[#d9a441]/60 bg-[#d9a441]/15 text-[#f5d78e]'
                                : 'border-[#efe3cc]/12 text-[#efe3cc]/55 hover:border-[#d9a441]/40 hover:text-[#efe3cc]'
                            }`}
                          >
                            {value.nomLangue}
                          </button>
                        ))}
                      </>
                    )}
                    <span className="ml-auto text-[10px] text-[#efe3cc]/35">
                      {audioDuration > 0 ? 'Audio local' : 'Chargement…'}
                    </span>
                  </div>

                  {audioError && (
                    <p className="mt-3 rounded-lg border border-[#c4512f]/30 bg-[#c4512f]/10 px-3 py-2 text-[11px] text-[#e7a08d]">
                      {audioError} La transcription reste disponible ci-dessous.
                    </p>
                  )}
                </>
              )}
            </div>

            {phase === 'choice' && scene.choix && (
              <div
                ref={choiceRef}
                className="rounded-2xl border border-[#d9a441]/35 bg-[linear-gradient(160deg,rgba(217,164,65,0.1),rgba(15,17,48,0.95))] p-5 fade-up"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d9a441]">
                  À vous de choisir
                </p>
                <h2 className="mt-1.5 font-serif text-xl text-[#efe3cc] sm:text-2xl">{scene.question}</h2>
                <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {scene.choix.map((choice, index) => (
                    <button
                      key={choice.vers}
                      type="button"
                      onClick={() => chooseScene(choice)}
                      className="group flex items-start gap-3 rounded-xl border border-[#efe3cc]/15 bg-[#0b0d20]/60 p-4 text-left transition hover:border-[#d9a441]/60 hover:bg-[#0b0d20]"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#d9a441]/40 bg-[#d9a441]/10 font-serif text-sm text-[#f5d78e]">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-snug text-[#efe3cc]">
                          {choice.libelle.replace(/^[A-Z]\.\s*/, '')}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-[#efe3cc]/50">{choice.sousTitre}</span>
                      </span>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#d9a441] transition group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {phase === 'ended' && (
              <div
                ref={endRef}
                className="rounded-2xl border border-[#d9a441]/35 bg-[linear-gradient(160deg,rgba(168,90,50,0.16),rgba(15,17,48,0.95))] p-5 fade-up sm:p-6"
              >
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d9a441]">
                  <BookOpen className="h-3.5 w-3.5" /> Fin du récit
                </p>
                <h2 className="mt-1.5 font-serif text-2xl text-[#efe3cc]">{scene.titreFin}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#efe3cc]/70">{scene.fin}</p>
                <blockquote className="mt-4 border-l-2 border-[#d9a441] pl-4 font-serif text-base italic text-[#f5d78e]">
                  « {scene.morale} »
                </blockquote>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={replay}
                    className="inline-flex items-center gap-2 rounded-full bg-[#d9a441] px-4 py-2.5 text-xs font-semibold text-[#12142f] transition hover:bg-[#f5d78e]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Rejouer
                  </button>
                  <Link
                    to={`/?region=${encodeURIComponent(recit.region)}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[#efe3cc]/20 px-4 py-2.5 text-xs font-semibold text-[#efe3cc]/80 transition hover:border-[#d9a441]/50 hover:text-[#f5d78e]"
                  >
                    <MapPin className="h-3.5 w-3.5" /> Explorer la région
                  </Link>
                  {nextRecit && nextRecit.id !== recit.id && (
                    <Link
                      to={`/recit/${nextRecit.id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-[#efe3cc]/20 px-4 py-2.5 text-xs font-semibold text-[#efe3cc]/80 transition hover:border-[#d9a441]/50 hover:text-[#f5d78e]"
                    >
                      Récit suivant <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            )}

            <section className="overflow-hidden rounded-2xl border border-[#efe3cc]/12 bg-[#0f1130]/70">
              <div className="flex items-center justify-between gap-3 border-b border-[#efe3cc]/10 px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d9a441]">
                    Transcription
                  </p>
                  <h2 className="mt-0.5 font-serif text-lg text-[#efe3cc]">Le récit, mot à mot</h2>
                </div>
                <span className="hidden rounded-full border border-[#efe3cc]/12 px-2.5 py-1 text-[10px] text-[#efe3cc]/55 sm:block">
                  {isFrench ? 'Texte intégral' : `${langue.nomLangue} → Français`}
                </span>
              </div>

              <div ref={transcriptRef} className="relative max-h-[330px] overflow-y-auto px-3 py-3">
                <div className="space-y-1">
                  {sceneSegments.map((segment, index) => {
                    const active = index === activeIndex;
                    return (
                      <button
                        key={`${sceneId}-${segment.debut}-${index}`}
                        type="button"
                        ref={active ? activeLineRef : null}
                        onClick={() => seekTo(segment.debut)}
                        disabled={!started || phase !== 'play'}
                        className={`w-full rounded-xl border px-3.5 py-3 text-left transition ${
                          active
                            ? 'border-[#d9a441]/40 bg-[#d9a441]/8'
                            : 'border-transparent hover:border-[#efe3cc]/10 hover:bg-[#efe3cc]/4'
                        } disabled:cursor-default`}
                      >
                        <div className="flex items-start gap-3">
                          {hasAudio && (
                            <span
                              className={`mt-0.5 shrink-0 font-mono text-[10px] tabular-nums ${
                                active ? 'text-[#d9a441]' : 'text-[#efe3cc]/30'
                              }`}
                            >
                              {formatTime(segment.debut)}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm leading-relaxed ${
                                active ? 'text-[#efe3cc]' : 'text-[#efe3cc]/55'
                              }`}
                            >
                              {segment.texte}
                            </p>
                            {active && segment.fr && segment.fr !== segment.texte && (
                              <p className="mt-1.5 text-xs leading-relaxed text-[#efe3cc]/50 fade-up">
                                {segment.fr}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-[#efe3cc]/8 px-5 py-3 text-[10px] text-[#efe3cc]/35">
                {!hasAudio
                  ? 'Narration en attente. Le texte intégral reste disponible et sera synchronisé avec la voix du conteur.'
                  : started
                    ? 'Le texte s’illumine au rythme de la voix. Touchez une ligne pour y revenir.'
                    : isFrench
                      ? 'Lancez l’écoute pour synchroniser le texte et la narration.'
                      : 'Lancez l’écoute pour synchroniser le texte et la traduction.'}
              </div>
            </section>
          </div>

          <aside className="order-1 space-y-5 lg:order-2">
            <div className="rounded-3xl border border-[#efe3cc]/12 bg-[#0f1130]/80 p-5 sm:p-6 lg:sticky lg:top-20">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d9a441]">La source</p>

              <div className="mt-4 flex items-center gap-4">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-[#d9a441]/35 bg-[radial-gradient(circle_at_30%_25%,rgba(217,164,65,0.3),rgba(217,164,65,0.06))] font-serif text-2xl text-[#f5d78e]">
                  {conteur?.initiale}
                </span>
                <div className="min-w-0">
                  <h2 className="font-serif text-xl leading-tight text-[#efe3cc]">{conteur?.nom}</h2>
                  <p className="mt-0.5 text-xs text-[#efe3cc]/50">
                    {conteur?.village} · {conteur?.region}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-[#efe3cc]/65">{conteur?.bio}</p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-[#efe3cc]/12 px-2.5 py-1 text-[10px] text-[#efe3cc]/60">
                  <Languages className="h-3 w-3 text-[#d9a441]" /> {conteur?.langue}
                </span>
                <span className="rounded-full border border-[#efe3cc]/12 px-2.5 py-1 text-[10px] text-[#efe3cc]/60">
                  {conteur?.licence}
                </span>
              </div>

              <div className="mt-5 space-y-2 border-t border-[#efe3cc]/10 pt-4 text-[11px] text-[#efe3cc]/50">
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d9a441]" />
                  Récit associé à {recit.lieu}, région du {recit.region}.
                </p>
                <p className="flex items-start gap-2">
                  <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d9a441]" />
                  {hasAudio
                    ? 'Narration de démonstration : elle sera remplacée par une voix de conteur lors de la collecte.'
                    : 'Le texte français est prêt ; la narration en langue locale sera ajoutée après la collecte.'}
                </p>
              </div>

            </div>

            <div className="rounded-3xl border border-[#7fa36b]/20 bg-[#7fa36b]/6 p-5">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a9c496]">
                <WifiOff className="h-3.5 w-3.5" /> Hors ligne
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#efe3cc]/55">
                Une fois cette page ouverte, le récit, sa carte et ses illustrations restent accessibles sans réseau.
              </p>
            </div>
          </aside>
        </div>
      </div>

      <audio
        key={langueId}
        ref={audioRef}
        src={langue.audio ? asset(langue.audio) : undefined}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleSceneEnd}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => setAudioError('Le fichier audio n’a pas pu être chargé.')}
      />
      <audio ref={ambianceRef} loop preload="none" aria-hidden="true" />
    </div>
  );
}

export default function Recit() {
  const { id } = useParams();
  const recit = getRecitById(id);
  if (!recit) return <NotFound />;
  return <RecitPlayer key={recit.id} recit={recit} />;
}
