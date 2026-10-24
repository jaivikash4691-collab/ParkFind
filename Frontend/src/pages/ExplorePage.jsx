import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { locationsApi } from '../api/locations';
import { InteractiveParkingMap } from '../components/map/InteractiveParkingMap';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { LatticeLoader } from '../components/animation/LatticeLoader';
import { BorderGlow } from '../components/animation/BorderGlow';
import { GlareHover } from '../components/animation/GlareHover';
import { useToast } from '../context/ToastContext';
import {
  Search,
  MapPin,
  Navigation,
  ArrowUpDown,
  Filter,
  Zap,
  Star,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  Map as MapIcon,
  List as ListIcon,
  X
} from 'lucide-react';

export function ExplorePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  const [locations, setLocations] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedArea, setSelectedArea] = useState(searchParams.get('area') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'recommended');
  const [maxPrice, setMaxPrice] = useState('all');
  const [quickFilter, setQuickFilter] = useState('all');
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [userCoords, setUserCoords] = useState(null);

  // Mobile View Toggle: 'split' on desktop, 'list' | 'map' on mobile
  const [mobileView, setMobileView] = useState('list');

  // Load locations and areas
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [locs, meta] = await Promise.all([
          locationsApi.getAll(),
          locationsApi.getCities(),
        ]);
        setLocations(locs || []);
        if (meta && meta.areas) {
          setAreas(meta.areas);
        }
      } catch (err) {
        showToast('Failed to load parking locations', 'danger');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Handle GPS coordinate parameters if passed
  useEffect(() => {
    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));
    if (!isNaN(lat) && !isNaN(lng)) {
      setUserCoords({ lat, lng });
    }
  }, [searchParams]);

  // Request GPS position
  const handleGetGps = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'warning');
      return;
    }
    showToast('Detecting your GPS location...', 'info', 2000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        setSortBy('nearest');
        showToast('Located! Sorted by distance nearest to you.', 'success');
      },
      () => {
        showToast('Location permission denied.', 'info');
      },
      { timeout: 7000 }
    );
  };

  // Filter & Sort Logic
  const filteredLocations = useMemo(() => {
    let result = [...locations];

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.area.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.address.toLowerCase().includes(q)
      );
    }

    // Area filter
    if (selectedArea !== 'all') {
      result = result.filter((l) => l.area === selectedArea);
    }

    // Max price
    if (maxPrice !== 'all') {
      result = result.filter((l) => (l.hourlyRate || l.hourly_rate) <= parseFloat(maxPrice));
    }

    // Amenities chips
    if (quickFilter === 'ev') result = result.filter((l) => l.hasEv || l.has_ev);
    if (quickFilter === 'covered') result = result.filter((l) => l.isCovered || l.is_covered);
    if (quickFilter === '247') result = result.filter((l) => l.is24x7 || l.is_24_7);
    if (quickFilter === 'accessible') result = result.filter((l) => l.isAccessible || l.is_accessible);

    // Sorting
    if (sortBy === 'nearest') {
      result.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    } else if (sortBy === 'price_asc') {
      result.sort((a, b) => (a.hourlyRate || a.hourly_rate) - (b.hourlyRate || b.hourly_rate));
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => (b.hourlyRate || b.hourly_rate) - (a.hourlyRate || a.hourly_rate));
    } else if (sortBy === 'available_desc') {
      result.sort((a, b) => (b.availableSlots ?? 0) - (a.availableSlots ?? 0));
    } else if (sortBy === 'rating_desc') {
      result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }

    return result;
  }, [locations, search, selectedArea, maxPrice, quickFilter, sortBy]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedArea('all');
    setSortBy('recommended');
    setMaxPrice('all');
    setQuickFilter('all');
    setSelectedLocationId(null);
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.04em' }}>
            Live Discovery &amp; Navigation
          </span>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: 2 }}>
            Explore Parking Spaces
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Compare tariffs, monitor live bay status, and reserve immediately with guaranteed entry.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={handleGetGps} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
            <Navigation size={14} style={{ color: 'var(--accent-primary)' }} />
            <span>Near Me (GPS)</span>
          </button>

          {/* Mobile View Switcher */}
          <div className="mobile-only" style={{ display: 'none', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)', padding: 2 }}>
            <button
              onClick={() => setMobileView('list')}
              className={`btn btn-xs ${mobileView === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            >
              <ListIcon size={14} /> List
            </button>
            <button
              onClick={() => setMobileView('map')}
              className={`btn btn-xs ${mobileView === 'map' ? 'btn-primary' : 'btn-ghost'}`}
            >
              <MapIcon size={14} /> Map
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="grid grid-cols-12 md-grid-cols-1" style={{ gap: '0.75rem' }}>
          {/* Search Box */}
          <div style={{ gridColumn: 'span 4 / span 4' }} className="md-col-span-12">
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Search facility, area, street..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: 36, paddingRight: search ? 36 : 12 }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Area Select */}
          <div style={{ gridColumn: 'span 3 / span 3' }} className="md-col-span-12">
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="form-select"
            >
              <option value="all">All Areas / Localities</option>
              {areas.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name} ({a.city})
                </option>
              ))}
            </select>
          </div>

          {/* Sort Select */}
          <div style={{ gridColumn: 'span 3 / span 3' }} className="md-col-span-12">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-select"
            >
              <option value="recommended">Sort: Recommended</option>
              <option value="nearest">Sort: Nearest Distance (GPS)</option>
              <option value="price_asc">Sort: Price (Low to High)</option>
              <option value="price_desc">Sort: Price (High to Low)</option>
              <option value="available_desc">Sort: Most Available Bays</option>
              <option value="rating_desc">Sort: Highest Rated</option>
            </select>
          </div>

          {/* Price Cap */}
          <div style={{ gridColumn: 'span 2 / span 2' }} className="md-col-span-12">
            <select
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="form-select"
            >
              <option value="all">Any Tariff</option>
              <option value="30">Under ₹30/hr</option>
              <option value="40">Under ₹40/hr</option>
              <option value="50">Under ₹50/hr</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Amenity Chips */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginTop: '1rem',
            paddingTop: '0.85rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <button
            onClick={() => setQuickFilter('all')}
            className={`badge ${quickFilter === 'all' ? 'badge-primary' : 'badge-neutral'}`}
            style={{ cursor: 'pointer', padding: '0.35rem 0.75rem' }}
          >
            All Amenities
          </button>
          <button
            onClick={() => setQuickFilter('ev')}
            className={`badge ${quickFilter === 'ev' ? 'badge-primary' : 'badge-neutral'}`}
            style={{ cursor: 'pointer', padding: '0.35rem 0.75rem', gap: 5 }}
          >
            <Zap size={12} /> ⚡ EV Fast Charging
          </button>
          <button
            onClick={() => setQuickFilter('covered')}
            className={`badge ${quickFilter === 'covered' ? 'badge-primary' : 'badge-neutral'}`}
            style={{ cursor: 'pointer', padding: '0.35rem 0.75rem' }}
          >
            ☂ Covered Roof
          </button>
          <button
            onClick={() => setQuickFilter('247')}
            className={`badge ${quickFilter === '247' ? 'badge-primary' : 'badge-neutral'}`}
            style={{ cursor: 'pointer', padding: '0.35rem 0.75rem' }}
          >
            🕒 24/7 Access
          </button>
          <button
            onClick={() => setQuickFilter('accessible')}
            className={`badge ${quickFilter === 'accessible' ? 'badge-primary' : 'badge-neutral'}`}
            style={{ cursor: 'pointer', padding: '0.35rem 0.75rem' }}
          >
            ♿ Accessible
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-12 md-grid-cols-1" style={{ gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Left: Sticky Interactive Map (7 Cols on Desktop) */}
        <div
          style={{
            gridColumn: 'span 7 / span 7',
            position: 'sticky',
            top: 'calc(var(--header-height) + 1rem)',
          }}
          className={`md-col-span-12 ${mobileView === 'list' ? 'hide-on-mobile' : ''}`}
        >
          <InteractiveParkingMap
            locations={filteredLocations}
            selectedLocationId={selectedLocationId}
            onSelectLocation={(id) => setSelectedLocationId(id)}
            onBookLocation={(id) => navigate(`/parking/${id}`)}
            userCoords={userCoords}
            height="580px"
          />
        </div>

        {/* Right: Results Cards List (5 Cols on Desktop) */}
        <div
          style={{
            gridColumn: 'span 5 / span 5',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            maxHeight: '620px',
            overflowY: 'auto',
            paddingRight: '0.4rem',
          }}
          className={`md-col-span-12 ${mobileView === 'map' ? 'hide-on-mobile' : ''}`}
        >
          {/* List Header Count & Status */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.4rem 0.25rem',
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: '0.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 8px rgba(16, 185, 129, 0.8)',
                }}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {filteredLocations.length} Facilities Available
              </span>
            </div>
            {(search || selectedArea !== 'all' || maxPrice !== 'all' || quickFilter !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="btn btn-ghost btn-xs"
                style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', padding: '2px 8px' }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: '3rem 1rem', display: 'flex', justifyContent: 'center' }}>
              <LatticeLoader
                pattern="sweep"
                size="md"
                message="Streaming live parking bay telemetry & map coordinates..."
                showTimer={true}
              />
            </div>
          ) : filteredLocations.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="No matching parking facilities"
              description="Try relaxing your filters or selecting another area in Coimbatore."
              action={
                <button onClick={handleResetFilters} className="btn btn-secondary btn-sm">
                  Reset All Filters
                </button>
              }
            />
          ) : (
            filteredLocations.map((loc) => {
              const isSelected = selectedLocationId === loc.id;
              const isFull = loc.availableSlots === 0 || loc.isFull;

              const CardContent = (
                <div
                  onClick={() => setSelectedLocationId(loc.id)}
                  className={`card card-interactive ${isSelected ? 'card-glow' : ''}`}
                  style={{
                    padding: '1.25rem',
                    borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    backgroundColor: isSelected ? 'rgba(0, 210, 255, 0.06)' : 'var(--bg-surface)',
                    boxShadow: isSelected ? '0 0 24px rgba(0, 210, 255, 0.16)' : 'var(--shadow-sm)',
                    cursor: 'pointer',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  {/* Top Bar: Locality Pill + Live Active Status + Price Tariff */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: 'var(--accent-primary)',
                          backgroundColor: 'rgba(0, 210, 255, 0.12)',
                          border: '1px solid rgba(0, 210, 255, 0.25)',
                          padding: '3px 9px',
                          borderRadius: '20px',
                          letterSpacing: '0.03em',
                          textTransform: 'uppercase',
                        }}
                      >
                        📍 {loc.area} · {loc.city}
                      </span>
                      {isSelected && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            color: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                          }}
                        >
                          ● Pin Active on Map
                        </span>
                      )}
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.35rem', fontWeight: 900, color: 'var(--accent-primary)', lineHeight: 1 }}>
                        ₹{loc.hourlyRate || loc.hourly_rate}
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>/hr</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Facility Name & Address */}
                  <div>
                    <h4
                      style={{
                        fontSize: '1.125rem',
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        marginBottom: '0.25rem',
                        lineHeight: 1.3,
                      }}
                    >
                      {loc.name}
                    </h4>
                    <p
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.45,
                        margin: 0,
                      }}
                    >
                      {loc.address}
                    </p>
                  </div>

                  {/* Features & Badges Row */}
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span
                      className={`badge ${isFull ? 'badge-danger' : loc.availableSlots <= 3 ? 'badge-warning' : 'badge-success'}`}
                      style={{ fontSize: '0.72rem', fontWeight: 700 }}
                    >
                      {isFull ? '✕ Sold Out' : `✓ ${loc.availableSlots} Bays Available`}
                    </span>

                    {loc.distanceLabel && (
                      <span className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                        🧭 {loc.distanceLabel}
                      </span>
                    )}

                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <Star size={12} fill="#f59e0b" /> {loc.rating || '4.8'}
                    </span>

                    {loc.hasEv && (
                      <span className="badge badge-primary" style={{ fontSize: '0.7rem', padding: '2px 7px' }}>
                        ⚡ EV Fast
                      </span>
                    )}
                    {loc.isCovered && (
                      <span className="badge badge-neutral" style={{ fontSize: '0.7rem', padding: '2px 7px' }}>
                        ☂ Covered
                      </span>
                    )}
                  </div>

                  {/* Bottom Action Footer */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '0.85rem',
                      borderTop: '1px solid var(--border-subtle)',
                      marginTop: '0.15rem',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Total: {loc.totalCapacity || loc.total_capacity || 16} bays
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/parking/${loc.id}`);
                      }}
                      className="btn btn-primary btn-sm"
                      style={{
                        padding: '0.5rem 1.15rem',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 2px 10px rgba(0, 210, 255, 0.25)',
                      }}
                    >
                      Reserve Spot →
                    </button>
                  </div>
                </div>
              );

              if (isSelected) {
                return (
                  <BorderGlow
                    key={loc.id}
                    borderRadius="16px"
                    glowColor="var(--accent-primary, #00d2ff)"
                    glowIntensity={0.85}
                    animated={true}
                    backgroundColor="var(--bg-surface)"
                    style={{ flexShrink: 0, width: '100%' }}
                  >
                    {CardContent}
                  </BorderGlow>
                );
              }

              return (
                <GlareHover
                  key={loc.id}
                  borderRadius="16px"
                  glareColor="rgba(255, 255, 255, 0.12)"
                  glareOpacity={0.2}
                  style={{ flexShrink: 0, width: '100%' }}
                >
                  {CardContent}
                </GlareHover>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .hide-on-mobile { display: none !important; }
          .mobile-only { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
