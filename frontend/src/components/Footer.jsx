import React from 'react';

const Footer = () => {
    return (
        <footer className="border-t border-slate-700 bg-paper/30 backdrop-blur-sm mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-center h-12">
                    <p className="text-xs text-slate-500">
                        Inventory System v1.0 © {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
