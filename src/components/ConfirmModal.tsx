// React for component definition
import React from 'react';
// Base Modal component for overlay and structure
import Modal from './Modal';
// Confirm modal specific styles
import './ConfirmModal.css';

// TypeScript interface defining ConfirmModal component props
interface ConfirmModalProps {
  // Boolean controlling whether modal is visible
  isOpen: boolean;
  // Callback function to close the modal (cancel action)
  onClose: () => void;
  // Callback function executed when user confirms action
  onConfirm: () => void;
  // Title text displayed in modal header
  title: string;
  // Confirmation message displayed in modal body
  message: string;
  // Text for confirm button (defaults to 'Confirm')
  confirmText?: string;
  // Text for cancel button (defaults to 'Cancel')
  cancelText?: string;
}

// Confirmation modal component - displays confirmation dialog to user
// Replaces browser confirm() with custom styled modal
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm', // Default confirm button text
  cancelText = 'Cancel', // Default cancel button text
}: ConfirmModalProps) => {
  // Handler for confirm button - executes confirm callback and closes modal
  const handleConfirm = () => {
    // Execute the confirmation action
    onConfirm();
    // Close the modal after confirmation
    onClose();
  };

  return (
    // Use base Modal component for overlay and structure
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {/* Confirmation content container */}
      <div className="confirm-modal">
        {/* Confirmation message text */}
        <p className="confirm-message">{message}</p>
        {/* Action buttons container */}
        <div className="confirm-actions">
          {/* Cancel button - closes modal without confirming */}
          <button type="button" className="confirm-btn-cancel" onClick={onClose}>
            {cancelText}
          </button>
          {/* Confirm button - executes action and closes modal */}
          <button type="button" className="confirm-btn-danger" onClick={handleConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;

