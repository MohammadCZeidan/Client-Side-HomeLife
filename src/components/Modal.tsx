// React for component definition
import React, { ReactNode } from 'react';
// Modal component styles
import './Modal.css';

// TypeScript interface defining Modal component props
interface ModalProps {
  // Boolean controlling whether modal is visible
  isOpen: boolean;
  // Callback function to close the modal
  onClose: () => void;
  // Title text displayed in modal header
  title: string;
  // React children - content to display in modal body
  children: ReactNode;
}

// Reusable Modal component for displaying content in an overlay dialog
const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  // If modal is not open, don't render anything (early return)
  if (!isOpen) return null;

  return (
    // Overlay backdrop - clicking outside modal closes it
    <div className="modal-overlay" onClick={onClose}>
      {/* Modal content container - stopPropagation prevents closing when clicking inside */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal header with title and close button */}
        <div className="modal-header">
          {/* Modal title text */}
          <h2 className="modal-title">{title}</h2>
          {/* Close button (X) - clicking closes the modal */}
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {/* Modal body - displays children content */}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

export default Modal;

