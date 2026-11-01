import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Download,
  Info,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  Target,
  Trash2,
  Upload
} from 'lucide-react';

const round = (value) => Math.round(value * 100) / 100;

const formatClock = (seconds) => {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${rest.toFixed(2).padStart(5, '0')}`;
};

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'recit';

const waves = Array.from({ length: 64 }, (_, index) => 18 + Math.abs(Math.sin(index * 1.37)) * 62);

const languageNames = {
  francais: 'Français',
  moore: 'Mooré',
  dioula: 'Dioula',
  fulfulde: 'Fulfulde'
};

export default function Horodatage() {
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);
  const [audioSrc, setAudioSrc] = useState('');
  const [audioName, setAudioName] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [titre, setTitre] = useState('Nouveau récit');
  const [langue, setLangue] = useState('francais');
  const [segments, setSegments] = useState([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = 'Atelier d’horodatage · Voix du Faso';
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code !== 'Space') return;
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(event.target.tagName)) return;
      const audio = audioRef.current;
      if (!audio || !audioSrc) return;
      event.preventDefault();
      if (audio.paused) {
        audio.play().catch(() => setError('La lecture a été bloquée par le navigateur.'));
      } else {
        audio.pause();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [audioSrc]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const warnings = useMemo(() => {
    const list = [];
    segments.forEach((segment, index) => {
      if (segment.fin <= segment.debut) {
        list.push(`Segment ${index + 1} : la fin doit être après le début.`);
      }
      if (!segment.texte.trim()) {
        list.push(`Segment ${index + 1} : le texte original est vide.`);
      }
      if (!segment.fr.trim()) {
        list.push(`Segment ${index + 1} : la traduction est vide.`);
      }
    });
    const sorted = [...segments].sort((a, b) => a.debut - b.debut);
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i].debut < sorted[i - 1].fin - 0.001) {
        list.push('Deux segments se chevauchent. Ajustez les bornes.');
        break;
      }
    }
    return list;
  }, [segments]);

  const exportData = useMemo(() => {
    const extension = audioName.match(/\.[a-z0-9]+$/i)?.[0] || '.wav';
    return {
      id: slugify(titre),
      titre,
      duree: duration || segments[segments.length - 1]?.fin || 0,
      langues: {
        [langue]: {
          nomLangue: languageNames[langue],
          audio: audioSrc.startsWith('blob:') ? `${slugify(titre)}${extension}` : audioSrc,
          segments: segments
            .slice()
            .sort((a, b) => a.debut - b.debut)
            .map((segment) => ({
              debut: Number(segment.debut),
              fin: Number(segment.fin),
              texte: segment.texte.trim(),
              fr: segment.fr.trim()
            }))
        }
      }
    };
  }, [titre, langue, audioName, audioSrc, duration, segments]);

  const loadFile = (file) => {
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setAudioSrc(url);
    setAudioName(file.name);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setError(null);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;
    if (audio.paused) {
      audio.play().catch(() => setError('La lecture a été bloquée par le navigateur.'));
    } else {
      audio.pause();
    }
  };

  const seek = (time) => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;
    const next = Math.max(0, Math.min(duration || 0, time));
    try {
      audio.currentTime = next;
    } catch {
      return;
    }
    setCurrentTime(next);
  };

  const addSegment = () => {
    const previous = segments[segments.length - 1];
    const start = previous ? previous.fin : 0;
    const end = duration > 0 ? Math.min(duration, start + 4) : start + 4;
    setSegments([
      ...segments,
      {
        debut: round(start),
        fin: round(Math.max(start + 0.5, end)),
        texte: '',
        fr: ''
      }
    ]);
  };

  const updateSegment = (index, field, value) => {
    setSegments((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    );
  };

  const removeSegment = (index) => {
    setSegments((items) => items.filter((_, itemIndex) => itemIndex !== index));
  };

  const anchorSegmentToPlayhead = (index) => {
    if (!duration) return;
    updateSegment(index, 'debut', round(currentTime));
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Le presse-papiers n’est pas disponible. Utilisez l’export JSON.');
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slugify(titre)}-segments.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#efe3cc]/55 transition hover:text-[#d9a441]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour à la carte
      </Link>
      <header className="mt-4 max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#d9a441]/30 bg-[#d9a441]/10 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d9a441]">
          <Clock className="h-3.5 w-3.5" /> Atelier interne
        </span>
        <h1 className="mt-5 font-serif text-4xl leading-tight text-[#efe3cc] sm:text-5xl">Horodatage des récits</h1>
        <p className="mt-4 text-base leading-relaxed text-[#efe3cc]/60">
          Chargez une piste audio, découpez-la en segments et saisissez la transcription avec sa traduction. L’outil
          produit un bloc de langue à fusionner dans la fiche du récit. Aucun fichier n’est envoyé sur un serveur.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-[#efe3cc]/12 bg-[#0f1130]/80 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d9a441]">Source audio</p>
                <p className="mt-1 text-xs text-[#efe3cc]/50">
                  {audioName || 'Aucune piste chargée pour le moment.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#d9a441] px-4 py-2 text-xs font-semibold text-[#12142f] transition hover:bg-[#f5d78e]">
                  <Upload className="h-3.5 w-3.5" /> Choisir un fichier
                  <input
                    type="file"
                    accept="audio/*"
                    className="sr-only"
                    onChange={(event) => loadFile(event.target.files?.[0])}
                  />
                </label>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[#efe3cc]/10 bg-[#0b0d20]/50 p-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  disabled={!audioSrc}
                  aria-label={isPlaying ? 'Pause' : 'Lecture'}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#d9a441] text-[#12142f] transition hover:bg-[#f5d78e] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex h-10 items-end gap-[2px]" aria-hidden="true">
                    {waves.map((height, index) => {
                      const reached = (index / waves.length) * 100 <= progress;
                      return (
                        <span
                          key={index}
                          className={`flex-1 rounded-sm transition-colors ${reached ? 'bg-[#d9a441]' : 'bg-[#efe3cc]/15'}`}
                          style={{ height: `${height}%` }}
                        />
                      );
                    })}
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.01}
                    value={currentTime}
                    onChange={(event) => seek(Number(event.target.value))}
                    aria-label="Position dans la piste"
                    className="recit-range mt-2 w-full"
                    style={{
                      background: `linear-gradient(to right, #d9a441 ${progress}%, rgba(239,227,204,0.14) ${progress}%)`
                    }}
                  />
                </div>

                <div className="text-right">
                  <p className="font-mono text-sm tabular-nums text-[#efe3cc]">{formatClock(currentTime)}</p>
                  <p className="font-mono text-[10px] tabular-nums text-[#efe3cc]/35">{formatClock(duration)}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#efe3cc]/8 pt-3">
                <button
                  type="button"
                  onClick={() => seek(currentTime - 1)}
                  disabled={!audioSrc}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#efe3cc]/15 px-3 py-1.5 text-[11px] text-[#efe3cc]/65 transition hover:text-[#efe3cc] disabled:opacity-30"
                >
                  <RotateCcw className="h-3 w-3" /> −1 s
                </button>
                <button
                  type="button"
                  onClick={() => seek(currentTime + 1)}
                  disabled={!audioSrc}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#efe3cc]/15 px-3 py-1.5 text-[11px] text-[#efe3cc]/65 transition hover:text-[#efe3cc] disabled:opacity-30"
                >
                  +1 s
                </button>
                <button
                  type="button"
                  onClick={addSegment}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#d9a441]/45 bg-[#d9a441]/10 px-3 py-1.5 text-[11px] font-semibold text-[#f5d78e] transition hover:bg-[#d9a441] hover:text-[#12142f]"
                >
                  <Scissors className="h-3 w-3" /> Ajouter un segment
                </button>
              </div>
            </div>

            {error && (
              <p className="mt-3 rounded-lg border border-[#c4512f]/30 bg-[#c4512f]/10 px-3 py-2 text-[11px] text-[#e7a08d]">
                {error}
              </p>
            )}

            <audio
              ref={audioRef}
              src={audioSrc || undefined}
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onError={() => audioSrc && setError('Le fichier audio n’a pas pu être lu.')}
              className="hidden"
            />
          </section>

          <section className="rounded-3xl border border-[#efe3cc]/12 bg-[#0f1130]/80 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d9a441]">Segments</p>
                <h2 className="mt-1 font-serif text-xl text-[#efe3cc]">{segments.length} découpe{segments.length > 1 ? 's' : ''}</h2>
              </div>
              <span className="text-[11px] text-[#efe3cc]/40">Deux colonnes : langue d’origine · français</span>
            </div>

            <div className="mt-4 space-y-3">
              {segments.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#efe3cc]/15 px-5 py-8 text-center">
                  <Scissors className="mx-auto h-5 w-5 text-[#d9a441]" />
                  <p className="mt-2 font-serif text-base text-[#efe3cc]/80">Aucun segment</p>
                  <p className="mt-1 text-xs text-[#efe3cc]/45">
                    Chargez une piste, placez la tête de lecture puis ajoutez un segment.
                  </p>
                </div>
              )}

              {segments.map((segment, index) => (
                <div key={index} className="rounded-2xl border border-[#efe3cc]/10 bg-[#0b0d20]/55 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[#d9a441]/15 text-[10px] font-bold text-[#d9a441]">
                      {index + 1}
                    </span>
                    <label className="flex items-center gap-1 text-[10px] text-[#efe3cc]/45">
                      début
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={segment.debut}
                        onChange={(event) => updateSegment(index, 'debut', Number(event.target.value))}
                        className="w-16 rounded-md border border-[#efe3cc]/12 bg-[#12142f] px-1.5 py-1 text-[11px] text-[#efe3cc] focus:border-[#d9a441] focus:outline-none"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-[10px] text-[#efe3cc]/45">
                      fin
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={segment.fin}
                        onChange={(event) => updateSegment(index, 'fin', Number(event.target.value))}
                        className="w-16 rounded-md border border-[#efe3cc]/12 bg-[#12142f] px-1.5 py-1 text-[11px] text-[#efe3cc] focus:border-[#d9a441] focus:outline-none"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => anchorSegmentToPlayhead(index)}
                      className="inline-flex items-center gap-1 rounded-full border border-[#efe3cc]/12 px-2.5 py-1 text-[10px] text-[#efe3cc]/55 transition hover:border-[#d9a441]/40 hover:text-[#d9a441]"
                      title="Utiliser la position de lecture comme début"
                    >
                      <Target className="h-3 w-3" /> caler
                    </button>
                    <button
                      type="button"
                      onClick={() => seek(segment.debut)}
                      className="rounded-full border border-[#efe3cc]/12 px-2.5 py-1 text-[10px] text-[#efe3cc]/55 transition hover:border-[#d9a441]/40 hover:text-[#d9a441]"
                    >
                      écouter
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSegment(index)}
                      aria-label={`Supprimer le segment ${index + 1}`}
                      className="ml-auto grid h-7 w-7 place-items-center rounded-full border border-[#efe3cc]/12 text-[#efe3cc]/40 transition hover:border-[#c4512f]/50 hover:text-[#c4512f]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <textarea
                      rows={2}
                      value={segment.texte}
                      onChange={(event) => updateSegment(index, 'texte', event.target.value)}
                      placeholder="Texte dans la langue d’origine…"
                      className="w-full resize-y rounded-xl border border-[#efe3cc]/10 bg-[#12142f] px-3 py-2 text-xs leading-relaxed text-[#efe3cc] placeholder:text-[#efe3cc]/25 focus:border-[#d9a441] focus:outline-none"
                    />
                    <textarea
                      rows={2}
                      value={segment.fr}
                      onChange={(event) => updateSegment(index, 'fr', event.target.value)}
                      placeholder="Traduction française…"
                      className="w-full resize-y rounded-xl border border-[#efe3cc]/10 bg-[#12142f] px-3 py-2 text-xs leading-relaxed text-[#efe3cc] placeholder:text-[#efe3cc]/25 focus:border-[#d9a441] focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-[#efe3cc]/12 bg-[#0f1130]/80 p-5 lg:sticky lg:top-20">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d9a441]">Métadonnées</p>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[#efe3cc]/40">Titre du récit</span>
                <input
                  type="text"
                  value={titre}
                  onChange={(event) => setTitre(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#efe3cc]/12 bg-[#12142f] px-3 py-2 text-sm text-[#efe3cc] focus:border-[#d9a441] focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[#efe3cc]/40">Langue</span>
                <select
                  value={langue}
                  onChange={(event) => setLangue(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#efe3cc]/12 bg-[#12142f] px-3 py-2 text-sm text-[#efe3cc] focus:border-[#d9a441] focus:outline-none"
                >
                  <option value="francais">Français</option>
                  <option value="moore">Mooré</option>
                  <option value="dioula">Dioula</option>
                  <option value="fulfulde">Fulfulde</option>
                </select>
              </label>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl border border-[#efe3cc]/10 bg-[#0b0d20]/40 px-2 py-2.5">
                <p className="font-mono text-lg text-[#efe3cc]">{segments.length}</p>
                <p className="text-[9px] uppercase tracking-[0.14em] text-[#efe3cc]/40">Segments</p>
              </div>
              <div className="rounded-xl border border-[#efe3cc]/10 bg-[#0b0d20]/40 px-2 py-2.5">
                <p className="font-mono text-lg text-[#efe3cc]">{formatClock(duration)}</p>
                <p className="text-[9px] uppercase tracking-[0.14em] text-[#efe3cc]/40">Durée</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#efe3cc]/40">Validation</p>
              {warnings.length === 0 ? (
                <p className="mt-2 flex items-center gap-2 rounded-xl border border-[#7fa36b]/25 bg-[#7fa36b]/8 px-3 py-2 text-[11px] text-[#a9c496]">
                  <Check className="h-3.5 w-3.5" /> JSON prêt à être exporté.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {warnings.slice(0, 4).map((warning) => (
                    <li
                      key={warning}
                      className="flex items-start gap-2 rounded-lg border border-[#c4512f]/25 bg-[#c4512f]/8 px-2.5 py-1.5 text-[10px] leading-relaxed text-[#e7a08d]"
                    >
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      {warning}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={downloadJson}
                disabled={segments.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#d9a441] px-4 py-2.5 text-xs font-semibold text-[#12142f] transition hover:bg-[#f5d78e] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Download className="h-3.5 w-3.5" /> Exporter le JSON
              </button>
              <button
                type="button"
                onClick={copyJson}
                disabled={segments.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-[#efe3cc]/20 px-4 py-2.5 text-xs font-semibold text-[#efe3cc]/75 transition hover:border-[#d9a441]/50 hover:text-[#f5d78e] disabled:cursor-not-allowed disabled:opacity-30"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#7fa36b]" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copié' : 'Copier le JSON'}
              </button>
            </div>

            <pre className="mt-4 max-h-40 overflow-auto rounded-xl border border-[#efe3cc]/10 bg-[#0b0d20]/60 p-3 font-mono text-[9px] leading-relaxed text-[#efe3cc]/50">
              {JSON.stringify(exportData, null, 2)}
            </pre>
          </section>

          <section className="rounded-3xl border border-[#efe3cc]/12 bg-[#0f1130]/60 p-5">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#efe3cc]/45">
              <Info className="h-3.5 w-3.5 text-[#d9a441]" /> Mode d’emploi
            </p>
            <ol className="mt-3 space-y-2 text-[11px] leading-relaxed text-[#efe3cc]/50">
              <li>1. Charger la piste audio du récit.</li>
              <li>2. Écouter et ajouter un segment à chaque phrase.</li>
              <li>3. Ajuster les bornes, saisir le texte et la traduction.</li>
              <li>4. Exporter le JSON, puis fusionner `langues` dans la fiche du récit.</li>
            </ol>
            <p className="mt-3 border-t border-[#efe3cc]/8 pt-3 text-[10px] leading-relaxed text-[#efe3cc]/35">
              Astuce : la barre espace lance ou met en pause la lecture. Les fichiers restent sur votre appareil.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
