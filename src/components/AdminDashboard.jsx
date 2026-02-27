import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../data/firebase';
import { 
  collection, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  getDocs, 
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { FaFolderPlus, FaClipboardList, FaDownload, FaTrashAlt, FaRecycle, FaUndo } from "react-icons/fa";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import AutoParser from "./AutoParser";

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editUserId, setEditUserId] = useState(null);
  const [editUserData, setEditUserData] = useState({});
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // Qidirish uchun yangi state
  const [sortDirection, setSortDirection] = useState('asc');
  const [sortField, setSortField] = useState('lastName'); // Qaysi maydon bo'yicha saralash
  const [activeTab, setActiveTab] = useState('active'); // 'active' yoki 'deleted'
  const [deleting, setDeleting] = useState(false); // Loading state for deletion
  const [selectedIds, setSelectedIds] = useState([]); // Tanlangan foydalanuvchilar

  // Error handling funksiyasi
  const handleError = useCallback((error, message) => {
    console.error(message, error);
    setError(message);
    setLoading(false);
  }, []);

  // Ism va familyani to'g'rilaydigan funksiya
  const formatName = useCallback((name) => {
    if (!name || typeof name !== 'string') return '';
    
    return name
      .trim() // Bo'shliqlarni olib tashlash
      .toLowerCase() // Barcha harflarni kichik qilish
      .replace(/[^a-zA-Zа-яёА-ЯЁўқғҳ\s'-]/g, '') // Faqat harflar, bo'shliq, apostrof va defisga ruxsat berish
      .replace(/\s+/g, ' ') // Bir nechta bo'shliqni bitta bo'shliqqa aylantirish
      .split(' ') // So'zlarga ajratish
      .map(word => {
        if (word.length === 0) return '';
        // Birinchi harfni katta qilish, qolganlarini kichik qoldirish
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ') // So'zlarni qayta birlashtirish
      .trim(); // Oxirgi bo'shliqlarni olib tashlash
  }, []);

  useEffect(() => {
    const fetchUsers = () => {
      const usersRef = collection(db, 'users');
      return onSnapshot(usersRef, (snapshot) => {
        try {
          const usersData = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            // Butunlay o'chirilgan foydalanuvchilarni ko'rsatmaslik
            .filter(user => user.status !== 'permanentlyDeleted');
          setUsers(usersData);
          setLoading(false);
        } catch (err) {
          handleError(err, "Foydalanuvchilarni yuklashda xatolik");
        }
      }, (error) => {
        handleError(error, "Foydalanuvchilarni yuklashda xatolik");
      });
    };

    const unsubscribe = fetchUsers();
    return () => unsubscribe();
  }, [handleError]);

  useEffect(() => {
    const fetchCategories = () => {
      const categoriesRef = collection(db, 'categories');
      return onSnapshot(categoriesRef, (snapshot) => {
        try {
          const categoriesData = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name
          }));
          setCategories(categoriesData);
        } catch (err) {
          handleError(err, "Kategoriyalarni yuklashda xatolik");
        }
      }, (error) => {
        handleError(error, "Kategoriyalarni yuklashda xatolik");
      });
    };
  
    const unsubscribe = fetchCategories();
    return () => unsubscribe();
  }, [handleError]);

  useEffect(() => {
    const fetchDeletedUsers = () => {
      const deletedUsersRef = collection(db, 'deletedUsers');
      return onSnapshot(deletedUsersRef, (snapshot) => {
        try {
          const deletedUsersData = snapshot.docs.map(doc => {
            console.log('Deleted user ID:', doc.id, 'Data:', doc.data());
            return { ...doc.data(), id: doc.id, };
          });
          setDeletedUsers(deletedUsersData);
          console.log('Total deleted users:', deletedUsersData.length);
        } catch (err) {
          handleError(err, "O'chirilgan foydalanuvchilarni yuklashda xatolik");
        }
      }, (error) => {
        handleError(error, "O'chirilgan foydalanuvchilarni yuklashda xatolik");
      });
    };
  
    const unsubscribe = fetchDeletedUsers();
    return () => unsubscribe();
  }, [handleError]);

  // Tab o'zgarganda saralash maydonini qayta sozlash
  useEffect(() => {
    if (activeTab === 'deleted' && (sortField === 'passed')) {
      setSortField('lastName');
    }
  }, [activeTab, sortField]);

  const handleEditUser = useCallback(async () => {
    if (!editUserId) return;
    
    // Ism va familyani formatlash
    const formattedFirstName = formatName(editUserData.firstName);
    const formattedLastName = formatName(editUserData.lastName);
    
    // Validation
    if (!formattedFirstName?.trim() || !formattedLastName?.trim()) {
      alert("Ism va familya bo'sh bo'lishi mumkin emas");
      return;
    }
    
    if (editUserData.correct < 0 || editUserData.incorrect < 0) {
      alert("Javoblar soni manfiy bo'lishi mumkin emas");
      return;
    }

    // passed maydonini aniq boolean qiymatiga aylantirish
    if (typeof editUserData.passed !== 'boolean') {
      editUserData.passed = Boolean(editUserData.passed);
    }
    
    try {
      const userRef = doc(db, 'users', editUserId);
      await updateDoc(userRef, {
        ...editUserData,
        firstName: formattedFirstName,
        lastName: formattedLastName,
        correct: Number(editUserData.correct),
        incorrect: Number(editUserData.incorrect),
        passed: Boolean(editUserData.passed) // Boolean qiymatni aniq qilamiz
      });
      setEditUserId(null);
      setEditUserData({});
      
      // Muvaffaqiyat xabari
      alert(`${formattedFirstName} ${formattedLastName} ma'lumotlari yangilandi`);
    } catch (err) {
      console.error("Error updating user:", err);
      alert("Foydalanuvchi ma'lumotlarini yangilashda xatolik");
    }
  }, [editUserId, editUserData, formatName]);

  const startEditing = useCallback((user) => {
    setEditUserId(user.id);
    setEditUserData({ 
      firstName: user.firstName, 
      lastName: user.lastName, 
      correct: user.correct, 
      incorrect: user.incorrect,
      passed: user.passed // Boolean qiymatni qo'shamiz
    });
  }, []);

  const cancelEditing = useCallback(() => {
    setEditUserId(null);
    setEditUserData({});
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;
    
    // Ism va familya uchun avtomatik formatlash
    if (name === 'firstName' || name === 'lastName') {
      newValue = formatName(newValue);
    }
    
    setEditUserData(prevData => {
      const updatedData = {
        ...prevData,
        [name]: newValue
      };

      // Agar to'g'ri yoki noto'g'ri javoblar o'zgarsa, holatni avtomatik hisoblash
      if (name === 'correct' || name === 'incorrect') {
        const correctCount = Number(name === 'correct' ? newValue : prevData.correct) || 0;
        const incorrectCount = Number(name === 'incorrect' ? newValue : prevData.incorrect) || 0;
        const totalQuestions = correctCount + incorrectCount;
        
        // 60% va undan ko'p to'g'ri javob bo'lsa, "O'tdi" deb belgilash
        if (totalQuestions > 0) {
          const passPercentage = (correctCount / totalQuestions) * 100;
          updatedData.passed = passPercentage >= 60;
        }
      }

      return updatedData;
    });
  }, [formatName]);

  const handleDeleteUser = useCallback(async (userId) => {
    if (window.confirm('Haqiqatan ham bu foydalanuvchini o\'chirmoqchimisiz?')) {
      try {
        // Avval foydalanuvchi ma'lumotlarini olamiz
        const userToDelete = users.find(user => user.id === userId);
        if (!userToDelete) return;

        // O'chirilgan foydalanuvchi ma'lumotlarini to'ldirish
        const deletedUserData = {
          ...userToDelete,
          deletedAt: new Date(),
          deletedDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
          categoryName: categories.find(cat => cat.id === userToDelete.selectedCategory)?.name || 'Noma\'lum'
        };

        // O'chirilganlar collection'iga qo'shamiz
        await addDoc(collection(db, 'deletedUsers'), deletedUserData);

        // Asosiy collection'dan o'chiramiz
        const userRef = doc(db, 'users', userId);
        await deleteDoc(userRef);

      } catch (err) {
        console.error("Error deleting user:", err);
        alert("Foydalanuvchini o'chirishda xatolik");
      }
    }
  }, [users, categories]);

  const handleRestoreUser = useCallback(async (deletedUserId) => {
    if (window.confirm('Haqiqatan ham bu foydalanuvchini qayta tiklamoqchimisiz?')) {
      try {
        // O'chirilgan foydalanuvchi ma'lumotlarini olamiz
        const userToRestore = deletedUsers.find(user => user.id === deletedUserId);
        if (!userToRestore) return;

        // Tiklash uchun ma'lumotlarni tayyorlaymiz (o'chirish ma'lumotlarini olib tashlaymiz)
        const { deletedAt, deletedDate, categoryName, id, ...restoredUserData } = userToRestore;

        // Asosiy collection'ga qayta qo'shamiz
        await addDoc(collection(db, 'users'), restoredUserData);

        // O'chirilganlar collection'dan o'chiramiz
        const deletedUserRef = doc(db, 'deletedUsers', deletedUserId);
        await deleteDoc(deletedUserRef);

      } catch (err) {
        console.error("Error restoring user:", err);
        alert("Foydalanuvchini qayta tiklashda xatolik");
      }
    }
  }, [deletedUsers]);

  const handlePermanentDelete = useCallback(async (deletedUserId) => {
    const userToDelete = deletedUsers.find(user => user.id === deletedUserId);
    
    if (!userToDelete) {
      alert('Xatolik: Foydalanuvchi topilmadi');
      return;
    }
    
    if (window.confirm(`OGOHLANTIRISH: ${userToDelete.firstName} ${userToDelete.lastName} ${deletedUserId} butunlay o'chiriladi va qayta tiklab bo'lmaydi. Davom etasizmi?`)) {
      try {
        setDeleting(true);
        console.log('Butunlay o\'chirish boshlandi:', deletedUserId);
        
        // Faqat deletedUsers collection'dan o'chiramiz
        const deletedUserRef = doc(db, 'deletedUsers', deletedUserId);
        await deleteDoc(deletedUserRef);

        
        console.log('Foydalanuvchi muvaffaqiyatli o\'chirildi');
        alert(`${userToDelete.firstName} ${userToDelete.lastName} butunlay o'chirildi`);
        
      } catch (err) {
        console.error("Xatolik:", err);
        alert(`Xatolik: ${err.message}`);
      } finally {
        setDeleting(false);
      }
    }
  }, [deletedUsers]);

  // Toggle single selection
  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      return [...prev, id];
    });
  }, []);

  // Select or deselect all visible users
  const toggleSelectAll = useCallback((allIds) => {
    setSelectedIds(prev => {
      const allSelected = allIds.every(id => prev.includes(id));
      if (allSelected) return prev.filter(id => !allIds.includes(id));
      // add those not already selected
      const combined = Array.from(new Set([...prev, ...allIds]));
      return combined;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  // Bulk delete (move from users -> deletedUsers)
  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Tanlangan ${selectedIds.length} foydalanuvchini o'chirmoqchimisiz?`)) return;
    try {
      setDeleting(true);
      const ops = selectedIds.map(async (userId) => {
        const userToDelete = users.find(u => u.id === userId);
        if (!userToDelete) return;
        const deletedUserData = {
          ...userToDelete,
          deletedAt: new Date(),
          deletedDate: new Date().toISOString().split('T')[0],
          categoryName: categories.find(cat => cat.id === userToDelete.selectedCategory)?.name || 'Noma\'lum'
        };
        await addDoc(collection(db, 'deletedUsers'), deletedUserData);
        await deleteDoc(doc(db, 'users', userId));
      });
      await Promise.all(ops);
      alert('Tanlangan foydalanuvchilar o\'chirildi');
      clearSelection();
    } catch (err) {
      console.error('Bulk delete error', err);
      alert('Tanlangan foydalanuvchilarni o\'chirishda xatolik');
    } finally {
      setDeleting(false);
    }
  }, [selectedIds, users, categories, clearSelection]);

  // Bulk restore (from deletedUsers -> users)
  const handleBulkRestore = useCallback(async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Tanlangan ${selectedIds.length} foydalanuvchini qayta tiklamoqchimisiz?`)) return;
    try {
      setDeleting(true);
      const ops = selectedIds.map(async (deletedId) => {
        const userToRestore = deletedUsers.find(u => u.id === deletedId);
        if (!userToRestore) return;
        const { deletedAt, deletedDate, categoryName, id, ...restoredUserData } = userToRestore;
        await addDoc(collection(db, 'users'), restoredUserData);
        await deleteDoc(doc(db, 'deletedUsers', deletedId));
      });
      await Promise.all(ops);
      alert('Tanlangan foydalanuvchilar qayta tiklandi');
      clearSelection();
    } catch (err) {
      console.error('Bulk restore error', err);
      alert('Tanlangan foydalanuvchilarni qayta tiklashda xatolik');
    } finally {
      setDeleting(false);
    }
  }, [selectedIds, deletedUsers, clearSelection]);

  // Bulk permanent delete (from deletedUsers)
  const handleBulkPermanentDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Tanlangan ${selectedIds.length} foydalanuvchini butunlay o'chirib tashlamoqchimisiz? Bu qaytarib bo'lmaydi.`)) return;
    try {
      setDeleting(true);
      const ops = selectedIds.map(async (deletedId) => {
        await deleteDoc(doc(db, 'deletedUsers', deletedId));
      });
      await Promise.all(ops);
      alert('Tanlangan foydalanuvchilar butunlay o\'chirildi');
      clearSelection();
    } catch (err) {
      console.error('Bulk permanent delete error', err);
      alert('Tanlangan foydalanuvchilarni butunlay o\'chirishda xatolik');
    } finally {
      setDeleting(false);
    }
  }, [selectedIds, clearSelection]);

  // Format date utility function
  const formatDate = useCallback((date) => {
    return date.toISOString().split('T')[0].replace(/-/g, '.');
  }, []);

  const sortUsersByField = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(prevDirection => prevDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const filteredUsers = useMemo(() => {
    const sourceData = activeTab === 'active' ? users : deletedUsers;
    
    let filtered = sourceData.filter(user => {
      const matchesCategory = filterCategory ? user.selectedCategory === filterCategory : true;
      const matchesSearchTerm = `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearchTerm;
    });

    // Saralash
    filtered.sort((a, b) => {
      let valueA, valueB;

      if (sortField === 'correct' || sortField === 'incorrect') {
        // Raqamli qiymatlar uchun
        valueA = Number(a[sortField]) || 0;
        valueB = Number(b[sortField]) || 0;
      } else if (sortField === 'passed') {
        // Boolean qiymatlar uchun
        valueA = a[sortField] ? 1 : 0;
        valueB = b[sortField] ? 1 : 0;
      } else if (sortField === 'deletedDate') {
        // Sana uchun
        valueA = new Date(a[sortField] || 0);
        valueB = new Date(b[sortField] || 0);
      } else {
        // Matnli qiymatlar uchun
        valueA = a[sortField]?.toLowerCase() || '';
        valueB = b[sortField]?.toLowerCase() || '';
      }

      if (sortDirection === 'asc') {
        return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
      } else {
        return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
      }
    });

    return filtered;
  }, [users, deletedUsers, filterCategory, searchTerm, sortDirection, sortField, activeTab]);

  const exportToPDF = useCallback(() => {
    const doc = new jsPDF();
    const date = new Date();
    const findCategory = categories?.find(item => item.id === filterCategory);
    
    doc.text(`Yo'nalish: ${findCategory?.name || 'Barcha yo\'nalishlar'}`, 15, 10);
    doc.text(`Test olingan sana: ${formatDate(date)}`, 15, 20);
    
    doc.autoTable({
      startY: 25,
      head: [['Ism va familiya', 'To\'g\'ri javoblar', 'Noto\'g\'ri javoblar', 'Holat']],
      body: filteredUsers.map(user => [
        `${user.firstName} ${user.lastName}`,
        user.correct,
        user.incorrect,
        user.passed ? 'O\'tgan' : 'O\'tmagan'
      ]),
    });
    
    const fileName = findCategory?.name || 'Barcha_natijalar';
    doc.save(`${fileName}_${formatDate(date)}.pdf`);
  }, [categories, filterCategory, filteredUsers, formatDate]);

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
      {/* <AutoParser /> */}
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
                <li>
                  <Link 
                    to="/update-category-types" 
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <FaClipboardList className="w-4 h-4" />
                    <span>Yo'nalish turlarini yangilash</span>
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
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 pt-6" aria-label="Tabs">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`py-2 px-4 rounded-md text-sm font-semibold ${
                    activeTab === 'active'
                      ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  Faol foydalanuvchilar ({users.length})
                </button>
                <button
                  onClick={() => setActiveTab('deleted')}
                  className={`py-2 px-4 rounded-md text-sm font-semibold ${
                    activeTab === 'deleted'
                      ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  Eski foydalanuvchilar ({deletedUsers.length})
                </button>
              </div>
              <div className="mt-3 sm:mt-0 text-sm text-gray-500">Admin panel — barcha ma'lumotlar tartibli ko'rsatiladi</div>
            </nav>
          </div>

          {/* Filters */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="flex items-center space-x-3">
                <select
                  onChange={(e) => setFilterCategory(e.target.value)}
                  value={filterCategory}
                  className="rounded-md border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-200"
                  aria-label="Yo'nalish bo'yicha filtr"
                >
                  <option value="">Barcha yo'nalishlar</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>

                <div className="hidden sm:block text-sm text-gray-500">|</div>

                <div className="text-sm text-gray-600">Saralash:</div>
                <select 
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value)}
                  className="rounded-md border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-200"
                >
                  <option value="lastName">Familya</option>
                  <option value="firstName">Ism</option>
                  {activeTab === 'active' && (
                    <>
                      <option value="correct">To'g'ri javoblar</option>
                      <option value="incorrect">Noto'g'ri javoblar</option>
                      <option value="passed">Holat</option>
                    </>
                  )}
                  {activeTab === 'deleted' && (
                    <>
                      <option value="categoryName">Yo'nalish</option>
                      <option value="deletedDate">O'chirilgan sana</option>
                      <option value="correct">To'g'ri javoblar</option>
                      <option value="incorrect">Noto'g'ri javoblar</option>
                    </>
                  )}
                </select>
                <button
                  onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
                >
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </button>
              </div>

              <div className="flex items-center justify-center md:justify-start">
                <input
                  type="text"
                  placeholder="Ism yoki familiya bilan qidirish"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-80 rounded-md border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-200"
                  aria-label="Foydalanuvchi qidirish"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={exportToPDF}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  <FaDownload className="w-4 h-4 mr-2" />
                  PDF
                </button>

                {activeTab === 'active' ? (
                  <button
                    onClick={handleBulkDelete}
                    disabled={selectedIds.length === 0 || deleting}
                    className={`inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 ${selectedIds.length === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <FaTrashAlt className="w-4 h-4 mr-2" />
                    O'chirish ({selectedIds.length})
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleBulkRestore}
                      disabled={selectedIds.length === 0 || deleting}
                      className={`inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 ${selectedIds.length === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <FaUndo className="w-4 h-4 mr-2" />
                      Qayta tiklash ({selectedIds.length})
                    </button>
                    <button
                      onClick={handleBulkPermanentDelete}
                      disabled={selectedIds.length === 0 || deleting}
                      className={`inline-flex items-center px-4 py-2 bg-red-700 text-white text-sm font-medium rounded-md hover:bg-red-800 ${selectedIds.length === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <FaRecycle className="w-4 h-4 mr-2" />
                      Butunlay o'chirish ({selectedIds.length})
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-block bg-white shadow-sm rounded-lg px-6 py-8">
                  <p className="text-gray-700 text-lg font-medium">Hech qanday foydalanuvchi topilmadi</p>
                  <p className="text-sm text-gray-500 mt-2">Filtrlarni tekshiring yoki yangi foydalanuvchilar qo'shing.</p>
                </div>
              </div>
            ) : (
              <div className="shadow-sm rounded-lg overflow-hidden bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        aria-label="Hammasini tanlash"
                        onChange={() => toggleSelectAll(filteredUsers.map(u => u.id))}
                        checked={filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.includes(u.id))}
                      />
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => sortUsersByField('lastName')}
                    >
                      Familiya 
                      {sortField === 'lastName' && (
                        <span className="ml-2">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => sortUsersByField('firstName')}
                    >
                      Ism
                      {sortField === 'firstName' && (
                        <span className="ml-2">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    {activeTab === 'deleted' && (
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => sortUsersByField('categoryName')}
                      >
                        Yo'nalish
                        {sortField === 'categoryName' && (
                          <span className="ml-2">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                    )}
                    {activeTab === 'deleted' && (
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => sortUsersByField('deletedDate')}
                      >
                        Qo'shilgan sana
                        {sortField === 'deletedDate' && (
                          <span className="ml-2">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                    )}
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => sortUsersByField('correct')}
                    >
                      To'g'ri javoblar
                      {sortField === 'correct' && (
                        <span className="ml-2">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => sortUsersByField('incorrect')}
                    >
                      Noto'g'ri javoblar
                      {sortField === 'incorrect' && (
                        <span className="ml-2">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    {activeTab === 'active' && (
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => sortUsersByField('passed')}
                      >
                        Holat
                        {sortField === 'passed' && (
                          <span className="ml-2">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harakatlar</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        aria-label={`Tanlash ${user.firstName} ${user.lastName}`}
                        checked={selectedIds.includes(user.id)}
                        onChange={() => toggleSelect(user.id)}
                      />
                    </td>
                    <td className="px-6 py-4 align-top">
                      {editUserId === user.id && activeTab === 'active' ? (
                        <div>
                          <input
                            type="text"
                            name="lastName"
                            value={editUserData.lastName}
                            onChange={handleChange}
                            placeholder="Familya (avtomatik formatlash)"
                            title="Familya avtomatik to'g'ri formatda saqlanadi (Masalan: aliYeV -> Aliyev)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.lastName}</div>
                        </div>
                      )}

                      {filterCategory === '' && (
                        <div className="mt-2">
                          <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-1 rounded-md shadow-sm">
                            {activeTab === 'deleted'
                              ? (user.categoryName || 'Noma\'lum')
                              : (categories.find(cat => cat.id === user.selectedCategory)?.name || 'Noma\'lum')}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editUserId === user.id && activeTab === 'active' ? (
                        <input
                          type="text"
                          name="firstName"
                          value={editUserData.firstName}
                          onChange={handleChange}
                          placeholder="Ism (avtomatik formatlash)"
                          title="Ism avtomatik to'g'ri formatda saqlanadi (Masalan: aLI -> Ali)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="text-sm text-gray-500">{user.firstName}</span>
                      )}
                    </td>
                    {activeTab === 'deleted' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{user.categoryName || 'Noma\'lum'}</span>
                      </td>
                    )}
                    {activeTab === 'deleted' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{user.deletedDate}</span>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editUserId === user.id && activeTab === 'active' ? (
                        <input
                          type="number"
                          name="correct"
                          value={editUserData.correct}
                          onChange={handleChange}
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {user.correct}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editUserId === user.id && activeTab === 'active' ? (
                        <input
                          type="number"
                          name="incorrect"
                          value={editUserData.incorrect}
                          onChange={handleChange}
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {user.incorrect}
                        </span>
                      )}
                    </td>
                    {activeTab === 'active' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editUserId === user.id ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between space-x-4">
                                  <select
                                    name="passed"
                                    value={editUserData.passed}
                                    onChange={(e) => handleChange({
                                      target: {
                                        name: 'passed',
                                        value: e.target.value === 'true',
                                        type: 'select'
                                      }
                                    })}
                                    className="w-40 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  >
                                    <option value={true}>O'tdi</option>
                                    <option value={false}>O'ta olmadi</option>
                                  </select>
                                  {(editUserData.correct || editUserData.incorrect) && (
                                    (() => {
                                      const correct = Number(editUserData.correct) || 0;
                                      const incorrect = Number(editUserData.incorrect) || 0;
                                      const total = correct + incorrect;
                                      if (total === 0) return null;
                                      const percentage = Math.round((correct / total) * 100);
                                      return (
                                        <div className="text-right">
                                          <div className="text-sm font-medium text-gray-700">{percentage}%</div>
                                          <div className="text-xs text-gray-500">{correct}/{total}</div>
                                        </div>
                                      );
                                    })()
                                  )}
                                </div>
                              </div>
                        ) : (
                              <div className="flex items-center space-x-3">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                  user.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {user.passed ? 'O\'tdi' : 'O\'ta olmadi'}
                                </span>
                                {(() => {
                                  const correct = Number(user.correct) || 0;
                                  const incorrect = Number(user.incorrect) || 0;
                                  const total = correct + incorrect;
                                  if (total === 0) return null;
                                  const percentage = Math.round((correct / total) * 100);
                                  return (
                                    <div className="flex items-baseline space-x-2">
                                      <div className="text-sm font-semibold text-gray-700">{percentage}%</div>
                                      <div className="text-xs text-gray-400">{correct}/{total}</div>
                                    </div>
                                  );
                                })()}
                              </div>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        {activeTab === 'active' ? (
                          <>
                            {editUserId === user.id ? (
                              <>
                                <button
                                  onClick={handleEditUser}
                                  className="inline-flex items-center px-3 py-1 bg-green-500 text-white text-xs font-medium rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                  aria-label={`${user.firstName} ${user.lastName} ma'lumotlarini saqlash`}
                                >
                                  Saqlash
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="inline-flex items-center px-3 py-1 bg-gray-500 text-white text-xs font-medium rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                  aria-label="Tahrirlashni bekor qilish"
                                >
                                  Bekor qilish
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => startEditing(user)}
                                className="inline-flex items-center px-3 py-1 bg-yellow-500 text-white text-xs font-medium rounded hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                                aria-label={`${user.firstName} ${user.lastName} ma'lumotlarini tahrirlash`}
                              >
                                Tahrirlash
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="inline-flex items-center px-3 py-1 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              aria-label={`${user.firstName} ${user.lastName} foydalanuvchisini o'chirish`}
                            >
                              O'chirish
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRestoreUser(user.id)}
                              className="inline-flex items-center px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              aria-label={`${user.firstName} ${user.lastName} foydalanuvchisini qayta tiklash`}
                            >
                              Qayta tiklash
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(user.id)}
                              disabled={deleting}
                              className={`inline-flex items-center px-3 py-1 text-white text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                                deleting 
                                  ? 'bg-red-400 cursor-not-allowed' 
                                  : 'bg-red-600 hover:bg-red-700'
                              }`}
                              aria-label={`${user.firstName} ${user.lastName} foydalanuvchisini butunlay o'chirish`}
                            >
                              {deleting ? 'O\'chirilmoqda...' : 'Butunlay o\'chirish'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;