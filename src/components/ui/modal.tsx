// src/components/ui/modal.tsx

import React from 'react';

interface ModalProps {
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const Modal: React.FC<ModalProps> = ({
  title,
  description,
  onCancel,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel'
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-sm w-full">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <p className="text-sm text-gray-700 mb-4">{description}</p>
      <div className="flex justify-end space-x-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600"
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
);

export default Modal;
