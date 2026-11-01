import React, { useId } from 'react';
import mapData from '../content/burkina-svg.json';
import { getRegionStats } from '../lib/data';

export default function BurkinaMapSVG({ className = '', onSelect, showDots = true }) {
  const uid = useId().replace(/[:]/g, '');
  const stats = getRegionStats();

  return (
    <svg
      viewBox={mapData.viewBox}
      className={className}
      role="img"
      aria-label="Carte stylisée du Burkina Faso et de ses treize régions"
    >
      <defs>
        <linearGradient id={`map-active-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d9a441" />
          <stop offset="100%" stopColor="#a85a32" />
        </linearGradient>
        <filter id={`map-glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g>
        {mapData.regions.map((region) => {
          const count = stats[region.nom] || 0;
          const active = count > 0;
          const handleSelect = () => onSelect && onSelect(region.nom);
          return (
            <g
              key={region.iso || region.nom}
              className={onSelect ? 'map-region map-region--interactive' : 'map-region'}
              onClick={handleSelect}
              onKeyDown={(event) => {
                if (onSelect && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  handleSelect();
                }
              }}
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : undefined}
              aria-label={onSelect ? `${region.nom}, ${count} récit${count > 1 ? 's' : ''}` : undefined}
            >
              <path
                d={region.path}
                fill={active ? `url(#map-active-${uid})` : '#efe3cc'}
                fillOpacity={active ? 0.9 : 0.07}
                stroke={active ? '#f5d78e' : '#efe3cc'}
                strokeOpacity={active ? 0.85 : 0.28}
                strokeWidth={active ? 1.1 : 0.7}
                strokeLinejoin="round"
              />
            </g>
          );
        })}
      </g>

      {showDots &&
        mapData.regions
          .filter((region) => (stats[region.nom] || 0) > 0)
          .map((region) => (
            <g key={`dot-${region.nom}`} transform={`translate(${region.cx} ${region.cy})`}>
              <circle className="map-pulse" r="11" fill="#d9a441" opacity="0.18" />
              <circle className="map-pulse map-pulse--delayed" r="16" fill="none" stroke="#d9a441" strokeWidth="1" opacity="0.4" />
              <circle r="4.2" fill="#fbe7b0" filter={`url(#map-glow-${uid})`} />
            </g>
          ))}
    </svg>
  );
}
