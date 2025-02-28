import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../data/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { FaFolderPlus, FaClipboardList, FaDownload } from "react-icons/fa";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editUserId, setEditUserId] = useState(null);
  const [editUserData, setEditUserData] = useState({});
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // Qidirish uchun yangi state
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    const fetchUsers = () => {
      const usersRef = collection(db, 'users');
      return onSnapshot(usersRef, (snapshot) => {
        try {
          const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setUsers(usersData);
          setLoading(false);
        } catch (err) {
          console.error("Error fetching users:", err);
          setError("Error fetching users");
          setLoading(false);
        }
      });
    };

    const unsubscribe = fetchUsers();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchCategories = () => {
      const categoriesRef = collection(db, 'categories');
      return onSnapshot(categoriesRef, (snapshot) => {
        const categoriesData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }));
        setCategories(categoriesData);
      });
    };
  
    fetchCategories();
  }, []);

  const handleEditUser = async () => {
    if (!editUserId) return;
    try {
      const userRef = doc(db, 'users', editUserId);
      await updateDoc(userRef, editUserData);
      setEditUserId(null);
      setEditUserData({});
    } catch (err) {
      console.error("Error updating user:", err);
      alert("Error updating user data");
    }
  };

  const startEditing = (user) => {
    setEditUserId(user.id);
    setEditUserData({ 
      firstName: user.firstName, 
      lastName: user.lastName, 
      correct: user.correct, 
      incorrect: user.incorrect 
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditUserData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Haqiqatan ham bu foydalanuvchini o\'chirmoqchimisiz?')) {
      try {
        const userRef = doc(db, 'users', userId);
        await deleteDoc(userRef);
      } catch (err) {
        console.error("Error deleting user:", err);
        alert("Error deleting user data");
      }
    }
  };

  function formatDate(date) {
    return date.toISOString().split('T')[0].replace(/-/g, '.');
}

  const exportToPDF = () => {
    const doc = new jsPDF();
    const date = new Date()
    const findCategory = categories?.find(item => item.id === filterCategory)
    doc.text(`${findCategory?.name} ${formatDate(date)`, 20, 10);
    doc.autoTable({
      head: [['Ism va familiya', 'To\'g\'ri javoblar', 'Noto\'g\'ri javoblar', 'Holat']],
      body: filteredUsers.map(user => [
        `${user.firstName} ${user.lastName}`,
        user.correct,
        user.incorrect,
        user.passed ? 'O\'tgan' : 'O\'tmagan'
      ]),
    });
    doc.save('foydalanuvchilar_hisobi.pdf');
  };

  const sortUsersByLastName = () => {
    const sortedUsers = [...users].sort((a, b) => {
      const nameA = a.lastName.toLowerCase();
      const nameB = b.lastName.toLowerCase();

      if (sortDirection === 'asc') {
        return nameA > nameB ? 1 : -1;
      } else {
        return nameA < nameB ? 1 : -1;
      }
    });

    setUsers(sortedUsers);
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const filteredUsers = users.filter(user => {
    const matchesCategory = filterCategory ? user.selectedCategory === filterCategory : true;
    const matchesSearchTerm = `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearchTerm;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Xato!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">Boshqaruv paneli</h1>
            <nav>
              <ul className="flex items-center space-x-6">
                <li>
                  <Link 
                    to="/add-category" 
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <FaFolderPlus className="w-4 h-4" />
                    <span>Yo'nalish va savollar qo'shish</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/test-list" 
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <FaClipboardList className="w-4 h-4" />
                    <span>Testlar ro'yxati</span>
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          {/* Filters */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <select
                onChange={(e) => setFilterCategory(e.target.value)}
                value={filterCategory}
                className="w-64 rounded-lg border-gray-300 shadow-md border p-[8px] focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Barcha yo'nalishlar</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Ism yoki familiya bilan qidirish"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 rounded-lg border-gray-300 shadow-md border p-[8px] focus:border-blue-500 focus:ring-blue-500"
              />

              <button
                onClick={sortUsersByLastName}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Familya bo'yicha saralash ({sortDirection === 'asc' ? 'A-Z' : 'Z-A'})
              </button>
              <button
                onClick={exportToPDF}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FaDownload className="w-4 h-4 mr-2" />
                PDF ga yuklab olish
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Familiya</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ism</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To'g'ri javoblar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Noto'g'ri javoblar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Holat</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harakatlar</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editUserId === user.id ? (
                        <input
                          type="text"
                          name="lastName"
                          value={editUserData.lastName}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-900">{user.lastName}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editUserId === user.id ? (
                        <input
                          type="text"
                          name="firstName"
                          value={editUserData.firstName}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="text-sm text-gray-500">{user.firstName}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editUserId === user.id ? (
                        <input
                          type="number"
                          name="correct"
                          value={editUserData.correct}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {user.correct}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editUserId === user.id ? (
                        <input
                          type="number"
                          name="incorrect"
                          value={editUserData.incorrect}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {user.incorrect}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.passed ? 'O\'tdi' : 'O\'ta olmadi'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        {editUserId === user.id ? (
                          <button
                            onClick={handleEditUser}
                            className="inline-flex items-center px-3 py-1 bg-green-500 text-white text-xs font-medium rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            Saqlash
                          </button>
                        ) : (
                          <button
                            onClick={() => startEditing(user)}
                            className="inline-flex items-center px-3 py-1 bg-yellow-500 text-white text-xs font-medium rounded hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                          >
                            Tahrirlash
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="inline-flex items-center px-3 py-1 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          O'chirish
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
