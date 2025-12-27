import { useState, useEffect, useRef } from 'react';
import { X, Upload, Plus, Download, Trash2, Database, Loader2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import apiClient from '../config/api';
import ConfirmationModal from './ConfirmationModal';
import './SQLiteManagerModal.css';

const SQLiteManagerModal = ({ isOpen, onClose, onConnect }) => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [newFileName, setNewFileName] = useState('');
    const [creating, setCreating] = useState(false);
    const fileInputRef = useRef(null);
    const toast = useToast();
    const API_BASE_URL = apiClient.defaults.baseURL || import.meta.env.VITE_API_URL || 'http://localhost:9000';

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/api/files/list');
            setFiles(response.data);
        } catch (error) {
            console.error('Failed to load files', error);
            toast.error('Failed to load file list');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchFiles();
        }
    }, [isOpen]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            await apiClient.post('/api/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success(`Uploaded ${file.name}`);
            fetchFiles();
        } catch (error) {
            console.error(error);
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleCreateFile = async () => {
        if (!newFileName.trim()) return;

        setCreating(true);
        try {
            await apiClient.post('/api/files/create', { filename: newFileName });

            toast.success(`Created ${newFileName}`);
            setNewFileName('');
            fetchFiles();
        } catch (error) {
            toast.error('Create failed');
        } finally {
            setCreating(false);
        }
    };

    const handleDownload = (filename) => {
        apiClient.get(`/api/files/download/${filename}`, { responseType: 'blob' })
            .then((response) => {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
            })
            .catch(() => toast.error('Download failed'));
    };

    const [fileToDelete, setFileToDelete] = useState(null);

    const handleDelete = (filename) => {
        setFileToDelete(filename);
    };

    const confirmDelete = async () => {
        if (!fileToDelete) return;

        try {
            await apiClient.delete(`/api/files/${fileToDelete}`);
            toast.success(`Deleted ${fileToDelete}`);
            fetchFiles();
        } catch (error) {
            toast.error('Delete failed');
        } finally {
            setFileToDelete(null);
        }
    };

    const handleConnect = (filename) => {
        const connectionString = `sqlite:////app/data/${filename}`;
        onConnect(connectionString);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content sqlite-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h4>SQLite Manager</h4>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="sqlite-actions">
                        <div className="upload-section">
                            <div className="upload-section">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept=".db,.sqlite,.sqlite3"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                    hidden
                                />
                                <button
                                    className="upload-btn primary"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                >
                                    <Upload size={16} />
                                    Upload .db
                                </button>
                            </div>
                        </div>

                        <div className="action-separator">
                            <span>OR</span>
                        </div>

                        <div className="create-section">
                            <input
                                type="text"
                                placeholder="New DB name..."
                                value={newFileName}
                                onChange={e => setNewFileName(e.target.value)}
                            />
                            <button onClick={handleCreateFile} disabled={creating || !newFileName.trim()}>
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="file-list-container">
                        {loading ? (
                            <div className="loading"><Loader2 className="spin" /> Loading...</div>
                        ) : files.length === 0 ? (
                            <div className="empty-state">No SQLite files found. Upload or create one.</div>
                        ) : (
                            <ul className="file-list">
                                {files.map(file => (
                                    <li key={file.name} className="file-item">
                                        <div className="file-info">
                                            <Database size={16} className="file-icon" />
                                            <div>
                                                <div
                                                    className="file-name"
                                                    data-tooltip={file.name}
                                                >
                                                    {file.name.length > 10 ? `${file.name.substring(0, 10)}...` : file.name}
                                                </div>
                                                <div className="file-meta">{(file.size / 1024).toFixed(1)} KB</div>
                                            </div>
                                        </div>
                                        <div className="file-actions">
                                            <button onClick={() => handleConnect(file.name)} className="connect-btn" data-tooltip="Connect">
                                                Connect
                                            </button>
                                            <button onClick={() => handleDownload(file.name)} className="action-btn" data-tooltip="Download">
                                                <Download size={14} />
                                            </button>
                                            <button onClick={() => handleDelete(file.name)} className="action-btn delete" data-tooltip="Delete">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={!!fileToDelete}
                onClose={() => setFileToDelete(null)}
                onConfirm={confirmDelete}
                title="Delete File"
                message={`Are you sure you want to delete ${fileToDelete}?`}
                confirmText="Delete"
                isDangerous={true}
            />
        </div >
    );
};

export default SQLiteManagerModal;
