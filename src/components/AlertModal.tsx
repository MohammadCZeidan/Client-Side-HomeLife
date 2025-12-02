import React from 'react';
import Modal from './Modal';
import './AlertModal.css';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
}

const AlertModal = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
}: AlertModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className={`alert-modal alert-modal-${type}`}>
        <p className="alert-message">{message}</p>
        <div className="alert-actions">
          <button type="button" className="alert-btn-ok" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AlertModal;

