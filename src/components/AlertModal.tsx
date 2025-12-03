// React for component definition
import React from 'react';
// Base Modal component for overlay and structure
import Modal from './Modal';
// Alert modal specific styles
import './AlertModal.css';

// TypeScript interface defining AlertModal component props
interface AlertModalProps {
  // Boolean controlling whether modal is visible
  isOpen: boolean;
  // Callback function to close the modal
  onClose: () => void;
  // Title text displayed in modal header
  title: string;
  // Message text displayed in modal body
  message: string;
  // Alert type determines icon and styling (defaults to 'info')
  type?: 'success' | 'error' | 'info' | 'warning';
}

// Alert modal component - displays informational messages to user
// Replaces browser alert() with custom styled modal
const AlertModal = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info', // Default to 'info' if type not specified
}: AlertModalProps) => {
  return (
    // Use base Modal component for overlay and structure
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {/* Alert content container with type-specific styling */}
      <div className={`alert-modal alert-modal-${type}`}>
        {/* Alert message text */}
        <p className="alert-message">{message}</p>
        {/* Action buttons container */}
        <div className="alert-actions">
          {/* OK button to close the alert */}
          <button type="button" className="alert-btn-ok" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AlertModal;

