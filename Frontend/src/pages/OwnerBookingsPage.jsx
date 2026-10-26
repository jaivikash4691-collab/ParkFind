import React, { useState, useEffect } from 'react';
import { bookingsApi } from '../api/bookings';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { QrScannerModal } from '../components/owner/QrScannerModal';
import { useToast } from '../context/ToastContext';
import {
  QrCode,
  Search,
  RefreshCw,
  CheckCircle,
  Phone,
  Car,
  Clock,
  Calendar,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export function OwnerBookingsPage() {
  const { showToast } = useToast();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);

  const fetchOwnerBookings = async () => {
    try {
      setLoading(true);
      const data = await bookingsApi.getOwnerBookings();
      setBookings(data || []);
    } catch (err) {
      showToast('Failed to load owner bookings', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwnerBookings();
  }, []);

  const handleConfirmPayment = async (bookingId) => {
    setConfirmingId(bookingId);
    try {
      await bookingsApi.confirmPayment(bookingId);
      showToast(`Payment confirmed for reservation #${bookingId}!`, 'success');
      fetchOwnerBookings();
    } catch (err) {
      showToast(err.message || 'Failed to confirm payment', 'danger');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleUpdateStatus = async (bookingId, status) => {
    try {
      await bookingsApi.updateStatus(bookingId, status);
      showToast(`Reservation #${bookingId} updated to ${status}! Barrier released.`, 'success');
      fetchOwnerBookings();
    } catch (err) {
      showToast(err.message || 'Status update failed', 'danger');
    }
  };


  const filteredBookings = bookings.filter((b) => {
    const bStatus = b.bookingStatus || b.status || '';
    if (statusFilter !== 'all' && bStatus !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchRef = (b.bookingRef || b.booking_ref || '').toLowerCase().includes(q);
      const matchDriver = (b.customerName || b.driverName || b.driver_name || '').toLowerCase().includes(q);
      const matchPlate = (b.vehicleNumber || b.vehicle_number || '').toLowerCase().includes(q);
      const matchLoc = (b.locationName || b.location_name || '').toLowerCase().includes(q);
      if (!matchRef && !matchDriver && !matchPlate && !matchLoc) return false;
    }
    return true;
  });

  return (
    <div className="app-container">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.04em' }}>
            Customer Gate Verification &amp; Sessions
          </span>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: 2 }}>
            Bookings &amp; Barrier Check-In
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Real-time customer arrival logs, barrier authorization, and vehicle checkout completion.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            onClick={() => setScannerOpen(true)}
            className="btn btn-primary btn-sm"
            style={{ gap: 6 }}
          >
            <QrCode size={15} /> Scan Customer QR Pass
          </button>

          <button onClick={fetchOwnerBookings} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
            <RefreshCw size={14} /> Refresh Logs
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['all', 'active', 'completed', 'cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`btn btn-sm ${statusFilter === tab ? 'btn-primary' : 'btn-ghost'}`}
              style={{ textTransform: 'capitalize', fontWeight: 700 }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: 260 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="Search driver, ref, plate..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: 34, height: 36, fontSize: '0.8125rem' }}
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="card" style={{ padding: '1.25rem' }}>
        {loading ? (
          <LoadingSkeleton count={4} height={60} />
        ) : filteredBookings.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No Bookings Found"
            description="There are currently no customer bookings matching this filter."
          />
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking Ref</th>
                  <th>Driver Contact</th>
                  <th>Vehicle Plate</th>
                  <th>Facility &amp; Bay</th>
                  <th>Reservation Time</th>
                  <th>Total Fee</th>
                  <th>Payment Status</th>
                  <th>Session Status</th>
                  <th>Gate Barrier Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => {
                  const bStatus = b.bookingStatus || b.status || '';
                  const isActive = bStatus === 'active';
                  const isPaid = b.paymentStatus === 'paid' || b.payment_status === 'paid';

                  return (
                    <tr key={b.id}>
                      <td>
                        <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontSize: '0.875rem' }}>
                          {b.bookingRef || b.booking_ref}
                        </strong>
                      </td>

                      <td>
                        <strong style={{ color: 'var(--text-primary)', display: 'block' }}>
                          {b.customerName || b.driverName || b.driver_name}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={11} /> {b.customerPhone || b.driverPhone || b.driver_phone}
                        </span>
                      </td>

                      <td>
                        <span className="badge badge-neutral font-mono" style={{ fontSize: '0.78rem' }}>
                          {b.vehicleNumber || b.vehicle_number}
                        </span>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600 }}>{b.locationName || b.location_name}</div>
                        <span className="badge badge-primary font-mono" style={{ fontSize: '0.7rem', marginTop: 2 }}>
                          Bay {b.slotNo || b.slot_no}
                        </span>
                      </td>

                      <td style={{ fontSize: '0.78rem' }}>
                        <div>{new Date(b.startTime || b.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
                        <div style={{ color: 'var(--text-dim)' }}>
                          {new Date(b.startTime || b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} —{' '}
                          {new Date(b.endTime || b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--success-text)' }}>
                        ₹{b.totalAmount || b.total_amount}
                      </td>

                      <td>
                        {isPaid ? (
                          <div>
                            <span className="badge badge-success font-mono" style={{ fontSize: '0.72rem' }}>
                              PAID ✓
                            </span>
                            {b.confirmedAt && (
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 2 }}>
                                Verified
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="badge badge-warning font-mono" style={{ fontSize: '0.72rem' }}>
                              PENDING
                            </span>
                            {b.customerUtr && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', marginTop: 2 }} title="Customer UTR Reference">
                                UTR: {b.customerUtr}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleConfirmPayment(b.id)}
                              disabled={confirmingId === b.id}
                              className="btn btn-success btn-xs"
                              style={{ marginTop: 4, gap: 4, width: '100%', fontSize: '0.7rem' }}
                              title="Verify that payment was credited to your UPI ID"
                            >
                              <ShieldCheck size={12} /> {confirmingId === b.id ? 'Saving...' : 'Confirm Paid'}
                            </button>
                          </div>
                        )}
                      </td>

                      <td>
                        <span className={`badge ${isActive ? 'badge-success' : bStatus === 'completed' ? 'badge-neutral' : 'badge-danger'}`}>
                          {bStatus.toUpperCase()}
                        </span>
                      </td>

                      <td>
                        {isActive ? (
                          <button
                            onClick={() => handleUpdateStatus(b.id, 'completed')}
                            className="btn btn-primary btn-xs"
                            style={{ gap: 4 }}
                          >
                            <CheckCircle size={13} /> Exit / Complete
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Concluded</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* QR Scanner Modal */}
      <QrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onValidationSuccess={() => fetchOwnerBookings()}
      />
    </div>
  );
}
