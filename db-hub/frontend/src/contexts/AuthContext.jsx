import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);

    const checkSession = async () => {
        setIsLoading(true);
        try {
            const session = await authService.checkSession();
            setIsAuthenticated(session.authenticated);
            setUser(session.username || null);
        } catch (error) {
            console.error('Session check failed:', error);
            setIsAuthenticated(false);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkSession();
    }, []);

    const login = async (username, password) => {
        const result = await authService.login(username, password);
        if (result.success) {
            setIsAuthenticated(true);
            setUser(username);
        }
        return result;
    };

    const logout = async () => {
        await authService.logout();
        setIsAuthenticated(false);
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                isLoading,
                user,
                login,
                logout,
                checkSession,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
