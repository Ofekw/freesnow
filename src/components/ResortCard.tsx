import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import type { Resort } from '@/types';
import { fmtElevation } from '@/utils/weather';
import { useUnits } from '@/context/UnitsContext';
import './ResortCard.css';

interface Props {
  resort: Resort;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export function ResortCard({ resort, isFavorite, onToggleFavorite }: Props) {
  const navigate = useNavigate();
  const { elev } = useUnits();

  function handleCardClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('.resort-card__fav')) return;
    navigate(`/resort/${resort.slug}`);
  }

  return (
    <div className="resort-card" onClick={handleCardClick} role="link" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/resort/${resort.slug}`); }}>
      <div className="resort-card__header">
        <span className="resort-card__name">{resort.name}</span>
        <button
          className={`resort-card__fav ${isFavorite ? 'active' : ''}`}
          onClick={onToggleFavorite}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <p className="resort-card__region">
        {resort.region}, {resort.country}
      </p>
      <div className="resort-card__stats">
        <span>
          <strong>Base</strong> {fmtElevation(resort.elevation.base, elev)}
        </span>
        <span>
          <strong>Top</strong> {fmtElevation(resort.elevation.top, elev)}
        </span>
        <span>
          <strong>Vert</strong> {fmtElevation(resort.verticalDrop, elev)}
        </span>
        {resort.acres && (
          <span>
            <strong>Acres</strong> {resort.acres.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
