import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Plus, Trash2, Eye, EyeOff, Link as LinkIcon, Download, RefreshCw, Copy } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { createSlug } from '../../lib/slugUtils';

type EventRow = {
  id: string;
  title: string;
  slug: string;
  banner_image_url: string | null;
  whatsapp_group_link: string | null;
  short_description: string | null;
  description: string | null;
  timezone: string;
  start_at: string;
  end_at: string | null;
  registration_deadline: string | null;
  meet_link: string | null;
  is_paid: boolean;
  amount: number;
  currency: string;
  is_published: boolean;
  is_active: boolean;
  created_at: string;
};

type QuestionRow = {
  id: string;
  event_id: string;
  question_text: string;
  question_type: string;
  is_required: boolean;
  options_json: string[] | null;
  sort_order: number;
  is_active: boolean;
};

type RegistrationRow = {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  designation: string | null;
  status: string;
  payment_status: string;
  amount_due: number;
  amount_paid: number | null;
  currency: string;
  receipt_number: string | null;
  created_at: string;
  payment_id?: string | null;
  order_id?: string | null;
  payment_gateway?: string | null;
  payment_verified_at?: string | null;
};

type PaymentRow = {
  registration_id: string;
  payment_id: string | null;
  order_id: string | null;
  payment_gateway: string | null;
  status: string;
  verified_at: string | null;
  created_at: string;
};

const QUESTION_TYPES = [
  'short_text',
  'long_text',
  'email',
  'phone',
  'number',
  'dropdown',
  'radio',
  'checkbox',
  'date',
] as const;

const AdminEventsTab: React.FC = () => {
  const db = supabase as any;
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

  const [eventForm, setEventForm] = useState({
    title: '',
    slug: '',
    bannerImageUrl: '',
    whatsappGroupLink: '',
    shortDescription: '',
    description: '',
    timezone: 'UTC',
    startAt: '',
    endAt: '',
    registrationDeadline: '',
    meetLink: '',
    isPaid: false,
    amount: '0',
    currency: 'INR',
    isPublished: false,
  });

  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [questionForm, setQuestionForm] = useState({
    questionText: '',
    questionType: 'short_text',
    isRequired: false,
    optionsCsv: '',
  });

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const { data, error } = await db
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents((data || []) as EventRow[]);

      if (!selectedEventId && data && data.length > 0) {
        setSelectedEventId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load events', error);
      alert('Failed to load events. Check RLS and admin permissions.');
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadQuestions = async (eventId: string) => {
    setLoadingQuestions(true);
    try {
      const { data, error } = await db
        .from('event_form_questions')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setQuestions((data || []) as QuestionRow[]);
    } catch (error) {
      console.error('Failed to load event questions', error);
      alert('Failed to load questions for selected event.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const loadRegistrations = async (eventId: string) => {
    setLoadingRegistrations(true);
    try {
      const { data: regData, error: regError } = await db
        .from('event_registrations')
        .select('id, event_id, full_name, email, phone, company_name, designation, status, payment_status, amount_due, amount_paid, currency, receipt_number, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (regError) throw regError;

      const typedRegistrations = (regData || []) as RegistrationRow[];
      if (typedRegistrations.length === 0) {
        setRegistrations([]);
        return;
      }

      const registrationIds = typedRegistrations.map((r) => r.id);
      const { data: paymentData, error: paymentError } = await db
        .from('event_payments')
        .select('registration_id, payment_id, order_id, payment_gateway, status, verified_at, created_at')
        .in('registration_id', registrationIds)
        .order('created_at', { ascending: false });

      if (paymentError) throw paymentError;

      const paymentMap = new Map<string, PaymentRow>();
      ((paymentData || []) as PaymentRow[]).forEach((p) => {
        if (!paymentMap.has(p.registration_id)) {
          paymentMap.set(p.registration_id, p);
        }
      });

      const merged = typedRegistrations.map((r) => {
        const p = paymentMap.get(r.id);
        return {
          ...r,
          payment_id: p?.payment_id || null,
          order_id: p?.order_id || null,
          payment_gateway: p?.payment_gateway || null,
          payment_verified_at: p?.verified_at || null,
        };
      });

      setRegistrations(merged);
    } catch (error) {
      console.error('Failed to load event registrations', error);
      alert('Failed to load registrations for selected event.');
    } finally {
      setLoadingRegistrations(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadQuestions(selectedEventId);
      loadRegistrations(selectedEventId);
    } else {
      setQuestions([]);
      setRegistrations([]);
    }
  }, [selectedEventId]);

  const escapeCsvCell = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const exportRegistrationsCsv = () => {
    if (!selectedEvent) {
      alert('Select an event first.');
      return;
    }

    if (registrations.length === 0) {
      alert('No registrations available to export.');
      return;
    }

    const headers = [
      'Registration ID',
      'Full Name',
      'Email',
      'Phone',
      'Company',
      'Designation',
      'Status',
      'Payment Status',
      'Amount Due',
      'Amount Paid',
      'Currency',
      'Receipt Number',
      'Payment Gateway',
      'Payment ID',
      'Order ID',
      'Payment Verified At',
      'Registered At',
    ];

    const rows = registrations.map((r) => [
      r.id,
      r.full_name,
      r.email,
      r.phone || '',
      r.company_name || '',
      r.designation || '',
      r.status,
      r.payment_status,
      r.amount_due,
      r.amount_paid ?? '',
      r.currency,
      r.receipt_number || '',
      r.payment_gateway || '',
      r.payment_id || '',
      r.order_id || '',
      r.payment_verified_at || '',
      r.created_at,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedEvent.slug}-registrations.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetEventForm = () => {
    setEditingEventId(null);
    setEventForm({
      title: '',
      slug: '',
      bannerImageUrl: '',
      whatsappGroupLink: '',
      shortDescription: '',
      description: '',
      timezone: 'UTC',
      startAt: '',
      endAt: '',
      registrationDeadline: '',
      meetLink: '',
      isPaid: false,
      amount: '0',
      currency: 'INR',
      isPublished: false,
    });
  };

  const startEditEvent = (event: EventRow) => {
    setEditingEventId(event.id);
    setEventForm({
      title: event.title,
      slug: event.slug,
      bannerImageUrl: event.banner_image_url || '',
      whatsappGroupLink: event.whatsapp_group_link || '',
      shortDescription: event.short_description || '',
      description: event.description || '',
      timezone: event.timezone || 'UTC',
      startAt: event.start_at ? event.start_at.slice(0, 16) : '',
      endAt: event.end_at ? event.end_at.slice(0, 16) : '',
      registrationDeadline: event.registration_deadline ? event.registration_deadline.slice(0, 16) : '',
      meetLink: event.meet_link || '',
      isPaid: !!event.is_paid,
      amount: String(event.amount || 0),
      currency: event.currency || 'INR',
      isPublished: !!event.is_published,
    });
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventForm.title.trim() || !eventForm.startAt) {
      alert('Title and Start Date/Time are required.');
      return;
    }

    const slug = (eventForm.slug.trim() || createSlug(eventForm.title.trim())).toLowerCase();
    if (!slug) {
      alert('Unable to generate slug. Please provide a valid title or slug.');
      return;
    }

    const amount = eventForm.isPaid ? Number(eventForm.amount || '0') : 0;
    if (eventForm.isPaid && amount <= 0) {
      alert('Paid events must have amount greater than 0.');
      return;
    }

    setSavingEvent(true);
    try {
      const payload = {
        title: eventForm.title.trim(),
        slug,
        banner_image_url: eventForm.bannerImageUrl.trim() || null,
        whatsapp_group_link: eventForm.whatsappGroupLink.trim() || null,
        short_description: eventForm.shortDescription.trim() || null,
        description: eventForm.description.trim() || null,
        timezone: eventForm.timezone.trim() || 'UTC',
        start_at: new Date(eventForm.startAt).toISOString(),
        end_at: eventForm.endAt ? new Date(eventForm.endAt).toISOString() : null,
        registration_deadline: eventForm.registrationDeadline
          ? new Date(eventForm.registrationDeadline).toISOString()
          : null,
        meet_link: eventForm.meetLink.trim() || null,
        is_paid: eventForm.isPaid,
        amount,
        currency: eventForm.currency || 'INR',
        is_published: eventForm.isPublished,
        is_active: true,
      };

      if (editingEventId) {
        const { error } = await db.from('events').update(payload).eq('id', editingEventId);
        if (error) throw error;
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { error } = await db.from('events').insert({
          ...payload,
          created_by: user?.id || null,
        });
        if (error) throw error;
      }

      await loadEvents();
      resetEventForm();
    } catch (error: any) {
      console.error('Failed to save event', error);
      alert(error?.message || 'Failed to save event.');
    } finally {
      setSavingEvent(false);
    }
  };

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please upload JPEG, PNG, GIF, or WebP image.');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size too large. Please upload an image smaller than 5MB.');
      return;
    }

    setUploadingPoster(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `posters/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-posters')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('does not exist')) {
          alert('Storage bucket event-posters not found. Run ADD_EVENT_POSTERS_STORAGE_BUCKET.sql in Supabase.');
          return;
        }
        throw uploadError;
      }

      const { data: urlData } = supabase.storage.from('event-posters').getPublicUrl(filePath);
      setEventForm((prev) => ({ ...prev, bannerImageUrl: urlData.publicUrl }));
      alert('Poster uploaded successfully.');
    } catch (error: any) {
      console.error('Failed to upload poster', error);
      alert(error?.message || 'Failed to upload poster image.');
    } finally {
      setUploadingPoster(false);
      e.target.value = '';
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Delete this event and all its registrations/questions?')) return;

    try {
      const { error } = await db.from('events').delete().eq('id', eventId);
      if (error) throw error;

      if (selectedEventId === eventId) {
        setSelectedEventId(null);
      }

      await loadEvents();
    } catch (error: any) {
      console.error('Failed to delete event', error);
      alert(error?.message || 'Failed to delete event.');
    }
  };

  const togglePublished = async (event: EventRow) => {
    try {
      const { error } = await db
        .from('events')
        .update({ is_published: !event.is_published })
        .eq('id', event.id);
      if (error) throw error;
      await loadEvents();
    } catch (error: any) {
      console.error('Failed to toggle publish state', error);
      alert(error?.message || 'Failed to update publish state.');
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      alert('Select an event first.');
      return;
    }

    if (!questionForm.questionText.trim()) {
      alert('Question text is required.');
      return;
    }

    const needsOptions = ['dropdown', 'radio', 'checkbox'].includes(questionForm.questionType);
    const options = questionForm.optionsCsv
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    if (needsOptions && options.length === 0) {
      alert('This question type requires options. Add comma-separated options.');
      return;
    }

    try {
      const nextOrder = questions.length > 0 ? Math.max(...questions.map((q) => q.sort_order || 0)) + 1 : 1;
      const { error } = await db.from('event_form_questions').insert({
        event_id: selectedEventId,
        question_text: questionForm.questionText.trim(),
        question_type: questionForm.questionType,
        is_required: questionForm.isRequired,
        options_json: needsOptions ? options : null,
        sort_order: nextOrder,
        is_active: true,
      });

      if (error) throw error;

      setQuestionForm({
        questionText: '',
        questionType: 'short_text',
        isRequired: false,
        optionsCsv: '',
      });

      await loadQuestions(selectedEventId);
    } catch (error: any) {
      console.error('Failed to add question', error);
      alert(error?.message || 'Failed to add question.');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      const { error } = await db.from('event_form_questions').delete().eq('id', questionId);
      if (error) throw error;
      if (selectedEventId) await loadQuestions(selectedEventId);
    } catch (error: any) {
      console.error('Failed to delete question', error);
      alert(error?.message || 'Failed to delete question.');
    }
  };

  const copyPublicLink = async (slug: string) => {
    const publicLink = `${window.location.origin}/events/${slug}/register`;
    try {
      await navigator.clipboard.writeText(publicLink);
      alert('Public registration link copied to clipboard.');
    } catch (error) {
      console.error('Failed to copy public link', error);
      prompt('Copy this public registration link:', publicLink);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Post Event</h3>
          {editingEventId && (
            <Button type="button" variant="secondary" onClick={resetEventForm}>
              Cancel Edit
            </Button>
          )}
        </div>

        <form onSubmit={handleSaveEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Title"
            value={eventForm.title}
            onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Founder Masterclass 2026"
            required
          />
          <Input
            label="Slug (optional)"
            value={eventForm.slug}
            onChange={(e) => setEventForm((p) => ({ ...p, slug: createSlug(e.target.value) }))}
            placeholder="founder-masterclass-2026"
            helpText="Auto-generated from title if left empty"
          />

          <Input
            label="Poster Image URL (optional)"
            value={eventForm.bannerImageUrl}
            onChange={(e) => setEventForm((p) => ({ ...p, bannerImageUrl: e.target.value }))}
            placeholder="https://.../event-poster.jpg"
          />

          <Input
            label="WhatsApp Group Link (optional)"
            value={eventForm.whatsappGroupLink}
            onChange={(e) => setEventForm((p) => ({ ...p, whatsappGroupLink: e.target.value }))}
            placeholder="https://chat.whatsapp.com/..."
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Upload Poster (optional)</label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
              onChange={handlePosterUpload}
              disabled={uploadingPoster}
            />
            <p className="text-xs text-slate-500 mt-1">Supported: JPG, PNG, GIF, WebP (max 5MB)</p>
          </div>

          <Input
            label="Timezone"
            value={eventForm.timezone}
            onChange={(e) => setEventForm((p) => ({ ...p, timezone: e.target.value }))}
            placeholder="Asia/Kolkata"
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date & Time</label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                value={eventForm.startAt}
                onChange={(e) => setEventForm((p) => ({ ...p, startAt: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End Date & Time (optional)</label>
            <input
              type="datetime-local"
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
              value={eventForm.endAt}
              onChange={(e) => setEventForm((p) => ({ ...p, endAt: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Registration Deadline (optional)</label>
            <input
              type="datetime-local"
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
              value={eventForm.registrationDeadline}
              onChange={(e) => setEventForm((p) => ({ ...p, registrationDeadline: e.target.value }))}
            />
          </div>

          <Input
            label="Google Meet Link (optional)"
            value={eventForm.meetLink}
            onChange={(e) => setEventForm((p) => ({ ...p, meetLink: e.target.value }))}
            placeholder="https://meet.google.com/xxx-xxxx-xxx"
          />

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Short Description</label>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
              rows={2}
              value={eventForm.shortDescription}
              onChange={(e) => setEventForm((p) => ({ ...p, shortDescription: e.target.value }))}
              placeholder="One-line summary for listings"
            />
          </div>

          {eventForm.bannerImageUrl && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Poster Preview</label>
              <img
                src={eventForm.bannerImageUrl}
                alt="Event poster preview"
                className="w-full max-w-md rounded-md border border-slate-200 object-cover"
              />
            </div>
          )}

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
              rows={4}
              value={eventForm.description}
              onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Full event details"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="isPaid"
              type="checkbox"
              checked={eventForm.isPaid}
              onChange={(e) =>
                setEventForm((p) => ({
                  ...p,
                  isPaid: e.target.checked,
                  amount: e.target.checked ? (p.amount === '0' ? '1' : p.amount) : '0',
                }))
              }
            />
            <label htmlFor="isPaid" className="text-sm text-slate-700">Paid Event</label>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="isPublished"
              type="checkbox"
              checked={eventForm.isPublished}
              onChange={(e) => setEventForm((p) => ({ ...p, isPublished: e.target.checked }))}
            />
            <label htmlFor="isPublished" className="text-sm text-slate-700">Published</label>
          </div>

          {eventForm.isPaid && (
            <>
              <Input
                label="Amount"
                type="number"
                min="0"
                step="0.01"
                value={eventForm.amount}
                onChange={(e) => setEventForm((p) => ({ ...p, amount: e.target.value }))}
                required
              />
              <Input
                label="Currency"
                value={eventForm.currency}
                onChange={(e) => setEventForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))}
                placeholder="INR"
                required
              />
            </>
          )}

          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={savingEvent}>
              {savingEvent ? 'Saving...' : editingEventId ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Events</h3>
        {loadingEvents ? (
          <p className="text-sm text-slate-500">Loading events...</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-slate-500">No events found.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className={`border rounded-lg p-3 ${selectedEventId === event.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">{event.title}</p>
                    <p className="text-sm text-slate-500">/{event.slug}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {event.is_paid ? `Paid ${event.currency} ${event.amount}` : 'Free event'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setSelectedEventId(event.id)}>
                      Manage Form
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => startEditEvent(event)}>
                      Edit
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => togglePublished(event)}>
                      {event.is_published ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                      {event.is_published ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => handleDeleteEvent(event.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />Delete
                    </Button>
                    <a
                      href={`/events/${event.slug}/register`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                    >
                      <LinkIcon className="h-4 w-4 mr-1" />Public Link
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyPublicLink(event.slug)}
                    >
                      <Copy className="h-4 w-4 mr-1" />Copy Link
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Dynamic Registration Form {selectedEvent ? `- ${selectedEvent.title}` : ''}
        </h3>

        {!selectedEventId ? (
          <p className="text-sm text-slate-500">Select an event to manage registration questions.</p>
        ) : (
          <>
            <form onSubmit={handleAddQuestion} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div className="md:col-span-2">
                <Input
                  label="Question"
                  value={questionForm.questionText}
                  onChange={(e) => setQuestionForm((p) => ({ ...p, questionText: e.target.value }))}
                  placeholder="What is your startup name?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  value={questionForm.questionType}
                  onChange={(e) => setQuestionForm((p) => ({ ...p, questionType: e.target.value }))}
                >
                  {QUESTION_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <Button type="submit" className="w-full">
                  <Plus className="h-4 w-4 mr-1" />Add Question
                </Button>
              </div>

              {['dropdown', 'radio', 'checkbox'].includes(questionForm.questionType) && (
                <div className="md:col-span-3">
                  <Input
                    label="Options (comma-separated)"
                    value={questionForm.optionsCsv}
                    onChange={(e) => setQuestionForm((p) => ({ ...p, optionsCsv: e.target.value }))}
                    placeholder="Option 1, Option 2, Option 3"
                    required
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  id="questionRequired"
                  type="checkbox"
                  checked={questionForm.isRequired}
                  onChange={(e) => setQuestionForm((p) => ({ ...p, isRequired: e.target.checked }))}
                />
                <label htmlFor="questionRequired" className="text-sm text-slate-700">Required</label>
              </div>
            </form>

            {loadingQuestions ? (
              <p className="text-sm text-slate-500">Loading questions...</p>
            ) : questions.length === 0 ? (
              <p className="text-sm text-slate-500">No questions yet. Add the first one above.</p>
            ) : (
              <div className="space-y-2">
                {questions.map((q) => (
                  <div key={q.id} className="border border-slate-200 rounded-md p-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-800">{q.question_text}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Type: {q.question_type} {q.is_required ? '• Required' : '• Optional'} • Order: {q.sort_order}
                      </p>
                      {Array.isArray(q.options_json) && q.options_json.length > 0 && (
                        <p className="text-xs text-slate-500 mt-1">Options: {q.options_json.join(', ')}</p>
                      )}
                    </div>

                    <Button type="button" size="sm" variant="secondary" onClick={() => handleDeleteQuestion(q.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-slate-800">
            Event Registrations {selectedEvent ? `- ${selectedEvent.title}` : ''}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => selectedEventId && loadRegistrations(selectedEventId)}
              disabled={!selectedEventId || loadingRegistrations}
            >
              <RefreshCw className="h-4 w-4 mr-1" />Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportRegistrationsCsv}
              disabled={!selectedEventId || registrations.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />Export CSV
            </Button>
          </div>
        </div>

        {!selectedEventId ? (
          <p className="text-sm text-slate-500">Select an event to view registrations.</p>
        ) : loadingRegistrations ? (
          <p className="text-sm text-slate-500">Loading registrations...</p>
        ) : registrations.length === 0 ? (
          <p className="text-sm text-slate-500">No registrations yet for this event.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-slate-200 rounded-md">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left p-2 border-b">Name</th>
                  <th className="text-left p-2 border-b">Email</th>
                  <th className="text-left p-2 border-b">Phone</th>
                  <th className="text-left p-2 border-b">Status</th>
                  <th className="text-left p-2 border-b">Payment</th>
                  <th className="text-left p-2 border-b">Amount</th>
                  <th className="text-left p-2 border-b">Receipt</th>
                  <th className="text-left p-2 border-b">Payment ID</th>
                  <th className="text-left p-2 border-b">Registered At</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="p-2">
                      <div className="font-medium text-slate-800">{r.full_name}</div>
                      {(r.company_name || r.designation) && (
                        <div className="text-xs text-slate-500">
                          {[r.company_name, r.designation].filter(Boolean).join(' - ')}
                        </div>
                      )}
                    </td>
                    <td className="p-2">{r.email}</td>
                    <td className="p-2">{r.phone || '-'}</td>
                    <td className="p-2">{r.status}</td>
                    <td className="p-2">{r.payment_status}</td>
                    <td className="p-2">
                      {r.currency} {r.amount_paid ?? r.amount_due}
                    </td>
                    <td className="p-2">{r.receipt_number || '-'}</td>
                    <td className="p-2">{r.payment_id || '-'}</td>
                    <td className="p-2">{new Date(r.created_at).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminEventsTab;
