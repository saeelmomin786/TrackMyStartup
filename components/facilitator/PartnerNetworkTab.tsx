import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import { Upload, Plus, UserPlus, Trash2, Download, Users } from 'lucide-react';
import { messageService } from '../../lib/messageService';
import {
  facilitatorNetworkService,
  type FacilitatorNetworkContactRow,
  type NetworkKind,
} from '../../lib/facilitatorNetworkService';

export type { NetworkKind } from '../../lib/facilitatorNetworkService';

export type PartnerNetworkContact = {
  id: string;
  name: string;
  contactNumber: string;
  email: string;
  serviceType: string;
};

export type PartnerNetworkAssignment = {
  id: string;
  networkKind: NetworkKind;
  contactId: string;
  startupKey: string;
  startupLabel: string;
  assignedAt: string;
};

function splitCsvRow(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
    } else if (!inQ && c === ',') {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out.map((cell) => cell.replace(/^"|"$/g, '').trim());
}

function detectColumnIndices(headers: string[]): { name: number; contact: number; email: number; service: number } | null {
  const norm = (h: string) => h.trim().toLowerCase();
  const idx = (pred: (h: string) => boolean) => headers.findIndex((h) => pred(norm(h)));

  const nameI = idx((h) => (h === 'name' || h === 'full name' || h === 'contact name') && !h.includes('service'));
  const contactI = idx((h) =>
    h.includes('contact') && (h.includes('number') || h.includes('phone') || h.includes('mobile'))
  );
  const phoneI = idx((h) => h === 'phone' || h === 'mobile' || h === 'contact number');
  const emailI = idx((h) => h.includes('email'));
  const serviceI = idx((h) => h.includes('service') || h === 'type' || h === 'service type');

  const name = nameI >= 0 ? nameI : idx((h) => h === 'name');
  const contact = contactI >= 0 ? contactI : phoneI;
  if (name < 0 || contact < 0 || emailI < 0 || serviceI < 0) return null;
  return { name, contact, email: emailI, service: serviceI };
}

type CsvDraft = { name: string; contactNumber: string; email: string; serviceType: string };

function parseContactsFromCsv(text: string): CsvDraft[] | null {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  const headers = splitCsvRow(lines[0]);
  const map = detectColumnIndices(headers);
  if (!map) return null;

  const rows: CsvDraft[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvRow(lines[i]);
    if (cells.length < Math.max(map.name, map.contact, map.email, map.service) + 1) continue;
    const name = cells[map.name] || '';
    const contactNumber = cells[map.contact] || '';
    const email = cells[map.email] || '';
    const serviceType = cells[map.service] || '';
    if (!name && !email && !contactNumber) continue;
    rows.push({ name, contactNumber, email, serviceType });
  }
  return rows;
}

function rowToContact(r: FacilitatorNetworkContactRow): PartnerNetworkContact {
  return {
    id: r.id,
    name: r.name,
    contactNumber: r.contact_number,
    email: r.email,
    serviceType: r.service_type,
  };
}

function assignmentPairKey(networkKind: NetworkKind, contactId: string, startupKey: string): string {
  return `${networkKind}|${contactId}|${startupKey}`;
}

export interface PartnerNetworkTabProps {
  facilitatorId: string | null;
  trackMyStartups: { id: number; name: string }[];
}

type StartupOption = { key: string; label: string; startupId: number };

const PartnerNetworkTab: React.FC<PartnerNetworkTabProps> = ({ facilitatorId, trackMyStartups }) => {
  const [subTab, setSubTab] = useState<NetworkKind>('service_provider');
  const [serviceRows, setServiceRows] = useState<PartnerNetworkContact[]>([]);
  const [partnerRows, setPartnerRows] = useState<PartnerNetworkContact[]>([]);
  const [assignments, setAssignments] = useState<PartnerNetworkAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', contactNumber: '', email: '', serviceType: '' });

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<'single' | 'bulk'>('single');
  const [assignContact, setAssignContact] = useState<PartnerNetworkContact | null>(null);
  const [assignNetworkKind, setAssignNetworkKind] = useState<NetworkKind>('service_provider');
  const [assignSelectedStartupKeys, setAssignSelectedStartupKeys] = useState<string[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [isSavingAssign, setIsSavingAssign] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const startupOptions: StartupOption[] = useMemo(
    () =>
      trackMyStartups.map((s) => ({
        key: `tm:${s.id}`,
        label: `${s.name} (Track My Startups)`,
        startupId: s.id,
      })),
    [trackMyStartups]
  );

  const startupNameById = useCallback(
    (id: number) => trackMyStartups.find((s) => s.id === id)?.name || `Startup #${id}`,
    [trackMyStartups]
  );

  const buildAssignmentsFromDb = useCallback(
    (assignRows: FacilitatorNetworkAssignmentRow[], contactMap: Map<string, FacilitatorNetworkContactRow>) => {
      const out: PartnerNetworkAssignment[] = [];
      for (const a of assignRows) {
        const c = contactMap.get(a.contact_id);
        if (!c) continue;
        out.push({
          id: a.id,
          networkKind: c.network_kind as NetworkKind,
          contactId: a.contact_id,
          startupKey: `tm:${a.startup_id}`,
          startupLabel: `${startupNameById(a.startup_id)} (Track My Startups)`,
          assignedAt: a.created_at,
        });
      }
      return out;
    },
    [startupNameById]
  );

  const reload = useCallback(async () => {
    if (!facilitatorId) {
      setServiceRows([]);
      setPartnerRows([]);
      setAssignments([]);
      return;
    }
    setIsLoading(true);
    try {
      const contacts = await facilitatorNetworkService.listContacts(facilitatorId);
      const m = new Map(contacts.map((c) => [c.id, c]));
      setServiceRows(contacts.filter((c) => c.network_kind === 'service_provider').map(rowToContact));
      setPartnerRows(contacts.filter((c) => c.network_kind === 'partner').map(rowToContact));
      const assignRows = await facilitatorNetworkService.listAssignments(facilitatorId);
      setAssignments(buildAssignmentsFromDb(assignRows, m));
    } catch (e) {
      console.error('PartnerNetworkTab.reload', e);
      messageService.error('Load failed', 'Could not load partner network. If this is new, run the SQL migration in /database.');
    } finally {
      setIsLoading(false);
    }
  }, [facilitatorId, buildAssignmentsFromDb]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const rows = subTab === 'service_provider' ? serviceRows : partnerRows;

  const allRowsSelected = rows.length > 0 && rows.every((r) => selectedContactIds.includes(r.id));
  const toggleRowSelected = (id: string) => {
    setSelectedContactIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleAllRows = () => {
    if (allRowsSelected) setSelectedContactIds([]);
    else setSelectedContactIds(rows.map((r) => r.id));
  };

  const assignmentsForSubTab = useMemo(
    () => assignments.filter((a) => a.networkKind === subTab),
    [assignments, subTab]
  );

  const labelsByContact = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const a of assignmentsForSubTab) {
      const list = m.get(a.contactId) || [];
      if (!list.includes(a.startupLabel)) list.push(a.startupLabel);
      m.set(a.contactId, list);
    }
    return m;
  }, [assignmentsForSubTab]);

  const contactsByStartup = useMemo(() => {
    const m = new Map<string, { startupLabel: string; contactNames: string[] }>();
    const rowMap = new Map<string, string>();
    for (const r of subTab === 'service_provider' ? serviceRows : partnerRows) {
      rowMap.set(r.id, r.name || '—');
    }
    for (const a of assignmentsForSubTab) {
      const name = rowMap.get(a.contactId) || '(removed row)';
      const cur = m.get(a.startupKey);
      if (!cur) {
        m.set(a.startupKey, { startupLabel: a.startupLabel, contactNames: [name] });
      } else if (!cur.contactNames.includes(name)) {
        cur.contactNames.push(name);
      }
    }
    return Array.from(m.entries()).map(([startupKey, v]) => ({ startupKey, ...v }));
  }, [assignmentsForSubTab, serviceRows, partnerRows, subTab]);

  useEffect(() => {
    setSelectedContactIds([]);
  }, [subTab]);

  const toggleStartupKey = (key: string) => {
    setAssignSelectedStartupKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const openAssign = (c: PartnerNetworkContact) => {
    setAssignMode('single');
    setAssignContact(c);
    setAssignNetworkKind(subTab);
    setAssignSelectedStartupKeys([]);
    setAssignOpen(true);
  };

  const openBulkAssign = () => {
    if (selectedContactIds.length === 0) {
      messageService.info('Select contacts', 'Tick one or more rows, then use bulk assign.');
      return;
    }
    setAssignMode('bulk');
    setAssignContact(null);
    setAssignNetworkKind(subTab);
    setAssignSelectedStartupKeys([]);
    setAssignOpen(true);
  };

  const closeAssignModal = () => {
    setAssignOpen(false);
    setAssignContact(null);
    setAssignSelectedStartupKeys([]);
  };

  const confirmAssign = async () => {
    if (!facilitatorId) return;
    if (startupOptions.length === 0) {
      messageService.warning(
        'No startups',
        'Accept startups under Intake Management first so they appear in Track My Startups → Portfolio.'
      );
      return;
    }
    if (assignSelectedStartupKeys.length === 0) {
      messageService.warning('Select startups', 'Choose at least one startup to link.');
      return;
    }

    const contactIds: string[] =
      assignMode === 'single' && assignContact
        ? [assignContact.id]
        : selectedContactIds.filter((id) => rows.some((r) => r.id === id));

    if (contactIds.length === 0) {
      messageService.warning('No contacts', 'No valid contacts to assign.');
      return;
    }

    const opts = assignSelectedStartupKeys
      .map((k) => startupOptions.find((o) => o.key === k))
      .filter((o): o is StartupOption => Boolean(o));

    const pairs: { startup_id: number; contact_id: string }[] = [];
    for (const contactId of contactIds) {
      for (const opt of opts) {
        pairs.push({ startup_id: opt.startupId, contact_id: contactId });
      }
    }

    setIsSavingAssign(true);
    try {
      const { inserted, skipped } = await facilitatorNetworkService.createAssignments(facilitatorId, pairs);
      if (inserted === 0) {
        messageService.info(
          'No new links',
          skipped > 0
            ? 'Every selected pair was already linked (same contact + startup).'
            : 'Nothing to add.'
        );
      } else {
        messageService.success(
          'Assigned',
          `${inserted} link(s) saved${skipped ? ` (${skipped} duplicate pair(s) skipped)` : ''}.`
        );
        setSelectedContactIds([]);
      }
      await reload();
    } catch (e) {
      console.error(e);
      messageService.error('Save failed', 'Could not save assignments. Check database policies and migration.');
    } finally {
      setIsSavingAssign(false);
      closeAssignModal();
    }
  };

  const appendRowsForCurrentTab = (next: PartnerNetworkContact[]) => {
    if (subTab === 'service_provider') setServiceRows((prev) => [...next, ...prev]);
    else setPartnerRows((prev) => [...next, ...prev]);
  };

  const removeRow = async (id: string) => {
    if (!confirm('Remove this contact? Assignments to startups will be removed too.')) return;
    const ok = await facilitatorNetworkService.deleteContact(id);
    if (!ok) {
      messageService.error('Delete failed', 'Could not delete contact.');
      return;
    }
    setAssignments((prev) => prev.filter((a) => a.contactId !== id));
    if (subTab === 'service_provider') setServiceRows((prev) => prev.filter((r) => r.id !== id));
    else setPartnerRows((prev) => prev.filter((r) => r.id !== id));
    messageService.success('Removed', 'Contact deleted.');
  };

  const addManual = async () => {
    if (!facilitatorId) return;
    if (!form.name.trim()) {
      messageService.warning('Validation', 'Name is required.');
      return;
    }
    const created = await facilitatorNetworkService.createContact(facilitatorId, {
      network_kind: subTab,
      name: form.name.trim(),
      contactNumber: form.contactNumber.trim(),
      email: form.email.trim(),
      serviceType: form.serviceType.trim(),
    });
    if (!created) {
      messageService.error('Save failed', 'Could not add contact. Run the database migration if tables are missing.');
      return;
    }
    appendRowsForCurrentTab([rowToContact(created)]);
    setForm({ name: '', contactNumber: '', email: '', serviceType: '' });
    setIsAddOpen(false);
    messageService.success('Added', 'Contact saved.');
  };

  const onPickCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !facilitatorId) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const text = String(reader.result || '');
      const parsed = parseContactsFromCsv(text);
      if (!parsed || parsed.length === 0) {
        messageService.error(
          'CSV format',
          'Could not read CSV. Use a header row with: Name, Contact number, Email, Service type (column names can vary slightly).'
        );
        return;
      }
      const created = await facilitatorNetworkService.createContactsBulk(facilitatorId, subTab, parsed);
      if (!created.length) {
        messageService.error('Import failed', 'Could not import rows.');
        return;
      }
      appendRowsForCurrentTab(created.map(rowToContact));
      messageService.success('Import', `${created.length} row(s) saved.`);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const header = 'Name,Contact number,Email id,Service type\n';
    const sample = 'Acme Legal,+919900000001,contact@acme.example,Legal & compliance\n';
    const blob = new Blob([header + sample], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partner_network_template_${subTab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!facilitatorId) {
    return (
      <Card className="p-8">
        <p className="text-slate-600 text-sm">Loading facilitator session…</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Partner network</h2>
        <p className="text-slate-600 mt-1 text-sm">
          Assignable startups match <strong className="text-slate-800">Track My Startups</strong> → Portfolio (accepted
          applications). Contacts and links are saved to your database. Run{' '}
          <code className="text-xs bg-slate-100 px-1 rounded">database/facilitator_network_contacts_and_assignments.sql</code>{' '}
          in Supabase if tables are missing.
        </p>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-4" aria-label="Partner sub-tabs">
          <button
            type="button"
            onClick={() => setSubTab('service_provider')}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              subTab === 'service_provider'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Service provider
          </button>
          <button
            type="button"
            onClick={() => setSubTab('partner')}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              subTab === 'partner'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Partner
          </button>
        </nav>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-slate-800">
            {subTab === 'service_provider' ? 'Service providers' : 'Partners'}
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={downloadTemplate} className="gap-1">
              <Download className="h-4 w-4" />
              CSV template
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1">
              <Upload className="h-4 w-4" />
              Bulk upload CSV
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onPickCsv} />
            <Button type="button" size="sm" onClick={() => setIsAddOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" />
              Add row
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={openBulkAssign}
              disabled={selectedContactIds.length === 0}
              className="gap-1"
            >
              <Users className="h-4 w-4" />
              Assign selected to startups
              {selectedContactIds.length > 0 ? ` (${selectedContactIds.length})` : ''}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          {isLoading ? (
            <div className="p-10 text-center text-slate-500 text-sm">Loading…</div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-3 w-10 text-left">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300"
                      checked={allRowsSelected}
                      onChange={toggleAllRows}
                      disabled={rows.length === 0}
                      title="Select all rows"
                      aria-label="Select all rows"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Contact number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email id</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Service type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Assigned to
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500 text-sm">
                      No rows yet. Add manually or upload a CSV.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300"
                          checked={selectedContactIds.includes(row.id)}
                          onChange={() => toggleRowSelected(row.id)}
                          aria-label={`Select ${row.name || 'row'}`}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.contactNumber || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.email || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.serviceType || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {(labelsByContact.get(row.id) || []).length ? (
                          <span className="text-slate-800">{(labelsByContact.get(row.id) || []).join(', ')}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button type="button" size="sm" variant="outline" onClick={() => openAssign(row)} className="mr-2 gap-1">
                          <UserPlus className="h-3.5 w-3.5" />
                          Assign to startups
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => removeRow(row.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-slate-500" />
          <h3 className="text-lg font-semibold text-slate-800">Linked contacts per startup</h3>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Current links for this sub-tab (service providers vs partners). Switch sub-tab to manage the other list.
        </p>
        {contactsByStartup.length === 0 ? (
          <p className="text-sm text-slate-500">No links yet for this tab.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-slate-100">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Startup</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    {subTab === 'service_provider' ? 'Service providers' : 'Partners'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {contactsByStartup.map((row) => (
                  <tr key={row.startupKey} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-900 whitespace-nowrap">{row.startupLabel}</td>
                    <td className="px-3 py-2 text-slate-700">{row.contactNames.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add contact" size="md">
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <Input
            label="Contact number"
            value={form.contactNumber}
            onChange={(e) => setForm((f) => ({ ...f, contactNumber: e.target.value }))}
          />
          <Input
            label="Email id"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            label="Service type"
            value={form.serviceType}
            onChange={(e) => setForm((f) => ({ ...f, serviceType: e.target.value }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void addManual()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={assignOpen} onClose={closeAssignModal} title={assignMode === 'bulk' ? 'Bulk assign to startups' : 'Assign to startups'} size="md">
        <div className="space-y-4">
          {assignMode === 'single' && assignContact ? (
            <p className="text-sm text-slate-600">
              Link <span className="font-semibold text-slate-900">{assignContact.name}</span> to one or more startups.
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              Link <span className="font-semibold text-slate-900">{selectedContactIds.length} selected contact(s)</span>{' '}
              to one or more startups. Every contact will be linked to every ticked startup (existing pairs are skipped).
            </p>
          )}
          {startupOptions.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-md p-3">
              No accepted startups yet. Accept applications under Intake Management so they show in Track My Startups →
              Portfolio, then return here to assign.
            </p>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="block text-sm font-medium text-slate-700">Startups (select any number)</label>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    className="text-xs font-medium text-brand-primary hover:underline"
                    onClick={() => setAssignSelectedStartupKeys(startupOptions.map((o) => o.key))}
                  >
                    Select all
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    className="text-xs font-medium text-slate-600 hover:underline"
                    onClick={() => setAssignSelectedStartupKeys([])}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto rounded-md border border-slate-200 divide-y divide-slate-100 bg-white">
                {startupOptions.map((o) => (
                  <label
                    key={o.key}
                    className="flex items-start gap-2 px-3 py-2.5 hover:bg-slate-50 cursor-pointer text-sm text-slate-800"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-slate-300"
                      checked={assignSelectedStartupKeys.includes(o.key)}
                      onChange={() => toggleStartupKey(o.key)}
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {assignSelectedStartupKeys.length} startup(s) selected
                {assignMode === 'bulk' && selectedContactIds.length > 0 && assignSelectedStartupKeys.length > 0
                  ? ` → up to ${selectedContactIds.length * assignSelectedStartupKeys.length} new link(s) if none exist yet`
                  : ''}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeAssignModal} disabled={isSavingAssign}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void confirmAssign()} disabled={!startupOptions.length || isSavingAssign}>
              {isSavingAssign ? 'Saving…' : 'Save links'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PartnerNetworkTab;
