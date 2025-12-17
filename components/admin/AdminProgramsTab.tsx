import React, { useEffect, useState, useRef } from 'react';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { adminProgramsService, AdminProgramPost } from '../../lib/adminProgramsService';
import { generalDataService, GeneralDataItem } from '../../lib/generalDataService';
import { toDirectImageUrl } from '../../lib/imageUrl';
import { Calendar, ExternalLink, Trash2, X, Edit } from 'lucide-react';

const AdminProgramsTab: React.FC = () => {
  const [form, setForm] = useState({
    programName: '',
    incubationCenter: '',
    deadline: '',
    applicationLink: '',
    description: '',
    posterUrl: '',
    grantAmount: '',
    country: [] as string[],
    domain: [] as string[],
    stage: [] as string[],
    rounds: [] as string[]
  });
  const [loading, setLoading] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [posts, setPosts] = useState<AdminProgramPost[]>([]);
  const [countries, setCountries] = useState<GeneralDataItem[]>([]);
  const [domains, setDomains] = useState<GeneralDataItem[]>([]);
  const [stages, setStages] = useState<GeneralDataItem[]>([]);
  const [rounds, setRounds] = useState<GeneralDataItem[]>([]);
  const [showRoundsDropdown, setShowRoundsDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showDomainDropdown, setShowDomainDropdown] = useState(false);
  const [showStageDropdown, setShowStageDropdown] = useState(false);
  const roundsDropdownRef = useRef<HTMLDivElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const domainDropdownRef = useRef<HTMLDivElement>(null);
  const stageDropdownRef = useRef<HTMLDivElement>(null);

  const loadPosts = async () => {
    try {
      const data = await adminProgramsService.listActive();
      setPosts(data);
    } catch (e) {
      console.error('Failed to load admin program posts', e);
    }
  };

  useEffect(() => {
    loadPosts();
    loadDropdownData();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roundsDropdownRef.current && !roundsDropdownRef.current.contains(event.target as Node)) {
        setShowRoundsDropdown(false);
      }
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
      if (domainDropdownRef.current && !domainDropdownRef.current.contains(event.target as Node)) {
        setShowDomainDropdown(false);
      }
      if (stageDropdownRef.current && !stageDropdownRef.current.contains(event.target as Node)) {
        setShowStageDropdown(false);
      }
    };

    if (showRoundsDropdown || showCountryDropdown || showDomainDropdown || showStageDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRoundsDropdown, showCountryDropdown, showDomainDropdown, showStageDropdown]);

  const loadDropdownData = async () => {
    try {
      const [countriesData, domainsData, stagesData, roundsData] = await Promise.all([
        generalDataService.getItemsByCategory('country'),
        generalDataService.getItemsByCategory('domain'),
        generalDataService.getItemsByCategory('stage'),
        generalDataService.getItemsByCategory('round_type')
      ]);
      setCountries(countriesData);
      setDomains(domainsData);
      setStages(stagesData);
      setRounds(roundsData);
    } catch (e) {
      console.error('Failed to load dropdown data', e);
    }
  };

  const handleMultiSelectToggle = (field: 'country' | 'domain' | 'stage' | 'rounds', value: string) => {
    setForm(prev => {
      const currentValues = prev[field] || [];
      if (currentValues.includes(value)) {
        return { ...prev, [field]: currentValues.filter(v => v !== value) };
      } else {
        return { ...prev, [field]: [...currentValues, value] };
      }
    });
  };

  const handleRemoveItem = (field: 'country' | 'domain' | 'stage' | 'rounds', value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: (prev[field] || []).filter(v => v !== value)
    }));
  };

  const handleEdit = (post: AdminProgramPost) => {
    console.log('Edit button clicked for post:', post);
    console.log('Post data:', {
      country: post.country,
      domain: post.domain,
      stage: post.stage,
      rounds: post.rounds,
      grantAmount: post.grantAmount
    });
    
    // Close all dropdowns
    setShowCountryDropdown(false);
    setShowDomainDropdown(false);
    setShowStageDropdown(false);
    setShowRoundsDropdown(false);
    
    setEditingPostId(post.id);
    const formData = {
      programName: post.programName,
      incubationCenter: post.incubationCenter,
      deadline: post.deadline,
      applicationLink: post.applicationLink,
      description: post.description || '',
      posterUrl: post.posterUrl || '',
      grantAmount: post.grantAmount ? post.grantAmount.toString() : '',
      country: Array.isArray(post.country) ? post.country : (post.country ? [post.country] : []),
      domain: Array.isArray(post.domain) ? post.domain : (post.domain ? [post.domain] : []),
      stage: Array.isArray(post.stage) ? post.stage : (post.stage ? [post.stage] : []),
      rounds: Array.isArray(post.rounds) ? post.rounds : (post.rounds ? [post.rounds] : [])
    };
    
    console.log('Setting form data:', formData);
    setForm(formData);
    console.log('Form state updated, editingPostId:', post.id);
    
    // Scroll to form
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleCancelEdit = () => {
    setEditingPostId(null);
    setForm({ 
      programName: '', 
      incubationCenter: '', 
      deadline: '', 
      applicationLink: '', 
      description: '', 
      posterUrl: '',
      grantAmount: '',
      country: [],
      domain: [],
      stage: [],
      rounds: []
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.programName || !form.incubationCenter || !form.deadline || !form.applicationLink) return;
    setLoading(true);
    try {
      const normalizedPoster = toDirectImageUrl(form.posterUrl);
      const postData = {
        programName: form.programName.trim(),
        incubationCenter: form.incubationCenter.trim(),
        deadline: form.deadline,
        applicationLink: form.applicationLink.trim(),
        description: form.description.trim(),
        posterUrl: normalizedPoster || undefined,
        grantAmount: form.grantAmount ? parseFloat(form.grantAmount) : undefined,
        country: form.country.length > 0 ? form.country : undefined,
        domain: form.domain.length > 0 ? form.domain : undefined,
        stage: form.stage.length > 0 ? form.stage : undefined,
        rounds: form.rounds.length > 0 ? form.rounds : undefined
      };

      if (editingPostId) {
        await adminProgramsService.update(editingPostId, postData);
      } else {
        await adminProgramsService.create(postData);
      }

      setEditingPostId(null);
      setForm({ 
        programName: '', 
        incubationCenter: '', 
        deadline: '', 
        applicationLink: '', 
        description: '', 
        posterUrl: '',
        grantAmount: '',
        country: [],
        domain: [],
        stage: [],
        rounds: []
      });
      await loadPosts();
    } catch (e: any) {
      console.error(`Failed to ${editingPostId ? 'update' : 'create'} admin program post`, e);
      const msg = e?.message || (e?.error?.message) || 'Unknown error';
      alert(`Failed to ${editingPostId ? 'update' : 'post'} program. Server error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this program post?')) return;
    try {
      await adminProgramsService.delete(id);
      await loadPosts();
    } catch (e: any) {
      console.error('Failed to delete admin program post', e);
      const msg = e?.message || (e?.error?.message) || 'Unknown error';
      alert(`Failed to delete program. Server error: ${msg}`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold text-slate-700 mb-4">
          {editingPostId ? 'Edit Program' : 'Post a Program'}
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Program Name"
            placeholder="e.g., National Startup Awards"
            value={form.programName}
            onChange={e => setForm(prev => ({ ...prev, programName: e.target.value }))}
            required
          />
          <Input
            label="Incubation Center"
            placeholder="e.g., AIC XYZ Incubator"
            value={form.incubationCenter}
            onChange={e => setForm(prev => ({ ...prev, incubationCenter: e.target.value }))}
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.deadline}
                onChange={e => setForm(prev => ({ ...prev, deadline: e.target.value }))}
                required
              />
            </div>
          </div>
          <Input
            label="Application Link"
            placeholder="https://..."
            value={form.applicationLink}
            onChange={e => setForm(prev => ({ ...prev, applicationLink: e.target.value }))}
            required
          />
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Short description about the program..."
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <Input
            label="Grant Amount (optional)"
            type="number"
            placeholder="e.g., 50000"
            value={form.grantAmount}
            onChange={e => setForm(prev => ({ ...prev, grantAmount: e.target.value }))}
            min="0"
            step="0.01"
          />
          <div className="relative" ref={countryDropdownRef}>
            <label className="block text-sm font-medium text-slate-700 mb-1">Country (optional - multiple selection)</label>
            <div className="border border-slate-300 rounded-md bg-white">
              <button
                type="button"
                onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                className="w-full px-3 py-2 text-left text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className={form.country.length > 0 ? 'text-slate-900' : 'text-slate-500'}>
                  {form.country.length > 0 ? `${form.country.length} country/countries selected` : 'Select countries...'}
                </span>
                <svg className={`h-4 w-4 text-slate-500 transition-transform ${showCountryDropdown ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showCountryDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  <div className="p-2">
                    <div className="flex gap-2 mb-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setForm(prev => ({ ...prev, country: countries.map(c => c.name) }))}
                        className="text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setForm(prev => ({ ...prev, country: [] }))}
                        className="text-xs"
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {countries.map((country) => (
                        <label
                          key={country.id}
                          className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer rounded"
                        >
                          <input
                            type="checkbox"
                            checked={form.country.includes(country.name)}
                            onChange={() => handleMultiSelectToggle('country', country.name)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-2"
                          />
                          <span className="text-sm text-slate-700">{country.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {form.country.length > 0 && (
                <div className="px-3 py-2 border-t border-slate-200">
                  <div className="flex flex-wrap gap-2">
                    {form.country.map((countryName) => (
                      <span
                        key={countryName}
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {countryName}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem('country', countryName)}
                          className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="relative" ref={domainDropdownRef}>
            <label className="block text-sm font-medium text-slate-700 mb-1">Domain (optional - multiple selection)</label>
            <div className="border border-slate-300 rounded-md bg-white">
              <button
                type="button"
                onClick={() => setShowDomainDropdown(!showDomainDropdown)}
                className="w-full px-3 py-2 text-left text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className={form.domain.length > 0 ? 'text-slate-900' : 'text-slate-500'}>
                  {form.domain.length > 0 ? `${form.domain.length} domain(s) selected` : 'Select domains...'}
                </span>
                <svg className={`h-4 w-4 text-slate-500 transition-transform ${showDomainDropdown ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showDomainDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  <div className="p-2">
                    <div className="flex gap-2 mb-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setForm(prev => ({ ...prev, domain: domains.map(d => d.name) }))}
                        className="text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setForm(prev => ({ ...prev, domain: [] }))}
                        className="text-xs"
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {domains.map((domain) => (
                        <label
                          key={domain.id}
                          className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer rounded"
                        >
                          <input
                            type="checkbox"
                            checked={form.domain.includes(domain.name)}
                            onChange={() => handleMultiSelectToggle('domain', domain.name)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-2"
                          />
                          <span className="text-sm text-slate-700">{domain.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {form.domain.length > 0 && (
                <div className="px-3 py-2 border-t border-slate-200">
                  <div className="flex flex-wrap gap-2">
                    {form.domain.map((domainName) => (
                      <span
                        key={domainName}
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {domainName}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem('domain', domainName)}
                          className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="relative" ref={stageDropdownRef}>
            <label className="block text-sm font-medium text-slate-700 mb-1">Stage (optional - multiple selection)</label>
            <div className="border border-slate-300 rounded-md bg-white">
              <button
                type="button"
                onClick={() => setShowStageDropdown(!showStageDropdown)}
                className="w-full px-3 py-2 text-left text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className={form.stage.length > 0 ? 'text-slate-900' : 'text-slate-500'}>
                  {form.stage.length > 0 ? `${form.stage.length} stage(s) selected` : 'Select stages...'}
                </span>
                <svg className={`h-4 w-4 text-slate-500 transition-transform ${showStageDropdown ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showStageDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  <div className="p-2">
                    <div className="flex gap-2 mb-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setForm(prev => ({ ...prev, stage: stages.map(s => s.name) }))}
                        className="text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setForm(prev => ({ ...prev, stage: [] }))}
                        className="text-xs"
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {stages.map((stage) => (
                        <label
                          key={stage.id}
                          className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer rounded"
                        >
                          <input
                            type="checkbox"
                            checked={form.stage.includes(stage.name)}
                            onChange={() => handleMultiSelectToggle('stage', stage.name)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-2"
                          />
                          <span className="text-sm text-slate-700">{stage.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {form.stage.length > 0 && (
                <div className="px-3 py-2 border-t border-slate-200">
                  <div className="flex flex-wrap gap-2">
                    {form.stage.map((stageName) => (
                      <span
                        key={stageName}
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {stageName}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem('stage', stageName)}
                          className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="md:col-span-2 relative" ref={roundsDropdownRef}>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rounds (optional - multiple selection)</label>
            <div className="border border-slate-300 rounded-md bg-white">
              <button
                type="button"
                onClick={() => setShowRoundsDropdown(!showRoundsDropdown)}
                className="w-full px-3 py-2 text-left text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className={form.rounds.length > 0 ? 'text-slate-900' : 'text-slate-500'}>
                  {form.rounds.length > 0 ? `${form.rounds.length} round(s) selected` : 'Select rounds...'}
                </span>
                <svg className={`h-4 w-4 text-slate-500 transition-transform ${showRoundsDropdown ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showRoundsDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  <div className="p-2">
                    <div className="flex gap-2 mb-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setForm(prev => ({ ...prev, rounds: rounds.map(r => r.name) }))}
                        className="text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setForm(prev => ({ ...prev, rounds: [] }))}
                        className="text-xs"
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {rounds.map((round) => (
                        <label
                          key={round.id}
                          className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer rounded"
                        >
                          <input
                            type="checkbox"
                            checked={form.rounds.includes(round.name)}
                            onChange={() => handleMultiSelectToggle('rounds', round.name)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-2"
                          />
                          <span className="text-sm text-slate-700">{round.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {form.rounds.length > 0 && (
                <div className="px-3 py-2 border-t border-slate-200">
                  <div className="flex flex-wrap gap-2">
                    {form.rounds.map((roundName) => (
                      <span
                        key={roundName}
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {roundName}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem('rounds', roundName)}
                          className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <Input
            label="Poster URL (optional)"
            placeholder="https://.../poster.jpg"
            value={form.posterUrl}
            onChange={e => setForm(prev => ({ ...prev, posterUrl: e.target.value }))}
          />
          <div className="md:col-span-2 flex justify-end gap-2">
            {editingPostId && (
              <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={loading}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? (editingPostId ? 'Updating...' : 'Posting...') : (editingPostId ? 'Update Program' : 'Post Program')}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-slate-700 mb-4">Recent Posts</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Program</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Poster</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Incubation Center</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Grant Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Country</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Domain</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Stage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rounds</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Deadline</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {posts.map(p => (
                <tr key={p.id}>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{p.programName}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {p.posterUrl ? (
                      <img src={toDirectImageUrl(p.posterUrl)} alt={`${p.programName} poster`} className="h-10 w-16 object-cover rounded border" />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{p.incubationCenter}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {p.grantAmount ? `₹${p.grantAmount.toLocaleString('en-IN')}` : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {p.country && p.country.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.country.map((country, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {country}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {p.domain && p.domain.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.domain.map((domain, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {domain}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {p.stage && p.stage.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.stage.map((stage, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {stage}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {p.rounds && p.rounds.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.rounds.map((round, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {round}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{p.deadline}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <div className="flex gap-2 justify-end">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        type="button"
                        onClick={() => {
                          console.log('Edit button clicked for post:', p.id, p);
                          handleEdit(p);
                        }} 
                        className="border-green-300 text-green-600 hover:bg-green-50"
                        disabled={editingPostId === p.id}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <a href={p.applicationLink} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50">
                          <ExternalLink className="h-4 w-4 mr-1" /> Open Link
                        </Button>
                      </a>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDelete(p.id)} 
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        disabled={editingPostId === p.id}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td className="px-6 py-8 text-center text-slate-500" colSpan={10}>No posts yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AdminProgramsTab;


