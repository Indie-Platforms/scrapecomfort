import React from 'react';

type ConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmMessage: string;
  descriptionMessage?: string;
  onConfirm: () => void;
};

function ConfirmationModal({
  title,
  message,
  isOpen,
  confirmMessage,
  descriptionMessage = '',
  onClose,
  onConfirm,
}: ConfirmationModalProps) {
  return (
    <dialog className="modal" open={isOpen}>
      <form method="dialog" className="modal-box">
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="py-4">{message}</p>
        <p className="py-4">{descriptionMessage}</p>
        <div className="modal-action">
          <button className="btn" type="button" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-error" type="button" onClick={onConfirm}>
            {confirmMessage}
          </button>
        </div>
      </form>
      <form method="dialog" className="modal-backdrop bg-black opacity-60">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

export default ConfirmationModal;
