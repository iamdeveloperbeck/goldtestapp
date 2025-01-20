import React, { useState, useEffect } from 'react';
import { db } from '../data/firebase';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { BiLogOutCircle } from 'react-icons/bi';

function TestList() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [tests, setTests] = useState([]);
  const [editingTestIndex, setEditingTestIndex] = useState(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);
  const [editedQuestionData, setEditedQuestionData] = useState({ question: '', options: [], correctAnswer: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchTests();
    }
  }, [selectedCategory]);

  // Existing fetch functions
  const fetchCategories = async () => {
    const querySnapshot = await getDocs(collection(db, 'categories'));
    const categoriesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCategories(categoriesData);
  };

  const fetchTests = async () => {
    try {
      const categoryDocRef = doc(db, 'categories', selectedCategory);
      const categoryDocSnap = await getDoc(categoryDocRef);

      if (categoryDocSnap.exists()) {
        const categoryData = categoryDocSnap.data();
        const testsData = categoryData.tests.map((test, index) => {
          const firstQuestion = test.questions && test.questions.length > 0 ? test.questions[0].question : 'Savol mavjud emas';
          return {
            title: test.title || `Test ${index + 1}`,
            firstQuestion,
            questions: test.questions,
            testIndex: index
          };
        });
        setTests(testsData);
      } else {
        console.log("Kategoriya hujjati topilmadi!");
      }
    } catch (error) {
      console.error('Testlarni olishda xato:', error);
    }
  };

  // Existing handlers
  const handleEditClick = (testIndex, questionIndex, questionData) => {
    setEditingTestIndex(testIndex);
    setEditingQuestionIndex(questionIndex);
    setEditedQuestionData({
      question: questionData.question,
      options: questionData.options,
      correctAnswer: questionData.correctAnswer,
    });
  };

  const handleFieldChange = (field, value) => {
    setEditedQuestionData(prevData => ({
      ...prevData,
      [field]: value,
    }));
  };

  const handleOptionChange = (optionIndex, value) => {
    setEditedQuestionData(prevData => {
      const newOptions = [...prevData.options];
      newOptions[optionIndex] = value;
      return {
        ...prevData,
        options: newOptions,
      };
    });
  };

  const handleSaveClick = async () => {
    try {
      const categoryDocRef = doc(db, 'categories', selectedCategory);
      const categoryDocSnap = await getDoc(categoryDocRef);

      if (categoryDocSnap.exists()) {
        const categoryData = categoryDocSnap.data();
        const updatedQuestion = {
          question: editedQuestionData.question,
          options: editedQuestionData.options,
          correctAnswer: editedQuestionData.correctAnswer,
        };

        categoryData.tests[editingTestIndex].questions[editingQuestionIndex] = updatedQuestion;
        await updateDoc(categoryDocRef, { tests: categoryData.tests });
        
        fetchTests();
        setEditingTestIndex(null);
        setEditingQuestionIndex(null);
        setEditedQuestionData({ question: '', options: [], correctAnswer: '' });
      }
    } catch (error) {
      console.error('Savolni o\'zgartirishda xato:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-1">
          <Link 
            to="/admin" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors mb-4"
          >
            <BiLogOutCircle className="w-5 h-5 mr-2" />
            Ortga qaytish
          </Link>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Category Selector */}
          <div className="p-6 border-b border-gray-100">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Yo'nalishni tanlang</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          {/* Tests List */}
          <div className="p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Testlar ro'yxati</h2>
            <div className="space-y-6">
              {tests.map((test, testIndex) => (
                <div key={testIndex} className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{test.title}</h3>
                  {test.questions && test.questions.map((q, questionIndex) => (
                    <div 
                      key={questionIndex}
                      className="bg-white rounded-lg p-4 mb-4 shadow-sm"
                    >
                      {editingTestIndex === testIndex && editingQuestionIndex === questionIndex ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Savol nomi:
                            </label>
                            <input
                              type="text"
                              value={editedQuestionData.question}
                              onChange={(e) => handleFieldChange('question', e.target.value)}
                              className="w-full rounded-lg border-gray-300 shadow-md border p-[10px] focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Savol"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Variantlar:
                            </label>
                            <div className="space-y-2">
                              {editedQuestionData.options.map((option, optionIndex) => (
                                <input
                                  key={optionIndex}
                                  type="text"
                                  value={option}
                                  onChange={(e) => handleOptionChange(optionIndex, e.target.value)}
                                  className="w-full rounded-lg border-gray-300 shadow-md border p-[10px] focus:ring-blue-500 focus:border-blue-500"
                                  placeholder={`Variant ${optionIndex + 1}`}
                                />
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              To'g'ri javob:
                            </label>
                            <input
                              type="text"
                              value={editedQuestionData.correctAnswer}
                              onChange={(e) => handleFieldChange('correctAnswer', e.target.value)}
                              className="w-full rounded-lg border-gray-300 shadow-md border p-[10px] focus:ring-blue-500 focus:border-blue-500"
                              placeholder="To'g'ri javob"
                            />
                          </div>

                          <button
                            onClick={handleSaveClick}
                            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Saqlash
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="text-gray-900 font-medium">{q.question}</p>
                          <button
                            onClick={() => handleEditClick(testIndex, questionIndex, q)}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            O'zgartirish
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TestList;
