import React from 'react';
import { Eye, Clock, Plus, List } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export interface ApprovedMentor {
  id?: string;
  mentor_user_id: string;
  mentor_name: string;
  mentor_email?: string;
  mentor_type?: string;
  expertise_areas?: string[];
  location?: string;
  logo_url?: string;
  is_active?: boolean;
}

interface ApprovedMentorsTableProps {
  mentors: ApprovedMentor[];
  onViewPortfolio: (mentor: ApprovedMentor) => void;
  onAssign: (mentor: ApprovedMentor) => void;
  onToggleStatus?: (mentor: ApprovedMentor) => void;
  onViewHistory?: (mentor: ApprovedMentor) => void;
  onViewAssignments?: (mentor: ApprovedMentor) => void;
}

const ApprovedMentorsTable: React.FC<ApprovedMentorsTableProps> = ({
  mentors,
  onViewPortfolio,
  onAssign,
  onToggleStatus,
  onViewHistory,
  onViewAssignments
}) => {
  if (mentors.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">No approved mentors yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Name</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Email</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Expertise & Portfolio</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">History</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Actions</th>
          </tr>
        </thead>
        <tbody>
          {mentors.map((mentor) => (
            <tr key={mentor.mentor_user_id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  {mentor.logo_url ? (
                    <img
                      src={mentor.logo_url}
                      alt={mentor.mentor_name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-primary/10" />
                  )}
                  <div>
                    <p className="font-medium text-slate-900">{mentor.mentor_name}</p>
                    {mentor.mentor_type && (
                      <p className="text-xs text-slate-500">{mentor.mentor_type}</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <p className="text-sm text-slate-600">{mentor.mentor_email || '-'}</p>
              </td>
              <td className="px-6 py-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {mentor.expertise_areas && mentor.expertise_areas.length > 0 ? (
                      mentor.expertise_areas.slice(0, 2).map((area) => (
                        <span
                          key={area}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                        >
                          {area}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">-</span>
                    )}
                    {mentor.expertise_areas && mentor.expertise_areas.length > 2 && (
                      <span className="text-xs text-slate-500">+{mentor.expertise_areas.length - 2}</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewPortfolio(mentor)}
                    className="w-full"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Portfolio
                  </Button>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <Badge variant={mentor.is_active ? 'success' : 'secondary'}>
                    {mentor.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {onToggleStatus && (
                    <Button
                      size="sm"
                      variant={mentor.is_active ? 'outline' : 'primary'}
                      onClick={() => onToggleStatus(mentor)}
                      className="whitespace-nowrap"
                    >
                      {mentor.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                {onViewHistory ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewHistory(mentor)}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    View
                  </Button>
                ) : (
                  <span className="text-sm text-slate-400">-</span>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  {onViewAssignments && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewAssignments(mentor)}
                      title="View assigned startups"
                    >
                      <List className="h-4 w-4 mr-1" />
                      Assignments
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => onAssign(mentor)}
                    title="Assign this mentor to a startup"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Assign
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ApprovedMentorsTable;
