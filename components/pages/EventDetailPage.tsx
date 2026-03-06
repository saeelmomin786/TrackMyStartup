import React, { useEffect, useMemo, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import Footer from '../Footer';

type EventRow = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  start_at: string;
  end_at: string | null;
  timezone: string;
  meet_link: string | null;
  is_paid: boolean;
  amount: number;
  currency: string;
  is_published: boolean;
  is_active: boolean;
};

const EventDetailPage: React.FC = () => {
  const [eventData, setEventData] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const slug = useMemo(() => {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0] === 'events') {
      return parts[1];
    }
    return '';
  }, []);

  useEffect(() => {
    const loadEvent = async () => {
      if (!slug) {
        setError('Invalid event URL');
        setLoading(false);
        return;
      }

      try {
        const { data, error: loadError } = await supabase
          .from('events')
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .eq('is_active', true)
          .single();

        if (loadError || !data) {
          setError('Event not found');
          setLoading(false);
          return;
        }

        setEventData(data as EventRow);
      } catch (e) {
        console.error('Failed to load event detail', e);
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [slug]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {loading ? (
          <Card>
            <p className="text-slate-500">Loading event...</p>
          </Card>
        ) : error || !eventData ? (
          <Card>
            <h1 className="text-xl font-semibold text-slate-800 mb-2">Event Not Available</h1>
            <p className="text-slate-600">{error || 'The event could not be loaded.'}</p>
          </Card>
        ) : (
          <Card>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{eventData.title}</h1>
            {eventData.short_description && <p className="text-slate-700 mb-4">{eventData.short_description}</p>}

            <div className="space-y-2 mb-6 text-sm text-slate-600">
              <p><strong>Starts:</strong> {formatDate(eventData.start_at)}</p>
              {eventData.end_at && <p><strong>Ends:</strong> {formatDate(eventData.end_at)}</p>}
              <p><strong>Timezone:</strong> {eventData.timezone || 'UTC'}</p>
              <p>
                <strong>Fee:</strong>{' '}
                {eventData.is_paid ? `${eventData.currency} ${eventData.amount}` : 'Free'}
              </p>
            </div>

            {eventData.description && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-2">About this event</h2>
                <p className="text-slate-700 whitespace-pre-wrap">{eventData.description}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => (window.location.href = `/events/${eventData.slug}/register`)}>
                Register Now
              </Button>
              <Button variant="outline" onClick={() => (window.location.href = '/events')}>
                Back to Events
              </Button>
            </div>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default EventDetailPage;
