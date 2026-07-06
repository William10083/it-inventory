import { createContext, useState, useContext, useEffect } from 'react';
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
                axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
                const response = await axios.get(`${API_URL}/users/me`);
                setUser(response.data);
                setToken(storedToken);
            } catch (error) {
                if (error.response?.status !== 401) {
                    console.error('Token validation error:', error);
                }
                localStorage.removeItem('token');
                setToken(null);
                setUser(null);
                delete axios.defaults.headers.common['Authorization'];
            } finally {
                setLoading(false);
            }
        };

        validateToken();

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

        const responseInterceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                // Skip /login failures so a wrong password never wipes an existing session
                const isLoginRequest = error.config?.url?.endsWith('/login');
                if (error.response?.status === 401 && !isLoginRequest && localStorage.getItem('token')) {
                    localStorage.removeItem('token');
                    setToken(null);
                    setUser(null);
                    delete axios.defaults.headers.common['Authorization'];
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.request.eject(requestInterceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, [API_URL]);


    const login = async (username, password) => {
        try {
            const res = await axios.post(`${API_URL}/login`, { username, password });
            const { access_token, user: userData } = res.data;

            localStorage.setItem('token', access_token);
            setToken(access_token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
            setUser(userData);

            return { success: true, must_change_password: Boolean(userData.must_change_password) };
        } catch (err) {
            return {
                success: false,
                error: err.response?.data?.detail || 'Usuario o contraseña incorrectos'
            };
        }
    };

    const refreshUser = async () => {
        try {
            const response = await axios.get(`${API_URL}/users/me`);
            setUser(response.data);
            return response.data;
        } catch (error) {
            console.error('Error refreshing user:', error);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading, refreshUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
