import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../data/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { BiLogOutCircle } from "react-icons/bi";
import { FaSpinner } from "react-icons/fa";

function UpdateCategoryTypes() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [targetType, setTargetType] = useState('entrance');

  // Clear messages after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      setError('');
      const querySnapshot = await getDocs(collection(db, 'categories'));
      const categoriesData = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        type: doc.data().type || 'entrance' // Default type for old categories
      }));
      setCategories(categoriesData);
    } catch (error) {
      console.error('Kategoriyalarni olishda xato:', error);
      setError('Kategoriyalarni yuklashda xato yuz berdi');
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const toggleCategorySelection = useCallback((categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  }, []);

  const updateSelectedCategories = useCallback(async () => {
    if (selectedCategories.length === 0) {
      setError("Kategoriyalarni tanlang");
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Update each selected category
      for (const categoryId of selectedCategories) {
        const categoryRef = doc(db, 'categories', categoryId);
        const updatedData = {
          type: targetType,
          maxQuestions: targetType === 'entrance' ? 100 : 200,
          questionsPerTest: targetType === 'entrance' ? 30 : 50
        };
        await updateDoc(categoryRef, updatedData);
      }

      setSuccess(`${selectedCategories.length} ta kategoriya muvaffaqiyatli yangilandi`);
      setSelectedCategories([]); // Clear selection
      await fetchCategories(); // Refresh the list
    } catch (error) {
      console.error('Kategoriyalarni yangilashda xato:', error);
      setError('Kategoriyalarni yangilashda xato yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [selectedCategories, targetType, fetchCategories]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-1">
          <div
            onClick={() => window.history.back()}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors mb-4 cursor-pointer"
          >
            <BiLogOutCircle className="w-5 h-5 mr-2" />
            Ortga qaytish
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-600 to-indigo-600">
            <h1 className="text-2xl font-bold text-white">Kategoriya turlarini yangilash</h1>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}
          {success && (
            <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm font-medium">{success}</p>
            </div>
          )}

          <div className="p-6 sm:p-8 space-y-8">
            {/* Update Type Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  className="rounded-lg shadow-md p-[10px] focus:ring-2 focus:ring-blue-500 border border-gray-300"
                >
                  <option value="entrance">Kirish testlari</option>
                  <option value="exit">Chiqish testlari</option>
                </select>
                <button
                  onClick={updateSelectedCategories}
                  disabled={loading || selectedCategories.length === 0}
                  className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? <FaSpinner className="animate-spin" /> : null}
                  Tanlangan kategoriyalarni yangilash
                </button>
              </div>

              <div className="text-sm text-gray-600">
                {targetType === 'entrance' ? 
                  '* Kirish testida har bir kategoriyada 100 ta test bo\'ladi, o\'quvchi uchun 30 tasi random shaklda chiqadi' :
                  '* Chiqish testida har bir kategoriyada 200 ta test bo\'ladi, o\'quvchi uchun 50 tasi random shaklda chiqadi'
                }
              </div>
            </div>

            {/* Categories List */}
            <div className="space-y-6">
              {categoriesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <FaSpinner className="animate-spin text-blue-600 text-2xl" />
                  <span className="ml-2 text-gray-600">Kategoriyalar yuklanmoqda...</span>
                </div>
              ) : categories.length === 0 ? (
                <p className="text-gray-500 italic">Hozircha kategoriyalar mavjud emas</p>
              ) : (
                <div className="space-y-6">
                  {/* Entrance Categories */}
                  <div>
                    <h3 className="text-lg font-semibold text-blue-800 mb-3">Kirish testlari</h3>
                    <div className="flex flex-wrap gap-2">
                      {categories
                        .filter(category => category.type === 'entrance')
                        .map((category) => (
                          <div key={category.id} 
                               onClick={() => toggleCategorySelection(category.id)}
                               className={`cursor-pointer inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                                 selectedCategories.includes(category.id)
                                   ? 'bg-blue-600 text-white'
                                   : 'bg-blue-100 text-blue-800'
                               }`}>
                            {category.name} ({category.tests?.length || 0}/100)
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Exit Categories */}
                  <div>
                    <h3 className="text-lg font-semibold text-green-800 mb-3">Chiqish testlari</h3>
                    <div className="flex flex-wrap gap-2">
                      {categories
                        .filter(category => category.type === 'exit')
                        .map((category) => (
                          <div key={category.id}
                               onClick={() => toggleCategorySelection(category.id)}
                               className={`cursor-pointer inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                                 selectedCategories.includes(category.id)
                                   ? 'bg-green-600 text-white'
                                   : 'bg-green-100 text-green-800'
                               }`}>
                            {category.name} ({category.tests?.length || 0}/200)
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* No Type Categories (if any) */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Turi belgilanmagan kategoriyalar</h3>
                    <div className="flex flex-wrap gap-2">
                      {categories
                        .filter(category => !category.type)
                        .map((category) => (
                          <div key={category.id}
                               onClick={() => toggleCategorySelection(category.id)}
                               className={`cursor-pointer inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                                 selectedCategories.includes(category.id)
                                   ? 'bg-gray-600 text-white'
                                   : 'bg-gray-100 text-gray-800'
                               }`}>
                            {category.name} ({category.tests?.length || 0} ta test)
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpdateCategoryTypes;