import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import AddCategory from './components/AddCategory';
import TestList from './components/Testlist';

function App() {
  return (
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/" element={<Login />} />
        <Route path="/add-category" element={<AddCategory />} />
        <Route path="/test-list" element={<TestList />} />
      </Routes>
  );
}

export default App;