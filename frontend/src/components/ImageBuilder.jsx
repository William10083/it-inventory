
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Check, Box, Monitor, Shield, Code, Settings, Upload, Plus, Trash2, X, Save, Edit2, Briefcase, Chrome, MessageSquare, FileText, Lock, Terminal, Wrench } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Software icon mapping
const SOFTWARE_ICONS = {
    // Browsers
    "Google.Chrome": "https://cdn.simpleicons.org/googlechrome",
    "Mozilla.Firefox": "https://cdn.simpleicons.org/firefox",
    "Microsoft.Edge": "https://cdn.simpleicons.org/microsoftedge",
    "BraveSoftware.BraveBrowser": "https://cdn.simpleicons.org/brave",

    // Communication
    "WhatsApp.WhatsApp": "https://cdn.simpleicons.org/whatsapp",
    "SlackTechnologies.Slack": "https://cdn.simpleicons.org/slack",
    "Zoom.Zoom": "https://cdn.simpleicons.org/zoom",
    "Microsoft.Teams": "https://cdn.simpleicons.org/microsoftteams",
    "Discord.Discord": "https://cdn.simpleicons.org/discord",

    // Productivity
    "Microsoft.Office": "https://cdn.simpleicons.org/microsoftoffice",
    "Microsoft.365Apps.en-us": "https://cdn.simpleicons.org/microsoft365",
    "Notion.Notion": "https://cdn.simpleicons.org/notion",
    "Evernote.Evernote": "https://cdn.simpleicons.org/evernote",

    // Security
    "Malwarebytes.Malwarebytes": "https://cdn.simpleicons.org/malwarebytes",

    // Development
    "Microsoft.VisualStudioCode": "https://cdn.simpleicons.org/visualstudiocode",
    "Git.Git": "https://cdn.simpleicons.org/git",
    "GitHub.GitHubDesktop": "https://cdn.simpleicons.org/github",
    "OpenJS.NodeJS": "https://cdn.simpleicons.org/nodedotjs",
    "Python.Python.3.12": "https://cdn.simpleicons.org/python",
    "Python.Python.3.11": "https://cdn.simpleicons.org/python",
    "Python.Python.3.10": "https://cdn.simpleicons.org/python",
    "Docker.DockerDesktop": "https://cdn.simpleicons.org/docker",
    "Postman.Postman": "https://cdn.simpleicons.org/postman",

    // Utilities
    "7zip.7zip": "https://cdn.simpleicons.org/7zip",
    "RARLab.WinRAR": "https://cdn.simpleicons.org/winrar",
    "VideoLAN.VLC": "https://cdn.simpleicons.org/vlcmediaplayer",
    "AnyDeskSoftwareGmbH.AnyDesk": "https://cdn.simpleicons.org/anydesk",
    "TeamViewer.TeamViewer": "https://cdn.simpleicons.org/teamviewer",
    "Adobe.Acrobat.Reader.64-bit": "https://cdn.simpleicons.org/adobeacrobatreader",
};

const ImageBuilder = () => {
    const { showNotification } = useNotification();
    const [catalog, setCatalog] = useState({});
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedApps, setSelectedApps] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isSaveProfileModalOpen, setIsSaveProfileModalOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [editingSoftware, setEditingSoftware] = useState(null);
    const [uploadForm, setUploadForm] = useState({
        name: '',
        description: '',
        category: 'Custom',
        install_args: '/S'
    });
    const [editForm, setEditForm] = useState({
        name: '',
        description: '',
        install_args: '/S'
    });
    const [profileForm, setProfileForm] = useState({
        name: '',
        department: '',
        description: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchCatalog();
        fetchProfiles();
    }, []);

    const fetchCatalog = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/image-builder/catalog`);
            setCatalog(response.data);
        } catch (error) {
            console.error("Error fetching catalog:", error);
            showNotification("Failed to load software catalog", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchProfiles = async () => {
        try {
            const response = await axios.get(`${API_URL}/image-builder/profiles`);
            setProfiles(response.data);
        } catch (error) {
            console.error("Error fetching profiles:", error);
        }
    };

    const toggleApp = (appId) => {
        setSelectedApps(prev => {
            if (prev.includes(appId)) {
                return prev.filter(id => id !== appId);
            } else {
                return [...prev, appId];
            }
        });
    };

    const loadProfile = (profile) => {
        try {
            const softwareIds = JSON.parse(profile.software_ids);
            setSelectedApps(softwareIds);
            setSelectedProfile(profile);
            showNotification(`Perfil "${profile.name}" cargado`, "success");
        } catch (error) {
            console.error("Error loading profile:", error);
            showNotification("Error al cargar el perfil", "error");
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (selectedApps.length === 0) {
            showNotification("Selecciona al menos una aplicación", "warning");
            return;
        }

        try {
            await axios.post(`${API_URL}/image-builder/profiles`, {
                name: profileForm.name,
                department: profileForm.department,
                description: profileForm.description,
                software_ids: JSON.stringify(selectedApps)
            });
            showNotification("Perfil guardado exitosamente", "success");
            setIsSaveProfileModalOpen(false);
            setProfileForm({ name: '', department: '', description: '' });
            fetchProfiles();
        } catch (error) {
            console.error("Error saving profile:", error);
            showNotification("Error al guardar el perfil", "error");
        }
    };

    const handleDeleteProfile = async (profileId) => {
        if (!confirm("¿Estás seguro de eliminar este perfil?")) return;

        try {
            await axios.delete(`${API_URL}/image-builder/profiles/${profileId}`);
            showNotification("Perfil eliminado", "success");
            fetchProfiles();
            if (selectedProfile?.id === profileId) {
                setSelectedProfile(null);
            }
        } catch (error) {
            console.error("Error deleting profile:", error);
            showNotification("Error al eliminar el perfil", "error");
        }
    };

    const handleGenerate = async () => {
        if (selectedApps.length === 0) {
            showNotification("Please select at least one application", "warning");
            return;
        }

        setGenerating(true);
        try {
            const response = await axios.post(
                `${API_URL}/image-builder/generate-script`,
                selectedApps,
                { responseType: 'blob' }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'setup_laptop.ps1');
            document.body.appendChild(link);
            link.click();
            link.remove();

            showNotification("Script generated successfully!", "success");
        } catch (error) {
            console.error("Error generating script:", error);
            showNotification("Failed to generate script", "error");
        } finally {
            setGenerating(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.name.toLowerCase().endsWith('.exe') && !file.name.toLowerCase().endsWith('.msi')) {
                showNotification("Only .exe and .msi files are allowed", "error");
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            showNotification("Please select a file", "warning");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('name', uploadForm.name);
        formData.append('description', uploadForm.description);
        formData.append('category', uploadForm.category);
        formData.append('install_args', uploadForm.install_args);

        try {
            await axios.post(`${API_URL}/image-builder/custom-software/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showNotification("Custom software uploaded successfully!", "success");
            setIsUploadModalOpen(false);
            setUploadForm({ name: '', description: '', category: 'Custom', install_args: '/S' });
            setSelectedFile(null);
            fetchCatalog();
        } catch (error) {
            console.error("Error uploading:", error);
            showNotification("Failed to upload custom software", "error");
        } finally {
            setUploading(false);
        }
    };

    const openEditModal = (software) => {
        setEditingSoftware(software);
        setEditForm({
            name: software.name,
            description: software.description || '',
            install_args: software.install_args || '/S'
        });
        setIsEditModalOpen(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setUpdating(true);

        const formData = new FormData();
        formData.append('name', editForm.name);
        formData.append('description', editForm.description);
        formData.append('install_args', editForm.install_args);

        try {
            await axios.put(`${API_URL}/image-builder/custom-software/${editingSoftware.custom_id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showNotification("Software actualizado exitosamente", "success");
            setIsEditModalOpen(false);
            setEditingSoftware(null);
            fetchCatalog();
        } catch (error) {
            console.error("Error updating:", error);
            showNotification("Error al actualizar el software", "error");
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async (customId) => {
        if (!confirm("Are you sure you want to delete this custom software?")) return;

        try {
            await axios.delete(`${API_URL}/image-builder/custom-software/${customId}`);
            showNotification("Custom software deleted", "success");
            fetchCatalog();
        } catch (error) {
            console.error("Error deleting:", error);
            showNotification("Failed to delete custom software", "error");
        }
    };

    const getCategoryIcon = (category) => {
        switch (category.toLowerCase()) {
            case 'browsers': return <Monitor className="w-5 h-5 text-blue-400" />;
            case 'development': return <Code className="w-5 h-5 text-green-400" />;
            case 'security': return <Shield className="w-5 h-5 text-red-400" />;
            case 'utilities': return <Settings className="w-5 h-5 text-gray-400" />;
            case 'custom software': return <Upload className="w-5 h-5 text-orange-400" />;
            default: return <Box className="w-5 h-5 text-purple-400" />;
        }
    };

    const getSoftwareIcon = (appId) => {
        // SVG icon URLs from multiple CDN sources for better coverage
        const iconUrls = {
            "Google.Chrome": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/googlechrome.svg",
            "Mozilla.Firefox": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/firefox.svg",
            "Microsoft.Edge": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/microsoftedge.svg",
            "Brave.Brave": "https://api.iconify.design/simple-icons/brave.svg",
            "WhatsApp.WhatsApp": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/whatsapp.svg",
            "SlackTechnologies.Slack": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/slack.svg",
            "Zoom.Zoom": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/zoom.svg",
            "Microsoft.Teams": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/microsoftteams.svg",
            "Discord.Discord": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/discord.svg",
            "Microsoft.Office": "https://api.iconify.design/logos/microsoft-icon.svg",
            "Microsoft.365Apps.en-us": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/microsoft365.svg",
            "Notion.Notion": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/notion.svg",
            "Evernote.Evernote": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/evernote.svg",
            "Malwarebytes.Malwarebytes": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/malwarebytes.svg",
            "Microsoft.VisualStudioCode": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/visualstudiocode.svg",
            "Git.Git": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/git.svg",
            "GitHub.GitHubDesktop": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/github.svg",
            "OpenJS.NodeJS": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/nodedotjs.svg",
            "Python.Python.3.12": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/python.svg",
            "Python.Python.3.11": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/python.svg",
            "Python.Python.3.10": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/python.svg",
            "Docker.DockerDesktop": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/docker.svg",
            "Postman.Postman": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/postman.svg",
            "7zip.7zip": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/7zip.svg",
            "RARLab.WinRAR": "https://api.iconify.design/vscode-icons/file-type-zip.svg",
            "VideoLAN.VLC": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/vlcmediaplayer.svg",
            "AnyDeskSoftwareGmbH.AnyDesk": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/anydesk.svg",
            "TeamViewer.TeamViewer": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/teamviewer.svg",
            "Adobe.Acrobat.Reader.64-bit": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/adobeacrobatreader.svg",
        };

        // Emoji fallbacks
        const emojiMap = {
            "Google.Chrome": "🌐", "Mozilla.Firefox": "🦊", "Microsoft.Edge": "🔷", "Brave.Brave": "🦁",
            "WhatsApp.WhatsApp": "💬", "SlackTechnologies.Slack": "#️⃣", "Zoom.Zoom": "📹",
            "Microsoft.Teams": "👥", "Discord.Discord": "🎮",
            "Microsoft.Office": "📊", "Microsoft.365Apps.en-us": "📊", "Notion.Notion": "📝", "Evernote.Evernote": "🐘",
            "Malwarebytes.Malwarebytes": "🛡️",
            "Microsoft.VisualStudioCode": "💻", "Git.Git": "🔀", "GitHub.GitHubDesktop": "🐙", "OpenJS.NodeJS": "🟢",
            "Python.Python.3.12": "🐍", "Python.Python.3.11": "🐍", "Python.Python.3.10": "🐍",
            "Docker.DockerDesktop": "🐳", "Postman.Postman": "📮",
            "7zip.7zip": "📦", "RARLab.WinRAR": "📦", "VideoLAN.VLC": "🎥",
            "AnyDeskSoftwareGmbH.AnyDesk": "🖥️", "TeamViewer.TeamViewer": "🖥️", "Adobe.Acrobat.Reader.64-bit": "📄",
        };

        const iconUrl = iconUrls[appId];
        const emoji = emojiMap[appId];

        if (iconUrl) {
            return (
                <img
                    src={iconUrl}
                    alt=""
                    className="w-6 h-6"
                    style={{ filter: 'brightness(0) invert(1)' }}
                    onError={(e) => {
                        // Fallback to emoji if SVG fails to load
                        if (emoji) {
                            e.target.outerHTML = `<span class="text-2xl">${emoji}</span>`;
                        }
                    }}
                />
            );
        } else if (emoji) {
            return <span className="text-2xl">{emoji}</span>;
        }

        return <Box className="w-6 h-6 text-slate-400" />;
    };

    if (loading) {
        return <div className="text-white text-center py-10">Loading catalog...</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1">Select Software</h3>
                        <p className="text-slate-400 text-sm">Choose applications or load a department profile.</p>
                    </div>

                    {/* Profile Selector */}
                    <div className="flex items-center gap-3">
                        <select
                            value={selectedProfile?.id || ''}
                            onChange={(e) => {
                                const profile = profiles.find(p => p.id === parseInt(e.target.value));
                                if (profile) loadProfile(profile);
                            }}
                            className="bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg outline-none focus:border-blue-500"
                        >
                            <option value="">Seleccionar Perfil...</option>
                            {profiles.map(profile => (
                                <option key={profile.id} value={profile.id}>
                                    {profile.department} - {profile.name}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={() => setIsSaveProfileModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Save className="w-4 h-4" /> Guardar Perfil
                        </button>

                        <button
                            onClick={() => setIsProfileModalOpen(true)}
                            className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Briefcase className="w-4 h-4" /> Gestionar
                        </button>

                        <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Custom Software
                        </button>

                        <div className="text-right">
                            <span className="text-2xl font-bold text-purple-400">{selectedApps.length}</span>
                            <span className="text-slate-500 text-sm block">Selected</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {Object.entries(catalog).map(([category, apps]) => (
                    <div key={category} className="space-y-3">
                        <h4 className="flex items-center gap-2 text-white font-semibold border-b border-slate-700 pb-2">
                            {getCategoryIcon(category)}
                            {category}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {apps.map(app => {
                                const isSelected = selectedApps.includes(app.id);
                                const isCustom = app.is_custom;
                                return (
                                    <div
                                        key={app.id}
                                        className={`
                                            cursor-pointer p-3 rounded-lg border transition-all flex items-start gap-3 relative overflow-hidden
                                            ${isSelected
                                                ? 'bg-purple-600/20 border-purple-500'
                                                : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                                            }
                                        `}
                                    >
                                        <div onClick={() => toggleApp(app.id)} className="flex-1 flex items-start gap-3">
                                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-purple-500' : 'bg-slate-700'} flex items-center justify-center`}>
                                                {isCustom ? <Box className="w-5 h-5 text-white" /> : getSoftwareIcon(app.id)}
                                            </div>
                                            <div className="flex-1">
                                                <h5 className="font-medium text-white text-sm flex items-center gap-2">
                                                    {app.name}
                                                    {isCustom && <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">CUSTOM</span>}
                                                </h5>
                                                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{app.description}</p>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 text-purple-400">
                                                <Check className="w-4 h-4" />
                                            </div>
                                        )}
                                        {isCustom && (
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditModal(app);
                                                    }}
                                                    className="p-1 hover:bg-blue-500/20 rounded text-blue-400 hover:text-blue-300 transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(app.custom_id);
                                                    }}
                                                    className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="sticky bottom-4 flex justify-end">
                <button
                    onClick={handleGenerate}
                    disabled={generating || selectedApps.length === 0}
                    className={`
                        flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform hover:scale-105 active:scale-95
                        ${selectedApps.length === 0
                            ? 'bg-slate-600 cursor-not-allowed opacity-50'
                            : generating
                                ? 'bg-purple-700 cursor-wait'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500'
                        }
                    `}
                >
                    {generating ? (
                        <>Generating...</>
                    ) : (
                        <>
                            <Download className="w-5 h-5" />
                            Generate Script ({selectedApps.length})
                        </>
                    )}
                </button>
            </div>

            {/* Edit Custom Software Modal */}
            {isEditModalOpen && editingSoftware && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Editar Software</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="text-slate-400 text-sm block mb-1">Nombre del Software</label>
                                <input
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm block mb-1">Descripción</label>
                                <input
                                    value={editForm.description}
                                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm block mb-1">Argumentos de Instalación Silenciosa</label>
                                <select
                                    value={editForm.install_args}
                                    onChange={e => setEditForm({ ...editForm, install_args: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white outline-none focus:border-blue-500"
                                >
                                    <option value="/S">/S (NSIS installers)</option>
                                    <option value="/VERYSILENT">/VERYSILENT (Inno Setup)</option>
                                    <option value="/silent">/silent (Common)</option>
                                    <option value="/quiet">/quiet (Common)</option>
                                    <option value="/qn">/qn (MSI installers)</option>
                                    <option value="/passive">/passive (MSI with progress)</option>
                                    <option value="-s">-s (Some installers)</option>
                                    <option value="--silent">--silent (Modern apps)</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-300 hover:text-white">Cancelar</button>
                                <button type="submit" disabled={updating} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50">
                                    {updating ? 'Actualizando...' : 'Actualizar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Save Profile Modal */}
            {isSaveProfileModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Guardar Perfil</h3>
                            <button onClick={() => setIsSaveProfileModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveProfile} className="space-y-4">
                            <div>
                                <label className="text-slate-400 text-sm block mb-1">Nombre del Perfil</label>
                                <input
                                    value={profileForm.name}
                                    onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white outline-none focus:border-blue-500"
                                    placeholder="ej: Desarrollo Frontend"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm block mb-1">Departamento</label>
                                <input
                                    value={profileForm.department}
                                    onChange={e => setProfileForm({ ...profileForm, department: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white outline-none focus:border-blue-500"
                                    placeholder="ej: Desarrollo, Ventas, Diseño"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm block mb-1">Descripción (opcional)</label>
                                <textarea
                                    value={profileForm.description}
                                    onChange={e => setProfileForm({ ...profileForm, description: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white outline-none focus:border-blue-500"
                                    rows="3"
                                    placeholder="Descripción del perfil"
                                />
                            </div>
                            <div className="bg-slate-800 p-3 rounded">
                                <p className="text-xs text-slate-400">Software seleccionado: <span className="text-white font-bold">{selectedApps.length}</span></p>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsSaveProfileModalOpen(false)} className="px-4 py-2 text-slate-300 hover:text-white">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Profile Management Modal */}
            {isProfileModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl w-full max-w-2xl shadow-2xl max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Gestionar Perfiles</h3>
                            <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {profiles.length === 0 ? (
                                <p className="text-slate-400 text-center py-8">No hay perfiles guardados</p>
                            ) : (
                                profiles.map(profile => (
                                    <div key={profile.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex justify-between items-start">
                                        <div className="flex-1">
                                            <h4 className="text-white font-semibold">{profile.name}</h4>
                                            <p className="text-sm text-slate-400">{profile.department}</p>
                                            {profile.description && <p className="text-xs text-slate-500 mt-1">{profile.description}</p>}
                                            <p className="text-xs text-slate-500 mt-2">
                                                {JSON.parse(profile.software_ids).length} aplicaciones
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    loadProfile(profile);
                                                    setIsProfileModalOpen(false);
                                                }}
                                                className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteProfile(profile.id)}
                                                className="p-2 bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Custom Software Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Upload Custom Software</h3>
                            <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpload} className="space-y-4">
                            <div>
                                <label className="text-slate-400 text-sm block mb-1">Installer File (.exe or .msi)</label>
                                <input
                                    type="file"
                                    accept=".exe,.msi"
                                    onChange={handleFileSelect}
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white outline-none focus:border-orange-500"
                                    required
                                />
                                {selectedFile && <p className="text-xs text-green-400 mt-1">Selected: {selectedFile.name}</p>}
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm block mb-1">Software Name</label>
                                <input
                                    value={uploadForm.name}
                                    onChange={e => setUploadForm({ ...uploadForm, name: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white outline-none focus:border-orange-500"
                                    placeholder="e.g., Adobe Photoshop 2024"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm block mb-1">Description</label>
                                <input
                                    value={uploadForm.description}
                                    onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white outline-none focus:border-orange-500"
                                    placeholder="Brief description"
                                />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm block mb-1">Silent Install Arguments</label>
                                <select
                                    value={uploadForm.install_args}
                                    onChange={e => setUploadForm({ ...uploadForm, install_args: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white outline-none focus:border-orange-500"
                                >
                                    <option value="/S">/S (NSIS installers)</option>
                                    <option value="/VERYSILENT">/VERYSILENT (Inno Setup)</option>
                                    <option value="/silent">/silent (Common)</option>
                                    <option value="/quiet">/quiet (Common)</option>
                                    <option value="/qn">/qn (MSI installers)</option>
                                    <option value="/passive">/passive (MSI with progress)</option>
                                    <option value="-s">-s (Some installers)</option>
                                    <option value="--silent">--silent (Modern apps)</option>
                                </select>
                                <p className="text-xs text-slate-500 mt-1">Selecciona el argumento correcto según el tipo de instalador</p>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsUploadModalOpen(false)} className="px-4 py-2 text-slate-300 hover:text-white">Cancel</button>
                                <button type="submit" disabled={uploading} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium disabled:opacity-50">
                                    {uploading ? 'Uploading...' : 'Upload'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageBuilder;
