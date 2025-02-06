import React, { useState, useEffect } from 'react';
import { db } from '../data/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { BiLogOutCircle } from "react-icons/bi";
import { FaClipboardList } from "react-icons/fa";

function AddCategoryAndQuestions() {
  const [categoryName, setCategoryName] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [testNumber, setTestNumber] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchTestCount();
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    const querySnapshot = await getDocs(collection(db, 'categories'));
    const categoriesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCategories(categoriesData);
  };

  const fetchTestCount = async () => {
    try {
      const categoryRef = doc(db, 'categories', selectedCategory);
      const categoryDoc = await getDoc(categoryRef);
      if (categoryDoc.exists()) {
        const tests = categoryDoc.data().tests || [];
        setTestNumber(tests.length + 1);
      }
    } catch (error) {
      console.error('Testlarni olishda xato:', error);
    }
  };

  const addCategory = async () => {
    try {
      const newCategory = { name: categoryName, tests: [] };
      await addDoc(collection(db, 'categories'), newCategory);
      setCategoryName('');
      fetchCategories(); // Refresh categories list
    } catch (error) {
      console.error('Kategoriya qo\'shishda xato:', error);
    }
  };

  const addQuestion = async () => {
    if (!selectedCategory) {
      alert("Kategoriya tanlanmadi.");
      return;
    }

    const newQuestion = {
      question,
      options,
      correctAnswer
    };

    try {
      const categoryRef = doc(db, 'categories', selectedCategory);
      await updateDoc(categoryRef, {
        tests: arrayUnion({
          title: `Test ${testNumber}`,
          questions: [newQuestion]
        })
      });

      setQuestion('');
      setOptions(['', '', '', '']);
      setCorrectAnswer('');
      setTestNumber(testNumber + 1);
    } catch (error) {
      console.error('Savol qo\'shishda xato:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Back Button */}
          <Link 
            to="/admin" 
            className="mb-8 inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors"
          >
            <BiLogOutCircle className="w-5 h-5 mr-2" />
            Ortga qaytish
          </Link>
          <Link 
            to="/test-list" 
            className="flex items-center space-x-2 mb-8 text-blue-600 hover:text-blue-700 transition-colors"
          >
              <FaClipboardList className="w-4 h-4" />
              <span>Testlar ro'yxati</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-600 to-indigo-600">
            <h1 className="text-2xl font-bold text-white">Yo'nalishlar va savollar qo'shish</h1>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* Add Category Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Yo'nalish qo'shish</h2>
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Yo'nalish nomi"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-md border p-[10px] focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={addCategory}
                  className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Qo'shish
                </button>
              </div>
            </div>

            {/* Existing Categories */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Mavjud yo'nalishlar ro'yxati:</h2>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <span
                    key={category.id}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {category.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Add Question Form */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Savol qo'shish:</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yo'nalishni tanlang:
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-md border p-[10px] focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Tanlang</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <textarea
                    placeholder="Savol"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border-gray-300 shadow-md border p-[10px] focus:border-blue-500 focus:ring-blue-500"
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {options.map((option, index) => (
                      <input
                        key={index}
                        type="text"
                        placeholder={`Variant ${index + 1}`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...options];
                          newOptions[index] = e.target.value;
                          setOptions(newOptions);
                        }}
                        className="w-full rounded-lg border-gray-300 shadow-md border p-[10px] focus:border-blue-500 focus:ring-blue-500"
                      />
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="To'g'ri javob"
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-md border p-[10px] focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={addQuestion}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Qo'shish
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddCategoryAndQuestions;
