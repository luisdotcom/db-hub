import React, { useState, useEffect, useMemo } from 'react';
import { X, Database, Table, Eye, Zap, Code, CheckSquare, Square, Download, Search } from 'lucide-react';
import { getTables, getViews, getProcedures, getFunctions, getTriggers, getConnectionStringForDb } from '../services/databaseService';
import { useToast } from '../contexts/ToastContext';
import './ExportModal.css';

const ExportModal = ({ isOpen, onClose, onExport, databaseName, databaseType, customConnection }) => {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('tables');
    const [searchQuery, setSearchQuery] = useState('');
    const [includeData, setIncludeData] = useState(true);

    const [objects, setObjects] = useState({
        tables: [],
        views: [],
        procedures: [],
        functions: [],
        triggers: []
    });

    const [selection, setSelection] = useState({
        tables: [],
        views: [],
        procedures: [],
        functions: [],
        triggers: []
    });

    const toast = useToast();

    useEffect(() => {
        if (isOpen && databaseName) {
            loadObjects();
            setSelection({
                tables: [],
                views: [],
                procedures: [],
                functions: [],
                triggers: []
            });
            setIncludeData(true);
            setActiveTab('tables');
            setSearchQuery('');
        }
    }, [isOpen, databaseName]);

    const loadObjects = async () => {
        setLoading(true);
        try {
            const isCustom = databaseType && databaseType.startsWith('custom');
            let connStr = isCustom ? customConnection : null;
            if (isCustom && databaseName) {
                connStr = getConnectionStringForDb(customConnection, databaseName);
            }


            const [tables, views, procedures, functions, triggers] = await Promise.all([
                getTables(databaseType, connStr),
                getViews(databaseType, connStr),
                getProcedures(databaseType, connStr),
                getFunctions(databaseType, connStr),
                getTriggers(databaseType, connStr)
            ]);

            setObjects({
                tables: tables || [],
                views: views || [],
                procedures: procedures || [],
                functions: functions || [],
                triggers: triggers || []
            });


            setSelection({
                tables: tables || [],
                views: views || [],
                procedures: procedures?.map(p => p.name) || [],
                functions: functions?.map(f => f.name) || [],
                triggers: triggers?.map(t => t.name) || []
            });

        } catch (error) {
            console.error("Failed to load objects:", error);
            toast.error(`Failed to load database objects: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredObjects = (type) => {
        const list = objects[type] || [];
        if (!searchQuery) return list;
        return list.filter(item => {
            const name = typeof item === 'string' ? item : item.name;
            return name.toLowerCase().includes(searchQuery.toLowerCase());
        });
    };

    const currentList = useMemo(() => getFilteredObjects(activeTab), [objects, activeTab, searchQuery]);

    const handleToggleItem = (type, name) => {
        setSelection(prev => {
            const current = prev[type];
            const isSelected = current.includes(name);
            if (isSelected) {
                return { ...prev, [type]: current.filter(item => item !== name) };
            } else {
                return { ...prev, [type]: [...current, name] };
            }
        });
    };

    const handleToggleAll = () => {
        const allNames = currentList.map(item => typeof item === 'string' ? item : item.name);
        const allSelected = allNames.every(name => selection[activeTab].includes(name));

        setSelection(prev => {
            if (allSelected) {
                return {
                    ...prev,
                    [activeTab]: prev[activeTab].filter(name => !allNames.includes(name))
                };
            } else {
                const newSelection = new Set([...prev[activeTab], ...allNames]);
                return {
                    ...prev,
                    [activeTab]: Array.from(newSelection)
                };
            }
        });
    };

    const handleExport = () => {
        const totalSelected = Object.values(selection).flat().length;
        if (totalSelected === 0) {
            toast.warning("Please select at least one object to export");
            return;
        }

        onExport({
            include_data: includeData,
            tables: selection.tables,
            views: selection.views,
            procedures: selection.procedures,
            functions: selection.functions,
            triggers: selection.triggers
        });
    };

    if (!isOpen) return null;

    const tabs = [
        { id: 'tables', label: 'Tables', icon: Table, count: objects.tables.length },
        { id: 'views', label: 'Views', icon: Eye, count: objects.views.length },
        { id: 'procedures', label: 'Procedures', icon: Zap, count: objects.procedures.length },
        { id: 'functions', label: 'Functions', icon: Code, count: objects.functions.length },
        { id: 'triggers', label: 'Triggers', icon: Zap, count: objects.triggers.length },
    ];

    const totalSelectedCount = Object.values(selection).reduce((acc, output) => acc + output.length, 0);

    return (
        <div className="export-modal-overlay" onClick={onClose}>
            <div className="export-modal" onClick={e => e.stopPropagation()}>
                <div className="export-modal-header">
                    <h3>
                        <Database size={20} />
                        Export Database: {databaseName}
                    </h3>
                    <button className="export-modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="export-modal-body">
                    <div className="export-options-bar" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={includeData}
                                onChange={e => setIncludeData(e.target.checked)}
                            />
                            <span className="slider round"></span>
                        </label>
                        <span className="switch-label">Include Data</span>
                    </div>

                    <div className="export-tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`export-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                                <span className="tab-badge">{selection[tab.id].length}/{tab.count}</span>
                            </button>
                        ))}
                    </div>

                    <div className="export-list-container">
                        {loading ? (
                            <div className="loading-state">
                                <div className="spinner"></div>
                                <p>Loading database objects...</p>
                            </div>
                        ) : (
                            <>
                                <div className="list-controls">
                                    <div className="export-search-container">
                                        <Search className="export-search-icon" size={16} />
                                        <input
                                            type="text"
                                            className="export-search-input"
                                            placeholder={`Search ${activeTab}...`}
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                        <label className="switch">
                                            <input
                                                type="checkbox"
                                                checked={currentList.length > 0 && currentList.every(item => selection[activeTab].includes(typeof item === 'string' ? item : item.name))}
                                                onChange={handleToggleAll}
                                            />
                                            <span className="slider round"></span>
                                        </label>
                                        <span className="switch-label">Select All</span>
                                    </div>
                                </div>

                                {currentList.length === 0 ? (
                                    <div className="empty-state">No objects found</div>
                                ) : (
                                    <div className="objects-grid">
                                        {currentList.map(item => {
                                            const name = typeof item === 'string' ? item : item.name;
                                            const isSelected = selection[activeTab].includes(name);
                                            return (
                                                <div
                                                    key={name}
                                                    className={`object-checkbox ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => handleToggleItem(activeTab, name)}
                                                >
                                                    {isSelected ? <CheckSquare size={18} color="var(--primary)" /> : <Square size={18} color="var(--text-muted)" />}
                                                    <span className="object-name" title={name}>{name}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="export-modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button
                        className="btn-primary"
                        onClick={handleExport}
                        disabled={loading || totalSelectedCount === 0}
                    >
                        <Download size={18} />
                        Export {totalSelectedCount > 0 ? `(${totalSelectedCount})` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
