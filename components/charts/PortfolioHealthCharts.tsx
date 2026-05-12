import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts';
import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StartupInfo {
  id: number;
  name: string;
}

interface QuestionMeta {
  id: string;
  question_text: string;
  category: string | null;
  question_type: string;
}

interface PortfolioHealthChartsProps {
  /** Only accepted startups should be passed here */
  startups: StartupInfo[];
  facilitatorId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = ['2024', '2025', '2026'];

const LINE_COLORS = [
  '#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626',
  '#0891B2', '#9333EA', '#16A34A', '#CA8A04', '#EF4444',
];

// Keywords used to auto-detect the 4 fixed chart questions
const EMPLOYEE_KW = ['employees', 'employee count', 'headcount', 'team size', 'team members'];
const PATENT_KW   = ['patents has', 'patents filed', 'how many patents'];
const MALE_KW     = ['male founder', 'male co-founder', 'number of male'];
const FEMALE_KW   = ['female founder', 'female co-founder', 'women founder', 'woman founder', 'number of female'];
const GROWTH_YOY  = ['year-on-year', 'year on year', 'yoy revenue'];
const GROWTH_MOM  = ['month-on-month', 'month on month', 'mom revenue'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

function toNumber(raw: string | undefined | null): number {
  if (!raw) return 0;
  const n = parseFloat(raw);
  return isNaN(n) ? 0 : n;
}

function parseJsonGrowth(raw: string | undefined | null): Record<string, number> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, number>;
    }
  } catch { /* not JSON */ }
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const RADIAN = Math.PI / 180;
const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.6;
  return (
    <text
      x={cx + r * Math.cos(-midAngle * RADIAN)}
      y={cy + r * Math.sin(-midAngle * RADIAN)}
      fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={12} fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const ChartCard: React.FC<{ title: string; extra?: React.ReactNode; children: React.ReactNode }> = ({ title, extra, children }) => (
  <div className="bg-white rounded-xl shadow-sm p-6">
    <div className="flex items-center justify-between mb-4">
      <p className="font-semibold text-base text-[#0f172a]">{title}</p>
      {extra}
    </div>
    {children}
  </div>
);

const Spinner = ({ color = 'blue' }: { color?: string }) => (
  <div className="flex items-center justify-center" style={{ height: 220 }}>
    <div className={`animate-spin rounded-full h-6 w-6 border-b-2 border-${color}-600`} />
  </div>
);

const EmptySlate = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center justify-center text-slate-400 text-sm gap-1" style={{ height: 220 }}>
    <span>No {label} data found in responses</span>
    <span className="text-xs text-slate-300">Ask startups to fill in their tracking questions</span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const PortfolioHealthCharts: React.FC<PortfolioHealthChartsProps> = ({ startups }) => {
  // Raw data from Supabase
  const [rawResponses, setRawResponses] = useState<Record<number, Record<string, string>>>({});
  const [allQuestions, setAllQuestions]   = useState<QuestionMeta[]>([]);
  const [loading, setLoading]             = useState(true);

  // Growth toggle
  const [growthMode, setGrowthMode] = useState<'yoy' | 'mom'>('yoy');

  // "Add More Charts" picker
  const [pickerOpen, setPickerOpen]               = useState(false);
  const [selectedExtraQIds, setSelectedExtraQIds] = useState<string[]>([]);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!startups.length) { setLoading(false); return; }
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(startups.map(s => s.id).sort())]);

  async function fetchAll() {
    setLoading(true);
    try {
      const ids = startups.map(s => s.id);

      const [{ data: questions }, { data: responses }] = await Promise.all([
        supabase.from('application_question_bank').select('id, question_text, category, question_type'),
        supabase.from('program_tracking_responses')
          .select('startup_id, question_id, answer_text')
          .in('startup_id', ids),
      ]);

      setAllQuestions((questions || []) as QuestionMeta[]);

      const grouped: Record<number, Record<string, string>> = {};
      (responses || []).forEach((r: any) => {
        if (!grouped[r.startup_id]) grouped[r.startup_id] = {};
        // Keep the latest answer (last wins – responses already sorted by updated_at)
        grouped[r.startup_id][r.question_id] = r.answer_text;
      });
      setRawResponses(grouped);
    } catch (err) {
      console.error('PortfolioHealthCharts fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  // ── Derived question maps ─────────────────────────────────────────────────────

  const qTextMap = useMemo<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    allQuestions.forEach(q => { m[q.id] = q.question_text; });
    return m;
  }, [allQuestions]);

  // Questions available in the picker (numeric type, not already a fixed chart)
  const pickerQuestions = useMemo<QuestionMeta[]>(() => {
    return allQuestions.filter(q => q.question_type === 'number');
  }, [allQuestions]);

  // ── Helper: get first matching answer for a startup ───────────────────────────

  function getAnswer(startupId: number, keywords: string[]): string | null {
    const answers = rawResponses[startupId] || {};
    for (const [qId, answer] of Object.entries(answers)) {
      const text = qTextMap[qId] || '';
      if (matchesAny(text, keywords)) return answer;
    }
    return null;
  }

  // ── Chart data ────────────────────────────────────────────────────────────────

  const employeeData = useMemo(() =>
    startups.map(s => ({ name: s.name, value: toNumber(getAnswer(s.id, EMPLOYEE_KW)) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawResponses, qTextMap, startups]);

  const patentData = useMemo(() =>
    startups.map(s => ({ name: s.name, value: toNumber(getAnswer(s.id, PATENT_KW)) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawResponses, qTextMap, startups]);

  const genderData = useMemo(() => {
    let male = 0, female = 0;
    startups.forEach(s => {
      male   += toNumber(getAnswer(s.id, MALE_KW));
      female += toNumber(getAnswer(s.id, FEMALE_KW));
    });
    return [
      { name: 'Male Founders',   value: male },
      { name: 'Female Founders', value: female },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawResponses, qTextMap, startups]);

  const { growthRows, growthStartups } = useMemo(() => {
    const kw = growthMode === 'yoy' ? GROWTH_YOY : GROWTH_MOM;
    const periods = growthMode === 'yoy' ? YEARS : MONTHS;
    const rows: Record<string, string | number>[] = periods.map(p => ({ period: p }));
    const names: string[] = [];

    startups.forEach(s => {
      const raw = getAnswer(s.id, kw);
      const obj = parseJsonGrowth(raw);
      if (!obj) return;
      const hasAny = periods.some(p => obj[p] != null || obj[p.toLowerCase()] != null || obj[p.toUpperCase()] != null);
      if (!hasAny) return;
      names.push(s.name);
      periods.forEach((p, i) => {
        const val = obj[p] ?? obj[p.toLowerCase()] ?? obj[p.toUpperCase()];
        if (val != null) rows[i][s.name] = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
      });
    });

    return { growthRows: rows, growthStartups: names };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawResponses, qTextMap, startups, growthMode]);

  // ── Extra charts (from picker) ────────────────────────────────────────────────

  const extraChartData = useMemo(() => {
    return selectedExtraQIds.map(qId => {
      const question = allQuestions.find(q => q.id === qId);
      const data = startups.map(s => ({
        name: s.name,
        value: toNumber(rawResponses[s.id]?.[qId]),
      }));
      return { qId, label: question?.question_text || qId, category: question?.category || '', data };
    });
  }, [selectedExtraQIds, rawResponses, allQuestions, startups]);

  // ── Guard: nothing to show ────────────────────────────────────────────────────

  if (!startups.length) return null;

  // ── Render ────────────────────────────────────────────────────────────────────

  const hasEmployee = employeeData.some(d => d.value > 0);
  const hasPatent   = patentData.some(d => d.value > 0);
  const hasGender   = genderData.some(d => d.value > 0);

  const hBarTooltip = { contentStyle: { borderRadius: '0.5rem', borderColor: '#e2e8f0', fontSize: 12 } };

  function toggleExtraQ(qId: string) {
    setSelectedExtraQIds(prev =>
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#0f172a]">Portfolio Health</h2>
        <span className="text-xs text-slate-400">
          {startups.length} accepted startup{startups.length !== 1 ? 's' : ''} · data from Track My Startups responses
        </span>
      </div>

      {/* ── 2×2 Fixed Charts ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Chart 1 — Employee Count */}
        <ChartCard title="Employee Count by Startup">
          {loading ? <Spinner /> : !hasEmployee ? <EmptySlate label="employee count" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={employeeData} layout="vertical" margin={{ top: 0, right: 20, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={90} tick={{ fill: '#334155' }} />
                <Tooltip {...hBarTooltip} formatter={(v: number) => [v, 'Employees']} />
                <Bar dataKey="value" name="Employees" fill="#2563EB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 2 — Patents Filed */}
        <ChartCard title="Patents Filed by Startup">
          {loading ? <Spinner color="purple" /> : !hasPatent ? <EmptySlate label="patent" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={patentData} layout="vertical" margin={{ top: 0, right: 20, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={90} tick={{ fill: '#334155' }} />
                <Tooltip {...hBarTooltip} formatter={(v: number) => [v, 'Patents']} />
                <Bar dataKey="value" name="Patents" fill="#7C3AED" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 3 — Founder Gender Ratio */}
        <ChartCard title="Founder Gender Ratio">
          {loading ? <Spinner /> : !hasGender ? <EmptySlate label="founder gender" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={genderData} cx="50%" cy="45%" innerRadius={52} outerRadius={82}
                  dataKey="value" labelLine={false} label={PieLabel}>
                  <Cell fill="#2563EB" />
                  <Cell fill="#EC4899" />
                </Pie>
                <Tooltip {...hBarTooltip} formatter={(v: number, name: string) => [v, name]} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 4 — Accumulated Growth */}
        <ChartCard
          title="Accumulated Growth"
          extra={
            <div className="flex gap-1">
              {(['yoy', 'mom'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setGrowthMode(m)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    growthMode === m
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {m === 'yoy' ? 'Year-on-Year' : 'Month-on-Month'}
                </button>
              ))}
            </div>
          }
        >
          {loading ? <Spinner /> : growthStartups.length === 0 ? <EmptySlate label="growth" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={growthRows} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ borderRadius: '0.5rem', borderColor: '#e2e8f0', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                {growthStartups.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Extra Charts ── */}
      {extraChartData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {extraChartData.map(({ qId, label, data }) => {
            const hasData = data.some(d => d.value > 0);
            return (
              <ChartCard
                key={qId}
                title={label}
                extra={
                  <button
                    onClick={() => toggleExtraQ(qId)}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                    title="Remove chart"
                  >
                    ✕
                  </button>
                }
              >
                {!hasData ? <EmptySlate label={label.toLowerCase()} /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={90} tick={{ fill: '#334155' }} />
                      <Tooltip {...hBarTooltip} formatter={(v: number) => [v, 'Value']} />
                      <Bar dataKey="value" fill="#059669" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            );
          })}
        </div>
      )}

      {/* ── Add More Charts Section ── */}
      <div className="mt-6">
        <button
          onClick={() => setPickerOpen(o => !o)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-blue-300 text-blue-600 text-sm font-medium hover:bg-blue-50 transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          {pickerOpen ? 'Hide question picker' : 'Add more charts from questions'}
        </button>

        {pickerOpen && (
          <div className="mt-3 bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <p className="text-sm font-medium text-slate-700 mb-1">
              Select numeric questions to chart across all accepted startups
            </p>
            <p className="text-xs text-slate-400 mb-4">
              Only numeric questions are shown. Startups must have answered the question via Track My Startups.
            </p>

            {loading ? (
              <p className="text-sm text-slate-400">Loading questions…</p>
            ) : pickerQuestions.length === 0 ? (
              <p className="text-sm text-slate-400">No numeric questions found in the question bank.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {pickerQuestions.map(q => {
                  const checked = selectedExtraQIds.includes(q.id);
                  // Count how many startups answered this question
                  const answeredCount = startups.filter(s =>
                    rawResponses[s.id]?.[q.id] !== undefined && rawResponses[s.id]?.[q.id] !== ''
                  ).length;

                  return (
                    <label
                      key={q.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        checked
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-blue-600"
                        checked={checked}
                        onChange={() => toggleExtraQ(q.id)}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 leading-snug">{q.question_text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {q.category && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                              {q.category}
                            </span>
                          )}
                          <span className={`text-[10px] font-medium ${answeredCount > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                            {answeredCount}/{startups.length} responded
                          </span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioHealthCharts;
