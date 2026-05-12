import React, { useState, useEffect } from 'react';
import { Startup } from '../../types';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { FileText, MessageCircle, Download, CheckCircle, Clock, XCircle, Building2, TrendingUp, Target, AlertCircle } from 'lucide-react';
import StartupMessagingModal from './StartupMessagingModal';
import StartupContractModal from './StartupContractModal';
import { Form2SubmissionModal } from '../Form2SubmissionModal';
import Modal from '../ui/Modal';

interface IncubationProgram {
  id: string;
  applicationId: string;
  programName: string;
  facilitatorName: string;
  facilitatorId: string;
  facilitatorCode: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  agreementUrl?: string;
  contractUrl?: string;
  isShortlisted: boolean;
  form2: {
    requested: boolean;
    status: 'not_requested' | 'pending' | 'submitted' | 'under_review';
    requestedAt?: string;
    submittedAt?: string;
  };
  opportunityId: string;
}

interface IncubationCenterTabProps {
  startup: Startup;
  isViewOnly?: boolean;
}

const IncubationCenterTab: React.FC<IncubationCenterTabProps> = ({ startup, isViewOnly = false }) => {
  const [incubationPrograms, setIncubationPrograms] = useState<IncubationProgram[]>([]);
  const [filteredPrograms, setFilteredPrograms] = useState<IncubationProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'form2_pending'>('all');

  // Modal states
  const [isMessagingModalOpen, setIsMessagingModalOpen] = useState(false);
  const [selectedProgramForMessaging, setSelectedProgramForMessaging] = useState<IncubationProgram | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedProgramForContract, setSelectedProgramForContract] = useState<IncubationProgram | null>(null);
  const [isForm2ModalOpen, setIsForm2ModalOpen] = useState(false);
  const [selectedForm2Data, setSelectedForm2Data] = useState<{
    applicationId: string;
    opportunityId: string;
    opportunityName: string;
  } | null>(null);
  const [isRecognitionModalOpen, setIsRecognitionModalOpen] = useState(false);
  const [recognitionFormState, setRecognitionFormState] = useState<{[key:string]: any}>({});

  // Load incubation programs
  const loadIncubationPrograms = async () => {
    try {
      setIsLoading(true);
      const { data: allApplications, error: applicationsError } = await supabase
        .from('opportunity_applications')
        .select('*')
        .eq('startup_id', startup.id);

      if (applicationsError) throw applicationsError;

      // Filter for incubation applications
      const incubationApplications = (allApplications || []).filter(app => app.type === 'Incubation');

      // Fetch facilitator data for all applications
      const facilitatorData: { [key: string]: any } = {};
      for (const app of incubationApplications) {
        const { data: opportunity, error: opportunityError } = await supabase
          .from('opportunities')
          .select('*, facilitator_profile:facilitator_id(*)' )
          .eq('id', app.opportunity_id)
          .single();

        if (!opportunityError && opportunity) {
          facilitatorData[app.opportunity_id] = opportunity;
        }
      }

      // Load Form 2 requests for each incubation application
      const incubationProgramsWithForm2 = await Promise.all(
        incubationApplications.map(async (app: any) => {
          const facilitatorInfo = facilitatorData[app.opportunity_id];
          const programName = facilitatorInfo?.program_name || 'Incubation Program';

          let facilitatorName = 'Unknown Facilitator';
          if (facilitatorInfo?.facilitator_profile?.center_name) {
            facilitatorName = facilitatorInfo.facilitator_profile.center_name;
          } else if (facilitatorInfo?.center_name) {
            facilitatorName = facilitatorInfo.center_name;
          } else if (facilitatorInfo?.facilitator_code) {
            facilitatorName = facilitatorInfo.facilitator_code;
          }

          const form2Data = {
            requested: app.form2_requested || false,
            status: app.form2_status || 'not_requested',
            requestedAt: app.form2_requested_at,
            submittedAt: app.form2_submitted_at
          };

          const facilitatorId = facilitatorInfo?.facilitator_id || '';

          return {
            id: app.id,
            applicationId: app.id,
            programName: programName,
            facilitatorName: facilitatorName,
            facilitatorId: facilitatorId,
            facilitatorCode: facilitatorInfo?.facilitator_profile?.facilitator_code || facilitatorInfo?.facilitator_code || '',
            status: app.status as 'pending' | 'accepted' | 'rejected',
            createdAt: app.created_at,
            agreementUrl: app.agreement_url,
            contractUrl: app.contract_url,
            isShortlisted: app.is_shortlisted || false,
            form2: form2Data,
            opportunityId: app.opportunity_id
          };
        })
      );

      setIncubationPrograms(incubationProgramsWithForm2);
    } catch (error) {
      console.error('Error loading incubation programs:', error);
      setIncubationPrograms([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filter
  useEffect(() => {
    let filtered = incubationPrograms;

    if (filter === 'all') {
      filtered = incubationPrograms;
    } else if (filter === 'pending') {
      filtered = incubationPrograms.filter(p => p.status === 'pending');
    } else if (filter === 'accepted') {
      filtered = incubationPrograms.filter(p => p.status === 'accepted');
    } else if (filter === 'rejected') {
      filtered = incubationPrograms.filter(p => p.status === 'rejected');
    } else if (filter === 'form2_pending') {
      filtered = incubationPrograms.filter(p => p.form2.requested && p.form2.status === 'pending');
    }

    setFilteredPrograms(filtered);
  }, [filter, incubationPrograms]);

  useEffect(() => {
    loadIncubationPrograms();
  }, [startup.id]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-50 border-green-200';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200';
      case 'rejected':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const getForm2StatusBadge = (form2: IncubationProgram['form2']) => {
    if (!form2.requested) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">Not Requested</span>;
    }

    switch (form2.status) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">📝 Submission Required</span>;
      case 'submitted':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">📤 Submitted</span>;
      case 'under_review':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">🔍 Under Review</span>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading incubation programs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Programs</p>
              <p className="text-2xl font-semibold text-slate-900">{incubationPrograms.length}</p>
            </div>
            <Building2 className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Active</p>
              <p className="text-2xl font-semibold text-slate-900">
                {incubationPrograms.filter(p => p.status === 'accepted').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Pending</p>
              <p className="text-2xl font-semibold text-slate-900">
                {incubationPrograms.filter(p => p.status === 'pending').length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Form 2 Pending</p>
              <p className="text-2xl font-semibold text-slate-900">
                {incubationPrograms.filter(p => p.form2.requested && p.form2.status === 'pending').length}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={filter === 'accepted' ? 'default' : 'outline'}
            onClick={() => setFilter('accepted')}
          >
            Active
          </Button>
          <Button
            size="sm"
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
          >
            Pending
          </Button>
          <Button
            size="sm"
            variant={filter === 'rejected' ? 'default' : 'outline'}
            onClick={() => setFilter('rejected')}
          >
            Rejected
          </Button>
          <Button
            size="sm"
            variant={filter === 'form2_pending' ? 'default' : 'outline'}
            onClick={() => setFilter('form2_pending')}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            Form 2 Pending
          </Button>
        </div>
      </Card>

      {/* Programs List */}
      {filteredPrograms.length === 0 ? (
        <Card className="p-8 text-center">
          <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Incubation Programs</h3>
          <p className="text-slate-600">
            {incubationPrograms.length === 0
              ? "You haven't applied to any incubation programs yet."
              : "No programs match the selected filter."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPrograms.map(program => (
            <Card key={program.id} className={`border-l-4 p-6 ${getStatusColor(program.status)}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">{program.programName}</h3>
                    {program.isShortlisted && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        ⭐ Shortlisted
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      {getStatusIcon(program.status)}
                      <span className="text-sm font-medium text-slate-700 capitalize">
                        {program.status === 'accepted' ? 'Active' : program.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">
                    Facilitator: <span className="font-medium text-slate-900">{program.facilitatorName}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Applied: {new Date(program.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Form 2 Status */}
              <div className="mb-4 pb-4 border-b border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-2">Form 2 Status:</p>
                {getForm2StatusBadge(program.form2)}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {/* Form 2 - Fill Form button */}
                {program.form2.requested && program.form2.status === 'pending' && !isViewOnly && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedForm2Data({
                        applicationId: program.applicationId,
                        opportunityId: program.opportunityId,
                        opportunityName: program.programName,
                      });
                      setIsForm2ModalOpen(true);
                    }}
                    className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <FileText className="h-4 w-4" />
                    Fill Form 2
                  </Button>
                )}

                {/* Upload Agreement (for accepted programs) */}
                {program.status === 'accepted' && !program.contractUrl && !isViewOnly && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setRecognitionFormState({
                        programName: program.programName,
                        facilitatorName: program.facilitatorName,
                        facilitatorCode: program.facilitatorCode,
                        applicationId: program.applicationId
                      });
                      setIsRecognitionModalOpen(true);
                    }}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <FileText className="h-4 w-4" />
                    Upload Agreement
                  </Button>
                )}

                {/* Download Agreement */}
                {program.status === 'accepted' && (program.contractUrl || program.agreementUrl) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const url = program.contractUrl || program.agreementUrl;
                      if (url) window.open(url, '_blank');
                    }}
                    className="flex items-center gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    <Download className="h-4 w-4" />
                    Download Agreement
                  </Button>
                )}

                {/* Message Facilitator */}
                {!isViewOnly && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedProgramForMessaging(program);
                      setIsMessagingModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-slate-600 border-slate-300 hover:bg-slate-50"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Message
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Messaging Modal */}
      {selectedProgramForMessaging && (
        <StartupMessagingModal
          isOpen={isMessagingModalOpen}
          onClose={() => {
            setIsMessagingModalOpen(false);
            setSelectedProgramForMessaging(null);
          }}
          applicationId={selectedProgramForMessaging.applicationId}
          startupName={startup.name}
          facilitatorName={selectedProgramForMessaging.facilitatorName}
        />
      )}

      {/* Form 2 Modal */}
      {isForm2ModalOpen && selectedForm2Data && (
        <Form2SubmissionModal
          isOpen={isForm2ModalOpen}
          onClose={() => {
            setIsForm2ModalOpen(false);
            setSelectedForm2Data(null);
          }}
          applicationId={selectedForm2Data.applicationId}
          opportunityId={selectedForm2Data.opportunityId}
          opportunityName={selectedForm2Data.opportunityName}
          onSubmissionComplete={() => {
            loadIncubationPrograms();
          }}
        />
      )}
    </div>
  );
};

export default IncubationCenterTab;
