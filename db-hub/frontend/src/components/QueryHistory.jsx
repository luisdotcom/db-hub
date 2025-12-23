import { useState, useEffect } from 'react';
import { X, Clock, Database, Play, Trash2, Check, AlertCircle } from 'lucide-react';
import { getHistory, clearHistory, deleteHistoryItem } from '../services/databaseService';
import { useToast } from '../contexts/ToastContext';
import './QueryHistory.css';
import ConfirmationModal from './ConfirmationModal';

const QueryHistory = ({ isOpen, onClose, onSelectQuery }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [showClearModal, setShowClearModal] = useState(false);
    const toast = useToast();

    const loadHistory = async () => {
        if (!isOpen) return;
        setLoading(true);
        try {
            const data = await getHistory(50);
            setHistory(data);
        } catch (error) {
            console.error("Failed to load history", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, [isOpen]);

    const handleClearHistory = async () => {
        setClearing(true);
        setShowClearModal(false);
        try {
            await clearHistory();
            setHistory([]);
            toast.success('Query history cleared');
        } catch (error) {
            toast.error('Failed to clear history');
        } finally {
            setClearing(false);
        }
    };

    const handleDeleteItem = async (e, id) => {
        e.stopPropagation();
        try {
            await deleteHistoryItem(id);
            setHistory(prev => prev.filter(item => item.id !== id));
            toast.success('Deleted from history');
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete item');
        }
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <>
            <div className={`history-drawer ${isOpen ? 'open' : ''}`}>
                <div className="history-header">
                    <h3>
                        <Clock size={18} />
                        History
                    </h3>
                    <div className="header-actions">
                        {history.length > 0 && (
                            <button
                                className="clear-btn"
                                onClick={() => setShowClearModal(true)}
                                title="Clear History"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                        <button className="close-btn" onClick={onClose}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="history-content">
                    {loading ? (
                        <div className="loading-state">Loading history...</div>
                    ) : history.length === 0 ? (
                        <div className="empty-state">
                            <Clock size={48} className="empty-icon" />
                            <p>No query history yet</p>
                        </div>
                    ) : (
                        <ul className="history-list">
                            {history.map((entry) => (
                                <li key={entry.id} className="history-item" onClick={() => onSelectQuery(entry.query_text)}>
                                    <div className="history-item-header">
                                        <span className={`status-icon ${entry.status}`}>
                                            {entry.status === 'success' ? <Check size={12} /> : <AlertCircle size={12} />}
                                        </span>
                                        <span className="timestamp">{formatDate(entry.timestamp)}</span>
                                        <button
                                            className="delete-item-btn"
                                            onClick={(e) => handleDeleteItem(e, entry.id)}
                                            title="Delete Item"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    <div className="query-preview">
                                        {entry.query_text}
                                    </div>
                                    <div className="history-meta">
                                        {entry.database_name && (
                                            <span className="db-tag">
                                                <Database size={10} />
                                                {entry.database_name}
                                            </span>
                                        )}
                                        {entry.execution_time_ms > 0 && (
                                            <span className="duration-tag">
                                                {entry.execution_time_ms.toFixed(2)}ms
                                            </span>
                                        )}
                                    </div>
                                    <button className="restore-btn" title="Run Query">
                                        <Play size={14} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {isOpen && <div className="drawer-overlay" onClick={onClose} />}

            <ConfirmationModal
                isOpen={showClearModal}
                onClose={() => setShowClearModal(false)}
                onConfirm={handleClearHistory}
                title="Clear History"
                message="Are you sure you want to delete all query history? This action cannot be undone."
                confirmText={clearing ? "Clearing..." : "Clear All"}
                danger
            />
        </>
    );
};

export default QueryHistory;
