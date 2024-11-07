import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

import { FaGoogle } from "react-icons/fa";

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const auth = getAuth();
  const provider = new GoogleAuthProvider();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin');  // Login muvaffaqiyatli bo'lsa, admin sahifasiga yo'naltiriladi
    } catch (error) {
      console.error('Login xatosi:', error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      navigate('/admin');  // Google orqali login muvaffaqiyatli bo'lsa, admin sahifasiga yo'naltiriladi
    } catch (error) {
      console.error('Google orqali login xatosi:', error);
      alert("Xato");
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center flex-col">
      <h1 className='text-4xl font-bold mb-4'>Admin Kirish</h1>
      <form onSubmit={handleLogin}>
        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-900'>Email</label>
          <input
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5'
          />
        </div>
        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-900'>Parol</label>
          <input
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5'
          />
        </div>
        <button type='submit' className='text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2'>Kirish</button>
      </form>
      <button onClick={handleGoogleLogin} className='bg-red-500 text-white p-2 rounded mt-4 flex items-center gap-3'>
        <FaGoogle color='#fff' /> Google orqali kirish
      </button>
    </div>
  );
}

export default Login;
