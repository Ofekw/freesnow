import { useState, useMemo } from 'react';
import { Snowflake, Star } from 'lucide-react';
import { searchResorts, RESORTS, getResortBySlug } from '@/data/resorts';
import { useFavorites } from '@/hooks/useFavorites';
import { ResortCard } from '@/components/ResortCard';
import { FavoriteCard } from '@/components/FavoriteCard';
import './HomePage.css';

export function HomePage() {
  const [query, setQuery] = useState('');
  const { favorites, toggle, isFav } = useFavorites();

  const filtered = useMemo(() => searchResorts(query), [query]);

  const favoriteResorts = useMemo(
    () =>
      favorites
        .map((f) => getResortBySlug(f.slug))
        .filter((r): r is NonNullable<typeof r> => r != null),
    [favorites],
  );

  // Group by region
  const grouped = useMemo(() => {
    const map = new Map<string, typeof RESORTS>();
    for (const r of filtered) {
      const list = map.get(r.region) ?? [];
      list.push(r);
      map.set(r.region, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="home">
      <section className="home__hero">
        <h1 className="home__title">
          <span className="home__title-icon"><Snowflake size={36} /></span>
        </h1>
        <p className="home__subtitle">
          Free &amp; open-source ski resort forecasts for North America
        </p>
        <input
          className="home__search"
          type="search"
          placeholder="Search resorts…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search resorts"
        />
      </section>

      {/* Favourites section — only visible when at least one resort is favourited */}
      {favoriteResorts.length > 0 && (
        <section className="home__region home__favorites">
          <h2 className="home__region-title"><Star size={16} fill="currentColor" className="home__fav-icon" /> Favourites</h2>
          <div className="home__grid">
            {favoriteResorts.map((r) => (
              <FavoriteCard
                key={r.slug}
                resort={r}
                onToggleFavorite={() => toggle(r.slug)}
              />
            ))}
          </div>
        </section>
      )}

      {grouped.length === 0 && (
        <p className="home__empty">No resorts match "{query}"</p>
      )}

      {grouped.map(([region, resorts]) => (
        <section key={region} className="home__region">
          <h2 className="home__region-title">{region}</h2>
          <div className="home__grid">
            {resorts.map((r) => (
              <ResortCard
                key={r.slug}
                resort={r}
                isFavorite={isFav(r.slug)}
                onToggleFavorite={() => toggle(r.slug)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
