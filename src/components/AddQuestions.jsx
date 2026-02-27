import React, { useState, useEffect } from 'react';
import { db } from '../data/firebase';
import { doc, updateDoc, arrayUnion, getDoc, collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function AddQuestions() {
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
        setTestNumber(tests.length);
      }
    } catch (error) {
      console.error('Testlarni olishda xato:', error);
    }
  };

  const handleCategoryChange = (event) => {
    setSelectedCategory(event.target.value);
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
    <div className='mb-4'>
        <h3 className='block text-2xl font-medium text-gray-900'>Savol qo'shish:</h3>
        <div>
            <div className='m-[10px_0]'>
                <label className='block text-sm font-medium text-gray-700'>Yo'nalishni tanlang:</label>
                <select value={selectedCategory} onChange={handleCategoryChange} className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5'>
                    <option value=''>Tanlang</option>
                    {categories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                </select>
            </div>
            <div className='flex flex-col gap-2 mb-2'>
                <input
                    type='text'
                    placeholder='Savol'
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5'
                />
                {options.map((option, index) => (
                    <input
            key={index}
            type='text'
            placeholder={`Variant ${index + 1}`}
            value={option}
            onChange={e => {
              // Faqat foydalanuvchi kiritgan qiymatni saqlash, raqam yoki prefix qo'shmaymiz
              const newOptions = [...options];
              newOptions[index] = e.target.value;
              setOptions(newOptions);
            }}
            className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5'
          />
                ))}
                <input
                    type='text'
                    placeholder="To'g'ri javob"
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5'
                />
            </div>
            <button onClick={addQuestion} className='text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm sm:w-auto px-5 py-2.5 text-center'>Qo'shish</button>
        </div>
    </div>
  );
}

export default AddQuestions;