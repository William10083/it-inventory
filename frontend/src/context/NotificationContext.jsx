import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X, Download } from 'lucide-react';
import { useGsapEntrance } from '../components/ui/hooks/useGsapEntrance.js';

const NotificationContext = createContext(null);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [downloads, setDownloads] = useState([]);

    const showNotification = (message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);

        // Auto remove after 5 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    };

    const showConfirm = (title, message) => {
        // Handle case where only message is passed (legacy support if any)
        if (!message) {
            message = title;
            title = 'Confirmación';
        }

        return new Promise((resolve) => {
            setConfirmDialog({
                title,
                message,
                onConfirm: () => {
                    setConfirmDialog(null);
                    resolve(true);
                },
                onCancel: () => {
                    setConfirmDialog(null);
                    resolve(false);
                }
            });
        });
    };

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    // ─── Download progress toasts ──────────────────────────────────────────
    const startDownload = (label) => {
        const id = Date.now() + Math.random();
        setDownloads(prev => [...prev, { id, label, progress: 0, status: 'downloading' }]);
        return id;
    };

    const updateDownloadProgress = (id, progress) => {
        setDownloads(prev => prev.map(d => d.id === id ? { ...d, progress } : d));
    };

    const finishDownload = (id) => {
        setDownloads(prev => prev.map(d => d.id === id ? { ...d, progress: 100, status: 'done' } : d));
        setTimeout(() => {
            setDownloads(prev => prev.filter(d => d.id !== id));
        }, 1500);
    };

    const failDownload = (id) => {
        setDownloads(prev => prev.map(d => d.id === id ? { ...d, status: 'error' } : d));
        setTimeout(() => {
            setDownloads(prev => prev.filter(d => d.id !== id));
        }, 3000);
    };

    return (
        <NotificationContext.Provider value={{ showNotification, showConfirm, startDownload, updateDownloadProgress, finishDownload, failDownload }}>
            {children}

            {/* Notifications Toast Container */}
            <div className="fixed top-4 right-4 z-[9999] space-y-2">
                {notifications.map(notification => (
                    <Notification
                        key={notification.id}
                        notification={notification}
                        onClose={() => removeNotification(notification.id)}
                    />
                ))}
            </div>

            {/* Download Progress Toast Container */}
            <div className="fixed bottom-4 right-4 z-[9999] space-y-2">
                {downloads.map(download => (
                    <DownloadProgress key={download.id} download={download} />
                ))}
            </div>

            {/* Confirm Dialog */}
            {confirmDialog && (
                <ConfirmDialog
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    onConfirm={confirmDialog.onConfirm}
                    onCancel={confirmDialog.onCancel}
                />
            )}
        </NotificationContext.Provider>
    );
};

const DownloadProgress = ({ download }) => {
    const { label, progress, status } = download;
    const slideRef = useGsapEntrance({ from: { autoAlpha: 0, x: 30 }, to: { autoAlpha: 1, x: 0, duration: 0.3, ease: 'power2.out' } });

    return (
        <div ref={slideRef} className="min-w-72 max-w-md p-3 rounded-lg border bg-surface/95 dark:bg-slate-800/95 border-slate-200 dark:border-slate-700 backdrop-blur-sm shadow-lg">
            <div className="flex items-center gap-2 mb-2">
                {status === 'error' ? (
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                ) : status === 'done' ? (
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                    <Download className="w-4 h-4 text-accent flex-shrink-0" />
                )}
                <span className="text-sm text-slate-900 dark:text-white truncate flex-1">{label}</span>
                {status === 'downloading' && progress != null && (
                    <span className="text-xs text-muted">{progress}%</span>
                )}
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-200 ${
                        status === 'error' ? 'bg-red-500' : status === 'done' ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: status === 'error' ? '100%' : `${progress ?? 100}%` }}
                />
            </div>
        </div>
    );
};

const Notification = ({ notification, onClose }) => {
    const slideRef = useGsapEntrance({ from: { autoAlpha: 0, x: 30 }, to: { autoAlpha: 1, x: 0, duration: 0.3, ease: 'power2.out' } });
    const icons = {
        success: <CheckCircle className="w-5 h-5" />,
        error: <XCircle className="w-5 h-5" />,
        warning: <AlertCircle className="w-5 h-5" />,
        info: <Info className="w-5 h-5" />
    };

    const colors = {
        success: 'bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400',
        error: 'bg-red-500/10 border-red-500/50 text-red-700 dark:text-red-400',
        warning: 'bg-orange-500/10 border-orange-500/50 text-orange-700 dark:text-orange-400',
        info: 'bg-blue-500/10 border-blue-500/50 text-accent'
    };

    return (
        <div ref={slideRef} className={`min-w-80 max-w-md p-4 rounded-lg border backdrop-blur-sm ${colors[notification.type]} shadow-lg flex items-start gap-3`}>
            <div className="flex-shrink-0">
                {icons[notification.type]}
            </div>
            <div className="flex-1 text-sm text-slate-900 dark:text-white whitespace-pre-wrap">
                {notification.message}
            </div>
            <button
                onClick={onClose}
                className="flex-shrink-0 text-muted hover:text-slate-900 dark:hover:text-white transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

const ConfirmDialog = ({ title, message, onConfirm, onCancel }) => {
    const fadeRef = useGsapEntrance({ from: { autoAlpha: 0 }, to: { autoAlpha: 1, duration: 0.2, ease: 'power2.out' } });
    const scaleRef = useGsapEntrance({ from: { autoAlpha: 0, scale: 0.9 }, to: { autoAlpha: 1, scale: 1, duration: 0.2, ease: 'power2.out' } });
    return (
        <div ref={fadeRef} className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div ref={scaleRef} className="bg-surface dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-md w-full">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                            <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title || 'Confirmación'}</h3>
                            <p className="text-slate-600 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                                {message}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2.5 bg-accent hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                    >
                        Aceptar
                    </button>
                </div>
            </div>
        </div>
    );
};
