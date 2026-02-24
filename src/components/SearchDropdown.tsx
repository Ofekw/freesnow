import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mountain, Star } from 'lucide-react';
import type { Resort } from '@/types';
import { searchResorts, RESORTS } from '@/data/resorts';
import './SearchDropdown.css';

const MAX_RESULTS = 8;

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  isFav: (slug: string) => boolean;
  onToggleFavorite: (slug: string) => void;
}

export function SearchDropdown({ query, onQueryChange, isFav, onToggleFavorite }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const trimmed = query.trim();
  const results: Resort[] = trimmed ? searchResorts(trimmed).slice(0, MAX_RESULTS) : [];
  const totalMatches = trimmed ? searchResorts(trimmed).length : RESORTS.length;
  const showPanel = open && trimmed.length > 0;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  const goToResort = useCallback(
    (slug: string) => {
      setOpen(false);
      onQueryChange('');
      navigate(`/resort/${slug}`);
    },
    [navigate, onQueryChange],
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showPanel) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i < results.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : results.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      e.preventDefault();
      goToResort(results[activeIndex].slug);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div className="search-dropdown" ref={containerRef}>
      <Search size={18} className="search-dropdown__icon" />
      <input
        ref={inputRef}
        className="search-dropdown__input"
        type="search"
        placeholder="Search resorts…"
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        aria-label="Search resorts"
        aria-expanded={showPanel}
        aria-controls="search-dropdown-panel"
        aria-activedescendant={activeIndex >= 0 ? `search-item-${activeIndex}` : undefined}
        role="combobox"
        autoComplete="off"
      />

      {showPanel && (
        <div
          className="search-dropdown__panel"
          id="search-dropdown-panel"
          role="listbox"
        >
          {results.length === 0 ? (
            <div className="search-dropdown__empty">No resorts match &ldquo;{trimmed}&rdquo;</div>
          ) : (
            <>
              {results.map((resort, i) => (
                <div
                  key={resort.slug}
                  id={`search-item-${i}`}
                  className="search-dropdown__item"
                  role="option"
                  data-active={i === activeIndex}
                  aria-selected={i === activeIndex}
                  onClick={() => goToResort(resort.slug)}
                >
                  <Mountain size={16} className="search-dropdown__item-icon" />
                  <div className="search-dropdown__item-text">
                    <span className="search-dropdown__item-name">{resort.name}</span>
                    <span className="search-dropdown__item-region">{resort.region}, {resort.country}</span>
                  </div>
                  <button
                    className={`search-dropdown__fav ${isFav(resort.slug) ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(resort.slug);
                    }}
                    aria-label={isFav(resort.slug) ? `Remove ${resort.name} from favorites` : `Add ${resort.name} to favorites`}
                    title={isFav(resort.slug) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star size={16} fill={isFav(resort.slug) ? 'currentColor' : 'none'} />
                  </button>
                </div>
              ))}
              {totalMatches > MAX_RESULTS && (
                <div className="search-dropdown__hint">
                  {totalMatches - MAX_RESULTS} more result{totalMatches - MAX_RESULTS > 1 ? 's' : ''} below
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
