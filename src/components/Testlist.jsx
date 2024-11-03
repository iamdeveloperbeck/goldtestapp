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
    <div className='p-[20px]'>
        <Link to='/admin' className='flex items-center gap-1 text-blue-600 font-medium mb-2 w-fit'><BiLogOutCircle /> Ortga qaytish</Link>
      <h2 className='mb-4 text-3xl font-extrabold leading-none tracking-tight text-gray-900'>Yo'nalishlar</h2>
      <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5'>
        <option value=''>Yo'nalishni tanlang</option>
        {categories.map(category => (
          <option key={category.id} value={category.id}>{category.name}</option>
        ))}
      </select>
        <div className='w-full h-[2px] bg-gray-300 m-[20px_0]'></div>
      <h3 className='mb-4 text-3xl font-extrabold leading-none tracking-tight text-gray-900'>Testlar ro'yxati</h3>
      <ul>
        {tests.map((test, testIndex) => (
          <li key={testIndex} className='mb-4'>
            <div className='font-semibold italic'>{test.title}</div>
            {test.questions && test.questions.map((q, questionIndex) => (
              <div key={questionIndex} className='ml-4'>
                {editingTestIndex === testIndex && editingQuestionIndex === questionIndex ? (
                  <div>
                    <label className='block text-sm font-medium text-gray-900'>Savol nomi:</label>
                    <input
                      type='text'
                      value={editedQuestionData.question}
                      onChange={(e) => handleFieldChange('question', e.target.value)}
                      placeholder="Savol"
                      className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5'
                    />
                    <label className='block text-sm font-medium text-gray-900'>Variantlar:</label>
                    {editedQuestionData.options.map((option, optionIndex) => (
                      <input
                        key={optionIndex}
                        type='text'
                        value={option}
                        onChange={(e) => handleOptionChange(optionIndex, e.target.value)}
                        placeholder={`Variant ${optionIndex + 1}`}
                        className='bg-gray-50 border border-gray-300 mb-2 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5'
                      />
                    ))}
                    <label className='block text-sm font-medium text-gray-900'>To'g'ri javob nomi:</label>
                    <input
                      type='text'
                      value={editedQuestionData.correctAnswer}
                      onChange={(e) => handleFieldChange('correctAnswer', e.target.value)}
                      placeholder="To'g'ri javob"
                      className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5'
                    />
                    <button onClick={handleSaveClick} className='text-white mt-2 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm sm:w-auto px-5 py-2.5 text-center'>Saqlash</button>
                  </div>
                ) : (
                  <>
                    <div className='flex items-center gap-2'>
                        <span className='text-1xl font-bold leading-none tracking-tight text-gray-900 md:text-5xl lg:text-6xl'>{q.question}</span>
                        <button onClick={() => handleEditClick(testIndex, questionIndex, q)} className='relative inline-flex items-center justify-center p-0.5 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-cyan-500 to-blue-500 group-hover:from-cyan-500 group-hover:to-blue-500 hover:text-white'>
                            <span className='relative px-5 py-2.5 transition-all ease-in duration-75 bg-white rounded-md group-hover:bg-opacity-0'>O'zgartirish</span>
                        </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TestList;