import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useTheme } from '../../context/ThemeContext';

export function InteractiveParkingMap({
  locations = [],
  selectedLocationId = null,
  onSelectLocation = () => {},
  userCoords = null,
  height = '560px',
  onBookLocation = () => {},
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const { isDark } = useTheme();

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const defaultLat = userCoords ? userCoords.lat : 11.0168;
    const defaultLng = userCoords ? userCoords.lng : 76.9558;

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    markersLayerRef.current = markersLayer;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update user GPS pin
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (userCoords) {
      const userIcon = L.divIcon({
        className: 'user-gps-marker',
        html: `
          <div style="position: relative; width: 18px; height: 18px;">
            <div style="position: absolute; inset: 0; border-radius: 50%; background: #0ea5e9; border: 3px solid #ffffff; box-shadow: 0 0 12px #0ea5e9;"></div>
            <div style="position: absolute; inset: -4px; border-radius: 50%; border: 2px solid #0ea5e9; opacity: 0.6; animation: pulseAnimation 2s infinite ease-in-out;"></div>
          </div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup('<strong>Your Location</strong>');
    }
  }, [userCoords]);

  // Update facility markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    const bounds = [];

    locations.forEach((loc) => {
      const isSelected = selectedLocationId === loc.id;
      const isSoldOut = loc.availableSlots === 0 || loc.isFull;

      const markerHtml = `
        <div class="custom-map-price-badge ${isSoldOut ? 'full-badge' : ''} ${isSelected ? 'active-marker' : ''}">
          <span>${isSoldOut ? 'FULL' : `₹${loc.hourlyRate || loc.hourly_rate}`}</span>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'map-badge-wrapper',
        html: markerHtml,
        iconSize: [54, 26],
        iconAnchor: [27, 13],
      });

      const marker = L.marker([loc.latitude, loc.longitude], { icon: customIcon });

      const popupContent = document.createElement('div');
      popupContent.style.padding = '12px 14px';
      popupContent.style.minWidth = '200px';

      popupContent.innerHTML = `
        <div style="font-size: 13px; font-weight: 800; color: var(--text-primary); margin-bottom: 2px;">
          ${loc.name}
        </div>
        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">
          ${loc.area} · ${loc.city}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-size: 11px; font-weight: 700; color: ${isSoldOut ? 'var(--danger-text)' : 'var(--success-text)'};">
            ${isSoldOut ? 'Sold Out' : `${loc.availableSlots} Bays Available`}
          </span>
          <span style="font-family: var(--font-mono); font-weight: 800; font-size: 13px; color: var(--accent-primary);">
            ₹${loc.hourlyRate || loc.hourly_rate}/hr
          </span>
        </div>
      `;

      const bookBtn = document.createElement('button');
      bookBtn.textContent = 'Reserve Spot →';
      bookBtn.style.width = '100%';
      bookBtn.style.padding = '6px 10px';
      bookBtn.style.backgroundColor = 'var(--accent-primary)';
      bookBtn.style.color = '#ffffff';
      bookBtn.style.border = 'none';
      bookBtn.style.borderRadius = '6px';
      bookBtn.style.fontWeight = '700';
      bookBtn.style.fontSize = '12px';
      bookBtn.style.cursor = 'pointer';

      bookBtn.onclick = (e) => {
        e.stopPropagation();
        onBookLocation(loc.id);
      };

      popupContent.appendChild(bookBtn);

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        onSelectLocation(loc.id);
      });

      markersLayerRef.current.addLayer(marker);
      bounds.push([loc.latitude, loc.longitude]);
    });

    if (bounds.length > 0 && !selectedLocationId && !userCoords) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [35, 35] });
    }
  }, [locations, selectedLocationId, onSelectLocation, onBookLocation]);

  // Center on selected location if changed
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedLocationId) return;
    const selected = locations.find((l) => l.id === selectedLocationId);
    if (selected) {
      mapInstanceRef.current.flyTo([selected.latitude, selected.longitude], 15, {
        duration: 0.8,
        easeLinearity: 0.25,
      });
    }
  }, [selectedLocationId, locations]);

  return (
    <div
      style={{
        position: 'relative',
        height,
        width: '100%',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--border-medium)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
