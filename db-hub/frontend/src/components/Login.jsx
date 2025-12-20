import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.png';
import './Login.css';

const Login = () => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(username, password);
        } catch (err) {
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <img src={logo} alt="DB-Hub" className="login-logo" />
                    <h1>Welcome to DB-Hub</h1>
                    <p>Sign in to access the database explorer</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            disabled={isLoading}
                            autoFocus
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="login-button"
                        disabled={isLoading || !username || !password}
                    >
                        {isLoading && <Loader2 size={18} />}
                        {isLoading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>
                        Powered by{' '}
                        <a
                            href="https://luisdotcom.dev/"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            luisdotcom
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
