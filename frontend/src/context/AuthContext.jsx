import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

    useEffect(() => {
        const validateToken = async () => {
            const storedToken = localStorage.getItem('token');

            if (!storedToken) {
                setLoading(false);
                return;
            }

            try {
                // Validate token by making a test request
                const response = await axios.get(`${API_URL}/users/me`, {
                    headers: { Authorization: `Bearer ${storedToken}` }
                });

                // Token is valid, set user
                setUser(response.data);
                setToken(storedToken);
            } catch (error) {
                // Token is invalid or expired, clear it
                console.log('Token validation failed:', error.response?.status);
                localStorage.removeItem('token');
                setToken(null);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        validateToken();

        // Set up axios request interceptor
        const requestInterceptor = axios.interceptors.request.use(
            (config) => {
                const currentToken = localStorage.getItem('token');
                if (currentToken) {
                    config.headers.Authorization = `Bearer ${currentToken}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Cleanup interceptor on component unmount
        return () => {
            axios.interceptors.request.eject(requestInterceptor);
        };
    }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

    const login = async (username, password) => {
        try {
            const res = await axios.post(`${API_URL}/login`, { username, password });
            const { access_token } = res.data;

            localStorage.setItem('token', access_token);
            setToken(access_token);
            setUser({ username });

            // Set authorization header
            axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

            return { success: true };
        } catch (err) {
            return {
                success: false,
                message: err.response?.data?.detail || 'Login failed'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
