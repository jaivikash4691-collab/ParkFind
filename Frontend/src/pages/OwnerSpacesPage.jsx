import React, { useState, useEffect } from 'react';
import { locationsApi } from '../api/locations';
import { slotsApi } from '../api/slots';
import { Modal } from '../components/ui/Modal';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';
import {
  Building2,
  Plus,
  RefreshCw,
  Car,
  Zap,
  Accessibility,
  Wrench,
  CheckCircle,
  Clock,
  MapPin,
  Sliders
} from 'lucide-react';

export function OwnerSpacesPage() {
  const { showToast } = useToast();

  const [spaces, setSpaces] = useState([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState(null);
  const [activeSpaceDetail, setActiveSpaceDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Add Facility Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [newSpaceForm, setNewSpaceForm] = useState({
    name: '',
    area: '',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    country: 'India',
    address: '',
    hourly_rate: 40,
    total_capacity: 16,
    opening_time: '06:00',
    closing_time: '23:30',
    latitude: 11.0168,
    longitude: 76.9558,
    is_covered: true,
    has_ev: false,
    is_24_7: false,
    is_accessible: true,
  });

  const fetchSpaces = async () => {
    try {
      setLoading(true);
      const data = await locationsApi.getOwnerLocations();
      setSpaces(data || []);

      if (data && data.length > 0 && !selectedSpaceId) {
        setSelectedSpaceId(data[0].id);
      }
    } catch (err) {
      showToast('Failed to load owner parking spaces', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  // Fetch full detail of selected facility
  useEffect(() => {
    if (!selectedSpaceId) return;

    async function fetchDetail() {
      try {
        setLoadingDetail(true);
        const data = await locationsApi.getById(selectedSpaceId);
        setActiveSpaceDetail(data);
      } catch (err) {
        showToast('Failed to load facility bay details', 'danger');
      } finally {
        setLoadingDetail(false);
      }
    }
    fetchDetail();
  }, [selectedSpaceId]);

  // Operational Slot Status Cycling
  const handleToggleSlotStatus = async (slot) => {
    const cycleMap = {
      available: 'occupied',
      occupied: 'maintenance',
      maintenance: 'available',
      reserved: 'available',
    };
    const nextStatus = cycleMap[slot.status] || 'available';

    // Optimistic UI update
    setActiveSpaceDetail((prev) => {
      if (!prev) return prev;
      const updatedSlots = (prev.slots || []).map((s) =>
        s.id === slot.id ? { ...s, status: nextStatus } : s
      );
      return { ...prev, slots: updatedSlots };
    });

    try {
      await slotsApi.updateStatus(slot.id, nextStatus);
      showToast(`Bay ${slot.slot_no || slot.slotNo} toggled to ${nextStatus}`, 'success', 1800);
      fetchSpaces();
    } catch (err) {
      showToast(err.message || 'Failed to update slot status', 'danger');
      // Revert on failure
      const data = await locationsApi.getById(selectedSpaceId);
      setActiveSpaceDetail(data);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmittingAdd(true);

    try {
      await locationsApi.create({
        ...newSpaceForm,
        hourly_rate: parseFloat(newSpaceForm.hourly_rate),
        total_capacity: parseInt(newSpaceForm.total_capacity, 10),
        latitude: parseFloat(newSpaceForm.latitude),
        longitude: parseFloat(newSpaceForm.longitude),
      });

      showToast(`Facility '${newSpaceForm.name}' listed with ${newSpaceForm.total_capacity} bays!`, 'success');
      setAddModalOpen(false);
      fetchSpaces();
    } catch (err) {
      showToast(err.message || 'Failed to list facility', 'danger');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const getSlotTypeIcon = (type) => {
    switch (type) {
      case 'ev_charging':
        return <Zap size={14} style={{ color: '#0ea5e9' }} />;
      case 'accessible':
        return <Accessibility size={14} style={{ color: '#8b5cf6' }} />;
      default:
        return <Car size={14} style={{ color: 'var(--text-muted)' }} />;
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.04em' }}>
            Facility Operations &amp; Bay Management
          </span>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: 2 }}>
            My Parking Spaces &amp; Slot Controls
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Configure operational bays, toggle maintenance closures, and list new smart parking facilities.
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="btn btn-primary btn-sm"
          style={{ gap: 6 }}
        >
          <Plus size={15} /> + Add New Facility
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton count={3} height={160} />
      ) : spaces.length === 0 ? (
        <EmptyState
          icon="🏢"
          title="No Parking Spaces Listed Yet"
          description="Publish your first parking facility to generate physical bay slots and start accepting driver reservations."
          action={
            <button onClick={() => setAddModalOpen(true)} className="btn btn-primary btn-sm">
              List First Facility
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-12 md-grid-cols-1" style={{ gap: '2rem', alignItems: 'flex-start' }}>
          {/* Left Column: Spaces List (4 Cols on Desktop) */}
          <div style={{ gridColumn: 'span 4 / span 4', display: 'flex', flexDirection: 'column', gap: '0.85rem' }} className="md-col-span-12">
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Your Facilities ({spaces.length})
            </h3>

            {spaces.map((sp) => {
              const isSelected = selectedSpaceId === sp.id;
              return (
                <div
                  key={sp.id}
                  onClick={() => setSelectedSpaceId(sp.id)}
                  className={`card card-interactive ${isSelected ? 'card-glow' : ''}`}
                  style={{
                    padding: '1.25rem',
                    borderLeft: `4px solid ${isSelected ? 'var(--accent-primary)' : 'transparent'}`,
                    backgroundColor: isSelected ? 'var(--accent-surface)' : 'var(--bg-surface)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {sp.name}
                    </h4>
                    <span className="badge badge-primary font-mono">
                      ₹{sp.hourlyRate || sp.hourly_rate}/hr
                    </span>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '0.75rem' }}>
                    {sp.address}, {sp.city}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700 }}>
                    <span style={{ color: 'var(--success-text)' }}>
                      {sp.availableSlots ?? 0} of {sp.totalCapacity || sp.total_capacity} open
                    </span>
                    <span style={{ color: 'var(--accent-primary)' }}>
                      {sp.occupancyRate ?? 0}% Occupied
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Interactive Bay Status Controller (8 Cols on Desktop) */}
          <div style={{ gridColumn: 'span 8 / span 8' }} className="md-col-span-12">
            <div className="card" style={{ padding: '1.75rem' }}>
              {activeSpaceDetail ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Slot Controller: {activeSpaceDetail.name}
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Click any bay below to toggle state: <strong>Available</strong> ➔ <strong>Occupied</strong> ➔ <strong>Maintenance</strong>.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', fontWeight: 700 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--success)' }} />
                        Available
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--danger)' }} />
                        Occupied
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--border-strong)' }} />
                        Maintenance
                      </span>
                    </div>
                  </div>

                  {loadingDetail ? (
                    <LoadingSkeleton count={2} height={120} />
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: '0.75rem' }}>
                      {(activeSpaceDetail.slots || []).map((slot) => {
                        const slotNo = slot.slot_no || slot.slotNo;
                        const slotType = slot.slot_type || slot.slotType;

                        return (
                          <div
                            key={slot.id}
                            onClick={() => handleToggleSlotStatus(slot)}
                            className={`slot-tile ${slot.status}`}
                            style={{ cursor: 'pointer' }}
                            title={`Click to cycle status for ${slotNo}`}
                          >
                            <div>{getSlotTypeIcon(slotType)}</div>
                            <div className="slot-tile-number">{slotNo}</div>
                            <div className="slot-tile-status-tag">{slot.status}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                  Select a facility from the left list to view and manage its bays.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Parking Space Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="List a New Parking Facility"
        subtitle="Publish your facility and auto-generate bay structures"
        maxWidth="680px"
      >
        <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="grid grid-cols-2 md-grid-cols-1" style={{ gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Facility Name</label>
              <input
                type="text"
                value={newSpaceForm.name}
                onChange={(e) => setNewSpaceForm({ ...newSpaceForm, name: e.target.value })}
                placeholder="e.g. City Center Multilevel Deck"
                className="form-input"
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Area / Locality</label>
              <input
                type="text"
                value={newSpaceForm.area}
                onChange={(e) => setNewSpaceForm({ ...newSpaceForm, area: e.target.value })}
                placeholder="e.g. RS Puram, Gandhipuram"
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Street Address</label>
            <input
              type="text"
              value={newSpaceForm.address}
              onChange={(e) => setNewSpaceForm({ ...newSpaceForm, address: e.target.value })}
              placeholder="e.g. 104, DB Road, Corner Junction"
              className="form-input"
              required
            />
          </div>

          <div className="grid grid-cols-3 md-grid-cols-1" style={{ gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Hourly Tariff (₹)</label>
              <input
                type="number"
                min="10"
                value={newSpaceForm.hourly_rate}
                onChange={(e) => setNewSpaceForm({ ...newSpaceForm, hourly_rate: e.target.value })}
                className="form-input"
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Total Bays Capacity</label>
              <input
                type="number"
                min="2"
                max="100"
                value={newSpaceForm.total_capacity}
                onChange={(e) => setNewSpaceForm({ ...newSpaceForm, total_capacity: e.target.value })}
                className="form-input"
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">City</label>
              <input
                type="text"
                value={newSpaceForm.city}
                onChange={(e) => setNewSpaceForm({ ...newSpaceForm, city: e.target.value })}
                className="form-input"
                required
              />
            </div>
          </div>

          {/* Operating Hours */}
          <div className="grid grid-cols-2 md-grid-cols-1" style={{ gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Opening Time</label>
              <input
                type="time"
                value={newSpaceForm.opening_time}
                onChange={(e) => setNewSpaceForm({ ...newSpaceForm, opening_time: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Closing Time</label>
              <input
                type="time"
                value={newSpaceForm.closing_time}
                onChange={(e) => setNewSpaceForm({ ...newSpaceForm, closing_time: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          {/* Amenities Flags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', padding: '0.5rem 0', fontSize: '0.85rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newSpaceForm.is_covered}
                onChange={(e) => setNewSpaceForm({ ...newSpaceForm, is_covered: e.target.checked })}
              />
              <span>Covered Roof</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newSpaceForm.has_ev}
                onChange={(e) => setNewSpaceForm({ ...newSpaceForm, has_ev: e.target.checked })}
              />
              <span>EV Fast Charging</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newSpaceForm.is_24_7}
                onChange={(e) => setNewSpaceForm({ ...newSpaceForm, is_24_7: e.target.checked })}
              />
              <span>24/7 Access</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newSpaceForm.is_accessible}
                onChange={(e) => setNewSpaceForm({ ...newSpaceForm, is_accessible: e.target.checked })}
              />
              <span>Accessible Bays</span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setAddModalOpen(false)}
              disabled={submittingAdd}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submittingAdd}
            >
              {submittingAdd ? 'Publishing...' : 'Publish Facility & Generate Bays'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
