import React, { useRef, useEffect } from 'react';
import useFocusTrap from './hooks/useFocusTrap';

/**
 * Modal — compound accessible shell.
 *
 * Usage:
 *   <Modal isOpen={open} onClose={close} labelledBy="my-title">
 *     <Modal.Header><h2 id="my-title">…</h2></Modal.Header>
 *     <Modal.Body>…</Modal.Body>
 *     <Modal.Footer>…</Modal.Footer>
 *   </Modal>
 *
 * Owns: backdrop click, ESC key, body-scroll-lock, focus trap, focus restore.
 * Token-based classes — no raw dark: slate pairs.
 */

const BACKDROP_CLASSES =
  'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm';
const PANEL_CLASSES =
  'bg-surface rounded-xl w-full max-w-5xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]';

function Modal({ isOpen, onClose, labelledBy, children, size = 'default' }) {
  const panelRef = useRef(null);
  const previousFocus = useRef(null);

  // Focus trap
  useFocusTrap(isOpen, panelRef);

  // ESC handler + body scroll lock + focus restore
  useEffect(() => {
    if (!isOpen) return;

    previousFocus.current = document.activeElement;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      // Restore focus to trigger
      if (previousFocus.current && typeof previousFocus.current.focus === 'function') {
        previousFocus.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={BACKDROP_CLASSES}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className={PANEL_CLASSES}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

Modal.Header = function ModalHeader({ children }) {
  return (
    <div className="p-6 border-b border-border flex justify-between items-start bg-bg/50">
      {children}
    </div>
  );
};

Modal.Body = function ModalBody({ children }) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8">
      {children}
    </div>
  );
};

Modal.Footer = function ModalFooter({ children }) {
  return (
    <div className="p-4 border-t border-border flex justify-end gap-2 bg-bg/50">
      {children}
    </div>
  );
};

export default Modal;
