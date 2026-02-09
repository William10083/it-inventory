import React, { createContext, useContext, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

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

    return (
        <NotificationContext.Provider value={{ showNotification, showConfirm }}>
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

const Notification = ({ notification, onClose }) => {
    const icons = {
        success: <CheckCircle className="w-5 h-5" />,
        error: <XCircle className="w-5 h-5" />,
        warning: <AlertCircle className="w-5 h-5" />,
        info: <Info className="w-5 h-5" />
    };

    const colors = {
        success: 'bg-green-500/10 border-green-500/50 text-green-400',
        error: 'bg-red-500/10 border-red-500/50 text-red-400',
        warning: 'bg-orange-500/10 border-orange-500/50 text-orange-400',
        info: 'bg-blue-500/10 border-blue-500/50 text-blue-400'
    };

    return (
        <div className={`min-w-80 max-w-md p-4 rounded-lg border backdrop-blur-sm ${colors[notification.type]} shadow-lg animate-slide-in-right flex items-start gap-3`}>
            <div className="flex-shrink-0">
                {icons[notification.type]}
            </div>
            <div className="flex-1 text-sm text-white whitespace-pre-wrap">
                {notification.message}
            </div>
            <button
                onClick={onClose}
                className="flex-shrink-0 text-slate-400 hover:text-white transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

const ConfirmDialog = ({ title, message, onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl max-w-md w-full animate-scale-in">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                            <AlertCircle className="w-6 h-6 text-orange-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-2">{title || 'Confirmación'}</h3>
                            <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                                {message}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2.5 bg-primary hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                    >
                        Aceptar
                    </button>
                </div>
            </div>
        </div>
    );
};
