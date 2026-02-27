import React, { useState, useEffect, useCallback } from 'react';
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { FaGoogle, FaSpinner } from "react-icons/fa";

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(false);
  
  const navigate = useNavigate();
  const auth = getAuth();
  const provider = new GoogleAuthProvider();

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    // Remember me funksiyasi uchun localStorage'dan email'ni yuklash
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
    
    return () => clearTimeout(timer);
  }, []);

  // Form validation
  const validateForm = useCallback(() => {
    const errors = {};
    
    if (!email.trim()) {
      errors.email = 'Email manzil kiritilishi shart';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Email manzil formati noto\'g\'ri';
    }
    
    if (!password.trim()) {
      errors.password = 'Parol kiritilishi shart';
    } else if (password.length < 6) {
      errors.password = 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email, password]);

  // Error message translation
  const getErrorMessage = useCallback((errorCode) => {
    const errorMessages = {
      'auth/user-not-found': 'Foydalanuvchi topilmadi',
      'auth/wrong-password': 'Noto\'g\'ri parol',
      'auth/invalid-email': 'Noto\'g\'ri email format',
      'auth/user-disabled': 'Foydalanuvchi hisobi bloklangan',
      'auth/too-many-requests': 'Juda ko\'p urinish. Biroz kutib turing',
      'auth/network-request-failed': 'Internet aloqasini tekshiring',
      'auth/popup-closed-by-user': 'Kirish oynasi yopildi',
      'auth/cancelled-popup-request': 'Kirish bekor qilindi',
      'auth/popup-blocked': 'Popup oyna bloklangan'
    };
    return errorMessages[errorCode] || 'Kirish xatosi yuz berdi';
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setError('');
    setValidationErrors({});
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      // Remember me funksiyasi
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      navigate('/admin');
    } catch (error) {
      console.error('Login xatosi:', error);
      setError(getErrorMessage(error.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    
    try {
      await signInWithPopup(auth, provider);
      navigate('/admin');
    } catch (error) {
      console.error('Google orqali login xatosi:', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        setError(getErrorMessage(error.code));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center p-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-40 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        
        {/* Scientific Pattern Overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-repeat" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234338ca' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
      </div>

      {/* Main Login Card */}
      <div className={`relative bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl w-full max-w-md p-8 border border-indigo-100 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        {/* Floating Icon */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl rotate-45 flex items-center justify-center">
            <svg 
              className="-rotate-45 w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-800 mt-4 mb-8">Admin Kirish</h1>
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (validationErrors.email) {
                  setValidationErrors(prev => ({...prev, email: ''}));
                }
              }}
              className={`w-full px-4 py-3 rounded-xl border transition-colors bg-white/50 backdrop-blur-sm ${
                validationErrors.email 
                  ? 'border-red-300 focus:ring-2 focus:ring-red-500 focus:border-transparent' 
                  : 'border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
              }`}
              placeholder="admin@example.com"
              disabled={isLoading}
              required
            />
            {validationErrors.email && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Parol
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (validationErrors.password) {
                    setValidationErrors(prev => ({...prev, password: ''}));
                  }
                }}
                className={`w-full px-4 py-3 rounded-xl border transition-colors bg-white/50 backdrop-blur-sm pr-10 ${
                  validationErrors.password 
                    ? 'border-red-300 focus:ring-2 focus:ring-red-500 focus:border-transparent' 
                    : 'border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                }`}
                placeholder="••••••••"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            </div>
            {validationErrors.password && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Email manzilni eslab qol
              </label>
            </div>
            <div className="text-sm">
              <button
                type="button"
                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                onClick={() => {
                  // Demo uchun preset email/password
                  setEmail('admin@test.com');
                  setPassword('123456');
                }}
              >
                Demo ma'lumotlar
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-6 text-white font-medium bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transform transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <FaSpinner className="w-4 h-4 animate-spin" />
                <span>Kirilmoqda...</span>
              </div>
            ) : (
              'Kirish'
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Yoki</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center py-3 px-6 space-x-3 border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <FaSpinner className="w-5 h-5 animate-spin text-gray-600" />
            ) : (
              <FaGoogle className="w-5 h-5 text-red-500" />
            )}
            <span className="text-gray-700 font-medium">
              {isLoading ? 'Kirilmoqda...' : 'Google orqali kirish'}
            </span>
          </button>
        </form>

        {/* Decorative Bottom Pattern */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 rounded-b-2xl"></div>
      </div>
    </div>
  );
}

export default Login;
