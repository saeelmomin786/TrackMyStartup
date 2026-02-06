import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | '2xl';
  position?: 'center' | 'top';
  showBackdrop?: boolean;
  variant?: 'fixed' | 'absolute';
  zIndex?: number;
  fullScreen?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'medium', position = 'top', showBackdrop = true, variant = 'fixed', zIndex = 9999, fullScreen = false }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-lg',
    large: 'max-w-4xl',
    '2xl': 'max-w-2xl'
  };

  const positionClasses = {
    center: 'items-center justify-center',
    top: 'items-start justify-center pt-20'
  };

  if (fullScreen) {
    return (
      <div 
        className={`${variant} inset-0 bg-white flex flex-col`}
        style={{ zIndex, position: variant, top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-white sticky top-0 z-10">
          <h3 className="text-2xl font-semibold text-slate-900">{title}</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
        <style>{`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .animate-fade-in {
            animation: fade-in 0.2s ease-out forwards;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div 
      className={`${variant} inset-0 ${showBackdrop ? 'bg-slate-900 bg-opacity-50 backdrop-blur-sm' : ''} flex ${positionClasses[position]} p-4`}
      onClick={onClose}
      style={{ zIndex, position: variant, top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div 
        className={`bg-white rounded-xl shadow-2xl p-4 sm:p-6 w-full ${sizeClasses[size]} max-h-[80vh] relative animate-fade-in-up border border-slate-200 flex flex-col`}
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside modal
        style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3 flex-shrink-0">
          <h3 className="text-lg sm:text-xl font-semibold text-slate-900">{title}</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded hover:bg-slate-100 flex-shrink-0"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0 pr-2">
          {children}
        </div>
      </div>
       <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Modal;
