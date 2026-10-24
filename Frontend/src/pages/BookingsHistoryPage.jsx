import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingsApi } from '../api/bookings';
import { reviewsApi } from '../api/reviews';
import { Modal } from '../components/ui/Modal';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useActiveSession } from '../context/ActiveSessionContext';
import { useToast } from '../context/ToastContext';
import {
  History,
  Navigation,
  Star,
  RefreshCw,
  Plus,
  Clock,
  CheckCircle2,
  Calendar
} from 'lucide-react';

export function BookingsHistoryPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { quickExtend, refreshActiveSession } = useActiveSession();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('all');

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [activeReviewBooking, setActiveReviewBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await bookingsApi.getMyBookings();
      setBookings(data || []);
    } catch (err) {
      showToast('Failed to load booking history', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filteredBookings = bookings.filter((b) => {
    if (filterTab === 'all') return true;
    return b.status === filterTab;
  });

  const handleOpenReview = (booking) => {
    setActiveReviewBooking(booking);
    setRating(5);
    setComment('');
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!activeReviewBooking) return;

    setSubmittingReview(true);
    try {
      await reviewsApi.create({
        booking_id: activeReviewBooking.id,
        parking_location_id: activeReviewBooking.locationId || activeReviewBooking.location_id,
        rating,
        comment: comment.trim(),
      });
      showToast('Thank you! Your parking rating was recorded.', 'success');
      setReviewModalOpen(false);
      fetchBookings();
    } catch (err) {
      showToast(err.message || 'Failed to submit review', 'danger');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.04em' }}>
            Passes &amp; Reservation History
          </span>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: 2 }}>
            My Booking History
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Manage active sessions, review past mobility receipts, and rate parking facility experiences.
          </p>
        </div>

        <button onClick={fetchBookings} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        {['all', 'active', 'completed', 'cancelled'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`btn btn-sm ${filterTab === tab ? 'btn-primary' : 'btn-ghost'}`}
            style={{ textTransform: 'capitalize', fontWeight: 700 }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {loading ? (
        <LoadingSkeleton count={3} height={130} />
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No Bookings Recorded"
          description="You don't have any reservations in this filter category yet. Explore spaces and reserve your guaranteed parking bay."
          action={
            <button onClick={() => navigate('/explore')} className="btn btn-primary btn-sm">
              Explore Parking Facilities →
            </button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredBookings.map((b) => {
            const isActive = b.status === 'active';
            const isCompleted = b.status === 'completed';
            const isCancelled = b.status === 'cancelled';

            return (
              <div
                key={b.id}
                className="card"
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1.25rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 4 }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {b.locationName || b.location_name}
                    </h3>
                    <span className={`badge ${isActive ? 'badge-success' : isCompleted ? 'badge-neutral' : 'badge-danger'}`}>
                      {b.status.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                    <span>
                      Bay:{' '}
                      <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontSize: '0.9rem' }}>
                        {b.slotNo || b.slot_no}
                      </strong>
                    </span>
                    <span>·</span>
                    <span>
                      Vehicle:{' '}
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>
                        {b.vehicleNumber || b.vehicle_number}
                      </strong>
                    </span>
                    <span>·</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      Ref: {b.bookingRef || b.booking_ref}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 6 }}>
                    <Calendar size={13} />
                    <span>
                      {new Date(b.startTime || b.start_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} —{' '}
                      {new Date(b.endTime || b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Right side: Amount & Context Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 900, color: 'var(--success-text)' }}>
                      ₹{b.totalAmount || b.total_amount}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {b.durationHours || b.duration_hours} Hour(s)
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {isActive ? (
                      <>
                        <button
                          onClick={() => quickExtend(1)}
                          className="btn btn-secondary btn-sm"
                          style={{ gap: 4 }}
                        >
                          <Plus size={14} /> +1 Hr
                        </button>
                        <button
                          onClick={() => navigate('/find-car')}
                          className="btn btn-primary btn-sm"
                          style={{ gap: 4 }}
                        >
                          <Navigation size={14} /> Wayfinding
                        </button>
                      </>
                    ) : isCompleted && !b.hasReviewed ? (
                      <button
                        onClick={() => handleOpenReview(b)}
                        className="btn btn-outline btn-sm"
                        style={{ gap: 4 }}
                      >
                        <Star size={14} style={{ color: '#f59e0b' }} /> Rate Experience
                      </button>
                    ) : b.hasReviewed ? (
                      <span className="badge badge-warning" style={{ gap: 4 }}>
                        <Star size={12} fill="#f59e0b" /> Rated {b.rating}/5
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Rating Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Rate Your Parking Experience"
        subtitle={`Review facility service at ${activeReviewBooking?.locationName || 'the parking facility'}`}
        maxWidth="460px"
      >
        <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Satisfaction Rating
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`btn btn-sm ${star <= rating ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, fontWeight: 800, gap: 4 }}
                >
                  <Star size={15} fill={star <= rating ? '#ffffff' : 'none'} />
                  {star}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Feedback &amp; Facility Notes</label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was the surface cleanliness, security guard, EV charging speed, and ease of barrier entry?"
              className="form-textarea"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setReviewModalOpen(false)}
              disabled={submittingReview}
            >
              Skip
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submittingReview}
            >
              {submittingReview ? 'Submitting...' : 'Submit Rating ★'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
