import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import AddCategory from './components/AddCategory';
import TestList from './components/Testlist';
import './App.css'; // Import your CSS file for global styles
import DeleteTests from './components/DeleteTests';
import UpdateCategoryTypes from './components/UpdateCategoryTypes';

function App() {
  return (
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/" element={<Login />} />
        <Route path="/add-category" element={<AddCategory />} />
        <Route path="/test-list" element={<TestList />} />
        <Route path="/delete-tests" element={<DeleteTests />} />
        <Route path="/update-category-types" element={<UpdateCategoryTypes />} />
      </Routes>
  );
}

export default App;