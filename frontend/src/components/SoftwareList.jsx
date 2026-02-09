import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Server, User, Calendar, DollarSign, Key } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import ImageBuilder from './ImageBuilder';

const SoftwareList = () => {
    const { showNotification } = useNotification();
    const [activeTab, setActiveTab] = useState('licenses'); // 'licenses' | 'builder'
    const [licenses, setLicenses] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newLicense, setNewLicense] = useState({ name: '', key: '', seats_total: 10, cost_per_seat: 100, vendor: '' });

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

    const fetchLicenses = async () => {
        setLoading(true);
        try {
            const [licRes, empRes] = await Promise.all([
                axios.get(`${API_URL}/software/`),
                axios.get(`${API_URL}/employees/`)
            ]);
            setLicenses(licRes.data);
            setEmployees(empRes.data);
        } catch (error) {
            console.error(error);
            showNotification("Failed to fetch data", 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'licenses') {
            fetchLicenses();
        }
    }, [activeTab]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/software/`, newLicense);
            setIsModalOpen(false);
            showNotification("License created successfully!", 'success');
            fetchLicenses();
        } catch (err) {
            console.error(err);
            showNotification("Error creating license", 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-800 p-4 rounded-lg border border-slate-700">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Key className="w-6 h-6 text-purple-400" />
                        Software Management
                    </h2>
                    <p className="text-slate-400 text-sm">Manage licenses and build provisioning scripts.</p>
                </div>

                <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                    <button
                        onClick={() => setActiveTab('licenses')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'licenses' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Licenses
                    </button>
                    <button
                        onClick={() => setActiveTab('builder')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'builder' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Image Builder
                    </button>
                </div>

                {activeTab === 'licenses' && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Add License
                    </button>
                )}
            </div>

            {activeTab === 'licenses' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? <div className="text-white col-span-3 text-center">Loading licenses...</div> : licenses.map(lic => {
                        const usagePercent = (lic.assignments_count / lic.seats_total) * 100;
                        const isFull = lic.assignments_count >= lic.seats_total;

                        return (
                            <div key={lic.id} className="glass-card p-6 border border-slate-700 hover:border-purple-500/50 transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-slate-800 rounded-lg">
                                        <Server className="w-6 h-6 text-purple-400" />
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${isFull ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                        {isFull ? 'FULL' : 'ACTIVE'}
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold text-white mb-1">{lic.name}</h3>
                                <p className="text-sm text-slate-400 mb-4 flex items-center gap-1"><User className="w-3 h-3" /> {lic.vendor}</p>

                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between text-xs text-slate-300 mb-1">
                                            <span>Utilization</span>
                                            <span>{lic.assignments_count} / {lic.seats_total} Seats</span>
                                        </div>
                                        <div className="w-full bg-slate-700 rounded-full h-2">
                                            <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(usagePercent, 100)}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-sm border-t border-slate-700 pt-3">
                                        <span className="text-slate-400 flex items-center gap-1"><DollarSign className="w-3 h-3" /> ${lic.cost_per_seat}/mo</span>
                                        <span className="text-slate-500 text-xs">Expires: {lic.expiration_date || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <ImageBuilder />
            )}

            {/* Simple Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">Add Software License</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-slate-400 text-sm block mb-1">Software Name</label>
                                <input className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white outline-none focus:border-purple-500"
                                    value={newLicense.name} onChange={e => setNewLicense({ ...newLicense, name: e.target.value })} required placeholder="e.g. Adobe Creative Cloud" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-slate-400 text-sm block mb-1">Total Seats</label>
                                    <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white outline-none focus:border-purple-500"
                                        value={newLicense.seats_total} onChange={e => setNewLicense({ ...newLicense, seats_total: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="text-slate-400 text-sm block mb-1">Cost/Seat ($)</label>
                                    <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white outline-none focus:border-purple-500"
                                        value={newLicense.cost_per_seat} onChange={e => setNewLicense({ ...newLicense, cost_per_seat: parseInt(e.target.value) })} />
                                </div>
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm block mb-1">Vendor</label>
                                <input className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white outline-none focus:border-purple-500"
                                    value={newLicense.vendor} onChange={e => setNewLicense({ ...newLicense, vendor: e.target.value })} placeholder="e.g. Adobe" />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-300 hover:text-white">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium">Create License</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SoftwareList;
