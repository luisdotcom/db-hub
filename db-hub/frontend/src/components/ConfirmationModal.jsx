import React from 'react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDangerous = false }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h4>{title}</h4>
                <div className="modal-body">
                    <p>{message}</p>
                    {isDangerous && (
                        <p style={{ marginTop: '8px', color: 'var(--error)', fontSize: '13px' }}>
                            This action cannot be undone.
                        </p>
                    )}
                </div>
                <div className="modal-actions">
                    <button className="modal-btn cancel" onClick={onClose}>
                        {cancelText}
                    </button>
                    <button
                        className="modal-btn"
                        onClick={onConfirm}
                        style={isDangerous ? { background: 'var(--error)', color: 'white', border: 'none' } : {}}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
