// src/components/DeleteTests.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../data/firebase'; // loyihangizdagi firebase konfig fayliga mos yo'l
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { BiLogOutCircle } from 'react-icons/bi';
import { FaTrash, FaSpinner, FaTimes, FaCheck } from 'react-icons/fa';

function DeleteTests() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [tests, setTests] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingTests, setLoadingTests] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState([]); // [{ testIndex, questionIndex }]
  const [deleteModal, setDeleteModal] = useState({ open: false, mode: null, testIndex: null, questionIndex: null });
  // mode: 'single' | 'bulk'

  // Clear messages after 3s
  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => { setError(''); setSuccess(''); }, 3000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  useEffect(() => { fetchCategories(); }, []);

  useEffect(() => {
    if (selectedCategory) fetchTests();
    else setTests([]);
  }, [selectedCategory]);

  const fetchCategories = useCallback(async () => {
    try {
      setLoadingCats(true);
      const snap = await getDocs(collection(db, 'categories'));
      const cats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCategories(cats);
    } catch (err) {
      console.error('fetchCategories error', err);
      setError('Kategoriyalarni olishda xato');
    } finally {
      setLoadingCats(false);
    }
  }, []);

  const fetchTests = useCallback(async () => {
    if (!selectedCategory) return;
    try {
      setLoadingTests(true);
      const ref = doc(db, 'categories', selectedCategory);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setError('Kategoriya topilmadi');
        setTests([]);
        return;
      }
      const data = snap.data();
      const t = (data.tests || []).map((test, i) => ({
        id: test.id ?? `test-${i}`,
        title: test.title ?? `Test ${i + 1}`,
        questions: test.questions ?? [],
      }));
      setTests(t);
    } catch (err) {
      console.error('fetchTests error', err);
      setError('Testlarni yuklashda xato');
    } finally {
      setLoadingTests(false);
    }
  }, [selectedCategory]);

  const toggleSelect = (testIndex, questionIndex) => {
    setSelectedQuestions(prev => {
      const exists = prev.some(p => p.testIndex === testIndex && p.questionIndex === questionIndex);
      if (exists) return prev.filter(p => !(p.testIndex === testIndex && p.questionIndex === questionIndex));
      return [...prev, { testIndex, questionIndex }];
    });
  };

  const confirmSingleDelete = (testIndex, questionIndex) => {
    setDeleteModal({ open: true, mode: 'single', testIndex, questionIndex });
  };

  const confirmBulkDelete = () => {
    if (selectedQuestions.length === 0) {
      setError('Avval savollarni belgilang');
      return;
    }
    setDeleteModal({ open: true, mode: 'bulk' });
  };

  const performDelete = async () => {
    try {
      setSaving(true);
      setError('');

      if (!selectedCategory) { setError('Kategoriya tanlanmagan'); return; }
      const ref = doc(db, 'categories', selectedCategory);
      const snap = await getDoc(ref);
      if (!snap.exists()) { setError('Kategoriya topilmadi'); return; }
      const data = snap.data();
      if (!Array.isArray(data.tests)) { setError('Testlar topilmadi'); return; }

      const newTests = JSON.parse(JSON.stringify(data.tests));

      if (deleteModal.mode === 'single') {
        const ti = deleteModal.testIndex;
        const qi = deleteModal.questionIndex;
        if (!newTests[ti] || !Array.isArray(newTests[ti].questions) || newTests[ti].questions[qi] === undefined) {
          setError('O\'chiriladigan savol topilmadi');
          return;
        }
        newTests[ti].questions.splice(qi, 1);
        await updateDoc(ref, { tests: newTests });
        setSuccess('Savol o\'chirildi');
      } else if (deleteModal.mode === 'bulk') {
        const sorted = [...selectedQuestions].sort((a, b) => {
          if (a.testIndex !== b.testIndex) return b.testIndex - a.testIndex;
          return b.questionIndex - a.questionIndex;
        });
        let deleted = 0;
        for (const s of sorted) {
          if (newTests[s.testIndex] && Array.isArray(newTests[s.testIndex].questions) && newTests[s.testIndex].questions[s.questionIndex] !== undefined) {
            newTests[s.testIndex].questions.splice(s.questionIndex, 1);
            deleted++;
          }
        }
        if (deleted === 0) { setError('Tanlangan savollar topilmadi'); return; }
        await updateDoc(ref, { tests: newTests });
        setSuccess(`${deleted} ta savol o'chirildi`);
      } else {
        setError('Noto\'g\'ri amal');
        return;
      }

      await fetchTests();
      setSelectedQuestions([]);
      setDeleteModal({ open: false, mode: null, testIndex: null, questionIndex: null });
    } catch (err) {
      console.error('performDelete err', err);
      setError('O\'chirishda xato yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 cursor-pointer text-blue-600" onClick={() => window.history.back()}>
            <BiLogOutCircle />
            Ortga
          </div>
          <h2 className="text-xl font-semibold">Savollarni o'chirish</h2>
        </div>

        {error && <div className="mb-3 p-3 bg-red-50 text-red-700 rounded flex items-center"><FaTimes className="mr-2" />{error}</div>}
        {success && <div className="mb-3 p-3 bg-green-50 text-green-700 rounded flex items-center"><FaCheck className="mr-2" />{success}</div>}

        <div className="mb-4">
          {loadingCats ? (
            <div className="flex items-center gap-2"><FaSpinner className="animate-spin" /> Kategoriyalar yuklanmoqda...</div>
          ) : (
            <select
              className="w-full border rounded px-3 py-2"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">— Yo'nalishni tanlang —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        {selectedQuestions.length > 0 && (
          <div className="mb-4 flex items-center justify-between bg-blue-50 p-3 rounded">
            <div>{selectedQuestions.length} ta savol tanlandi</div>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setSelectedQuestions([])} disabled={saving}>Bekor qilish</button>
              <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={confirmBulkDelete} disabled={saving}>Tanlanganlarni o'chirish</button>
            </div>
          </div>
        )}

        <div>
          {loadingTests ? (
            <div className="py-10 text-center"><FaSpinner className="animate-spin mr-2 inline" /> Yuklanmoqda...</div>
          ) : !selectedCategory ? (
            <div className="py-10 text-center text-gray-500">Kategoriya tanlang</div>
          ) : tests.length === 0 ? (
            <div className="py-10 text-center text-gray-500">Bu yo'nalishda testlar yo'q</div>
          ) : (
            tests.map((test, testIndex) => (
              <div key={test.id || testIndex} className="mb-6 border rounded p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-medium">{test.title}</div>
                    <div className="text-sm text-gray-500">{(test.questions || []).length} savol</div>
                  </div>
                </div>

                {(test.questions || []).map((q, questionIndex) => (
                  <div key={`${testIndex}-${questionIndex}`} className="flex items-start justify-between gap-4 p-3 mb-2 bg-gray-50 rounded">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.some(s => s.testIndex === testIndex && s.questionIndex === questionIndex)}
                        onChange={() => toggleSelect(testIndex, questionIndex)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium">{q.question}</div>
                        <div className="text-sm text-gray-600 mt-1">{(q.options || []).map((opt, i) => <span key={i} className="inline-block mr-2">{i+1}. {opt}</span>)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50"
                        onClick={() => confirmSingleDelete(testIndex, questionIndex)}
                        disabled={saving}
                      >
                        <FaTrash className="inline mr-1" />O'chirish
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Confirmation modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4">
          <div className="bg-white rounded p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-3">{deleteModal.mode === 'single' ? "Savolni o'chirish" : "Tanlangan savollarni o'chirish"}</h3>
            <p className="mb-4 text-gray-600">
              {deleteModal.mode === 'single'
                ? "Ushbu savolni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi."
                : `Tanlangan ${selectedQuestions.length} ta savolni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`}
            </p>

            <div className="flex gap-3">
              <button className="flex-1 px-4 py-2 bg-red-600 text-white rounded" onClick={performDelete} disabled={saving}>
                {saving ? <><FaSpinner className="animate-spin inline mr-2" />O'chirilmoqda...</> : 'O\'chirish'}
              </button>
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setDeleteModal({ open: false, mode: null })} disabled={saving}>Bekor qilish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeleteTests;