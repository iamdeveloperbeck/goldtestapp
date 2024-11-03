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
    <div>
      <h1 className='text-4xl font-bold mb-4'>Admin Kirish</h1>
      <form onSubmit={handleLogin}>
        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-700'>Email</label>
          <input
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className='border p-2 w-full'
          />
        </div>
        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-700'>Parol</label>
          <input
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className='border p-2 w-full'
          />
        </div>
        <button type='submit' className='bg-blue-500 text-white p-2 rounded'>Kirish</button>
      </form>
      <button onClick={handleGoogleLogin} className='bg-red-500 text-white p-2 rounded mt-4'>
        <FaGoogle color='#fff' /> Google orqali kirish
      </button>
    </div>
  );
}

export default Login;