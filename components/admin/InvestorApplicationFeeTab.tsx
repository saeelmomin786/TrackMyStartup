import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { IndianRupee, Search, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { isMissingRelationError } from '../../lib/postgrestErrors';

type ProfileRow = {
  user_id: string;
  investor_name?: string;
  /** HQ / firm type — `firm_name` is not on all DB schemas; we derive from global_hq + firm_type */
  firm_name?: string;
  user?: { name?: string };
};

const InvestorApplicationFeeTab: React.FC = () => {
  const [globalFee, setGlobalFee] = useState<string>('499');
  const [globalSaving, setGlobalSaving] = useState(false);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [feeOverrides, setFeeOverrides] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [rowSaving, setRowSaving] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { data: globalRow, error: gErr } = await supabase
        .from('investor_application_fee_settings')
        .select('fee_inr')
        .eq('id', 1)
        .maybeSingle();
      if (gErr && !isMissingRelationError(gErr)) throw gErr;
      if (!isMissingRelationError(gErr) && globalRow?.fee_inr != null) setGlobalFee(String(Number(globalRow.fee_inr)));

      const { data: invData, error: invErr } = await supabase
        .from('investor_profiles')
        .select('user_id, investor_name, global_hq, firm_type')
        .order('investor_name', { ascending: true });
      if (invErr && !isMissingRelationError(invErr)) throw invErr;
      if (isMissingRelationError(invErr)) {
        setProfiles([]);
        setFeeOverrides({});
        return;
      }

      const userIds = [...new Set((invData || []).map((p: any) => p.user_id).filter(Boolean))];
      let userMap = new Map<string, { name?: string }>();
      if (userIds.length > 0) {
        const { data: profilesData, error: upErr } = await supabase
          .from('user_profiles')
          .select('auth_user_id, name')
          .in('auth_user_id', userIds);
        if (!upErr && profilesData) {
          for (const row of profilesData as { auth_user_id?: string; name?: string }[]) {
            const aid = row.auth_user_id;
            if (aid && !userMap.has(aid)) userMap.set(aid, { name: row.name });
          }
        }
      }

      const merged: ProfileRow[] = (invData || []).map((p: any) => {
        const bits = [p.global_hq, p.firm_type].filter(Boolean);
        const firmLine = bits.length ? bits.join(' · ') : undefined;
        return {
          user_id: p.user_id,
          investor_name: p.investor_name,
          firm_name: firmLine,
          user: userMap.get(p.user_id) || {},
        };
      });
      setProfiles(merged);

      const ids = merged.map(p => p.user_id).filter(Boolean);
      const overrides: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: feeRows, error: fErr } = await supabase
          .from('investor_application_fees')
          .select('investor_user_id, fee_inr')
          .in('investor_user_id', ids);
        if (fErr && !isMissingRelationError(fErr)) throw fErr;
        (feeRows || []).forEach((r: any) => {
          if (r.investor_user_id != null && r.fee_inr != null) {
            overrides[r.investor_user_id] = String(Number(r.fee_inr));
          }
        });
      }
      setFeeOverrides(overrides);
    } catch (e: any) {
      console.error(e);
      setMessage({
        type: 'error',
        text:
          isMissingRelationError(e) || e?.message?.includes('schema cache')
            ? 'Missing fee tables. Run database/investor_application_fee_and_columns.sql and database/investor_application_fees_per_investor.sql in Supabase.'
            : e?.message || 'Failed to load.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const globalNum = useMemo(() => {
    const n = parseFloat(globalFee);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [globalFee]);

  const saveGlobal = async () => {
    if (!Number.isFinite(globalNum) || globalNum < 0) {
      setMessage({ type: 'error', text: 'Enter a valid non-negative default fee (INR).' });
      return;
    }
    setGlobalSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('investor_application_fee_settings')
        .upsert({ id: 1, fee_inr: globalNum, updated_at: new Date().toISOString() }, { onConflict: 'id' });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Default application fee saved. It applies to any investor without a custom fee.' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Save failed.' });
    } finally {
      setGlobalSaving(false);
    }
  };

  const setOverrideInput = (investorUserId: string, value: string) => {
    setFeeOverrides(prev => ({ ...prev, [investorUserId]: value }));
  };

  const saveInvestorRow = async (investorUserId: string) => {
    const raw = (feeOverrides[investorUserId] ?? '').trim();
    setRowSaving(investorUserId);
    setMessage(null);
    try {
      if (raw === '') {
        const { error } = await supabase.from('investor_application_fees').delete().eq('investor_user_id', investorUserId);
        if (error) throw error;
        setFeeOverrides(prev => {
          const next = { ...prev };
          delete next[investorUserId];
          return next;
        });
        setMessage({ type: 'success', text: 'Cleared custom fee — this investor now uses the default fee.' });
        return;
      }
      const n = parseFloat(raw);
      if (!Number.isFinite(n) || n < 0) {
        setMessage({ type: 'error', text: 'Custom fee must be a non-negative number, or leave empty for default.' });
        return;
      }
      const { error } = await supabase.from('investor_application_fees').upsert(
        { investor_user_id: investorUserId, fee_inr: n, updated_at: new Date().toISOString() },
        { onConflict: 'investor_user_id' }
      );
      if (error) throw error;
      setMessage({ type: 'success', text: 'Custom fee saved for this investor.' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Save failed.' });
    } finally {
      setRowSaving(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(p => {
      const name = (p.investor_name || p.user?.name || '').toLowerCase();
      const firm = (p.firm_name || '').toLowerCase();
      return name.includes(q) || firm.includes(q);
    });
  }, [profiles, search]);

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-slate-600 text-sm">Loading…</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 max-w-xl">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Default application fee</h2>
        <p className="text-sm text-slate-600 mb-4">
          Used for any investor who does not have a custom fee below. Set to 0 so applications are free unless a per-investor fee is set.
        </p>
        <div className="flex items-center gap-2 mb-4">
          <IndianRupee className="h-5 w-5 text-slate-400" />
          <input
            type="number"
            min={0}
            step="1"
            value={globalFee}
            onChange={e => setGlobalFee(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
          />
          <Button variant="primary" onClick={saveGlobal} disabled={globalSaving}>
            {globalSaving ? 'Saving…' : 'Save default'}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Per-investor fee</h2>
        <p className="text-sm text-slate-600 mb-4">
          Override the default for specific investors. Leave the field empty and save to clear the override and use the default again.
        </p>
        {message && (
          <div
            className={`mb-4 text-sm px-3 py-2 rounded border ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by investor or firm…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Investor</th>
                <th className="text-left px-3 py-2 font-medium">Firm</th>
                <th className="text-left px-3 py-2 font-medium">Custom fee (INR)</th>
                <th className="text-left px-3 py-2 font-medium w-28"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                    No investors found.
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const id = p.user_id;
                  const displayName = p.investor_name || p.user?.name || 'Investor';
                  const inputVal = feeOverrides[id] ?? '';
                  return (
                    <tr key={id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-900">{displayName}</td>
                      <td className="px-3 py-2 text-slate-600">{p.firm_name || '—'}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step="1"
                          placeholder={`Default (₹${globalNum.toLocaleString('en-IN')})`}
                          value={inputVal}
                          onChange={e => setOverrideInput(id, e.target.value)}
                          className="w-36 px-2 py-1.5 border border-slate-300 rounded-md"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => saveInvestorRow(id)}
                          disabled={rowSaving === id}
                          className="whitespace-nowrap"
                        >
                          <Save className="h-3.5 w-3.5 mr-1 inline" />
                          {rowSaving === id ? '…' : 'Save'}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default InvestorApplicationFeeTab;
