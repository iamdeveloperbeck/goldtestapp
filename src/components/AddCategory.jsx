import React, { useState, useEffect } from 'react';
import { db } from '../data/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import AddQuestions from './AddQuestions';

import { BiLogOutCircle } from "react-icons/bi";

function AddCategory() {
  const [categoryName, setCategoryName] = useState('');
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const querySnapshot = await getDocs(collection(db, 'categories'));
    const categoriesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCategories(categoriesData);
  };

  const addCategory = async () => {
    try {
      const newCategory = { name: categoryName, tests: [] };
      await addDoc(collection(db, 'categories'), newCategory);
      setCategoryName('');
    } catch (error) {
      console.error('Kategoriya qo\'shishda xato:', error);
    }
  };

  return (
    <div className='p-[20px]'>
        <Link to='/admin' className='flex items-center gap-1 text-blue-600 font-medium mb-2 w-fit'><BiLogOutCircle /> Ortga qaytish</Link>
        <h2 className='mb-6 text-3xl font-extrabold text-gray-900'>Yo'nalishlar va savollar qo'shish</h2>
        <div className='flex gap-8 items-start'>
            <div className='flex justify-start items-end gap-2'>
                <div>
                    <label className='block text-sm font-medium text-gray-900'>Yo'nalish qo'shish:</label>
                    <input
                        type='text'
                        placeholder="Yo'nalish nomi"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        className='w-[250px] bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5'
                    />
                </div>
                <button onClick={addCategory} className='text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center'>Qo'shish</button>
            </div>
            <div className=''>
                <h2 className='block text-sm font-medium text-gray-900 mb-[3px]'>Mavjud yo'nalishlar ro'yxati:</h2>
                <ul className='flex gap-2'>
                    {categories.map(category => (
                        <li key={category.id} className='border p-2 mb-2 block text-sm font-medium text-gray-900'>
                            {category.name}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
        <div className='w-full h-[2px] bg-gray-300 m-[20px_0]'></div>
        <AddQuestions />
    </div>
  );
}

export default AddCategory;