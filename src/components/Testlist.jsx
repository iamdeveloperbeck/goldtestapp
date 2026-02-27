import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../data/firebase';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { BiLogOutCircle } from 'react-icons/bi';
import { FaEdit, FaSave, FaSpinner, FaTimes, FaCheck, FaTrash, FaDownload } from 'react-icons/fa';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, TextRun } from 'docx';
import html2canvas from 'html2canvas';

function TestList() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [tests, setTests] = useState([]);
  const [editingTestIndex, setEditingTestIndex] = useState(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);
  const [editedQuestionData, setEditedQuestionData] = useState({ question: '', options: [], correctAnswer: '' });
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [testsLoading, setTestsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState({ show: false, testIndex: null, questionIndex: null });
  const [selectedQuestions, setSelectedQuestions] = useState([]);

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

  useEffect(() => {
    if (selectedCategory) {
      fetchTests();
    } else {
      setTests([]);
    }
  }, [selectedCategory]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      setError('');
      const querySnapshot = await getDocs(collection(db, 'categories'));
      const categoriesData = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setCategories(categoriesData);
    } catch (err) {
      console.error('Kategoriyalarni olishda xato:', err);
      setError('Kategoriyalarni yuklashda xato yuz berdi');
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // Fetch tests for selected category
  const fetchTests = useCallback(async () => {
    if (!selectedCategory) return;

    try {
      setTestsLoading(true);
      setError('');
      const categoryDocRef = doc(db, 'categories', selectedCategory);
      const categoryDocSnap = await getDoc(categoryDocRef);

      if (categoryDocSnap.exists()) {
        const categoryData = categoryDocSnap.data();
        console.log('Category Data:', categoryData);
        const testsData = (categoryData.tests || []).map((test, index) => {
          const firstQuestion = test.questions && test.questions.length > 0 ? test.questions[0].question : 'Savol mavjud emas';
          return {
            id: test.id ?? `test-${index}`,
            title: test.title || `Test ${index + 1}`,
            firstQuestion,
            questions: test.questions || [],
            testIndex: index
          };
        });
        setTests(testsData);
      } else {
        setError('Tanlangan kategoriya topilmadi');
        setTests([]);
      }
    } catch (err) {
      console.error('Testlarni olishda xato:', err);
      setError('Testlarni yuklashda xato yuz berdi');
    } finally {
      setTestsLoading(false);
    }
  }, [selectedCategory]);

  // Edit click
  const handleEditClick = useCallback((testIndex, questionIndex, questionData) => {
    setEditingTestIndex(testIndex);
    setEditingQuestionIndex(questionIndex);
    setEditedQuestionData({
      question: questionData?.question || '',
      options: questionData?.options?.length ? [...questionData.options] : ['', '', '', ''],
      correctAnswer: questionData?.correctAnswer || '',
    });
    setError('');
  }, []);

  const handleFieldChange = useCallback((field, value) => {
    setEditedQuestionData(prevData => ({
      ...prevData,
      [field]: value,
    }));
  }, []);

  const handleOptionChange = useCallback((optionIndex, value) => {
    setEditedQuestionData(prevData => {
      const newOptions = [...(prevData.options || [])];
      // ensure array length
      while (newOptions.length < 4) newOptions.push('');
      newOptions[optionIndex] = value;
      return {
        ...prevData,
        options: newOptions,
      };
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingTestIndex(null);
    setEditingQuestionIndex(null);
    setEditedQuestionData({ question: '', options: [], correctAnswer: '' });
    setError('');
  }, []);

  const handleDeleteQuestions = useCallback(async () => {
    try {
      setSaving(true);
      setError('');
      const categoryDocRef = doc(db, 'categories', selectedCategory);
      const categoryDocSnap = await getDoc(categoryDocRef);

      if (categoryDocSnap.exists()) {
        const categoryData = categoryDocSnap.data();

        if (!categoryData.tests) {
          setError('Test ma\'lumotlari topilmadi');
          return;
        }

        // If single deletion via deleteConfirmation (when testIndex & questionIndex provided)
        if (deleteConfirmation.testIndex !== null && deleteConfirmation.questionIndex !== null) {
          const { testIndex, questionIndex } = deleteConfirmation;
          if (!categoryData.tests[testIndex] || !categoryData.tests[testIndex].questions) {
            setError('Test ma\'lumotlari topilmadi');
            return;
          }
          // O'chirish
          categoryData.tests[testIndex].questions.splice(questionIndex, 1);
          
          // Agar questions bo'sh bo'lsa, testni ham o'chiramiz
          if (categoryData.tests[testIndex].questions.length === 0) {
            categoryData.tests.splice(testIndex, 1);
          }
        } 
        // If deleting multiple selected questions
        else if (selectedQuestions.length > 0) {
          // Sort in reverse to avoid index shifting
          const sortedSelections = [...selectedQuestions].sort((a, b) => {
            if (a.testIndex !== b.testIndex) return b.testIndex - a.testIndex;
            return b.questionIndex - a.questionIndex;
          });

          // Testlarni kuzatish uchun Set yaratamiz
          const affectedTests = new Set();

          for (const { testIndex, questionIndex } of sortedSelections) {
            if (categoryData.tests[testIndex] && categoryData.tests[testIndex].questions) {
              categoryData.tests[testIndex].questions.splice(questionIndex, 1);
              affectedTests.add(testIndex);
            }
          }

          // Bo'sh testlarni o'chiramiz (teskari tartibda)
          [...affectedTests].sort((a, b) => b - a).forEach(testIndex => {
            if (categoryData.tests[testIndex].questions.length === 0) {
              categoryData.tests.splice(testIndex, 1);
            }
          });
        } else {
          setError('O\'chiriladigan savol topilmadi');
          return;
        }

        await updateDoc(categoryDocRef, { tests: categoryData.tests });
        setSuccess(selectedQuestions.length > 1 
          ? 'Savollar muvaffaqiyatli o\'chirildi' 
          : 'Savol muvaffaqiyatli o\'chirildi'
        );
        await fetchTests();
      } else {
        setError('Kategoriya topilmadi');
      }
    } catch (err) {
      console.error('Savollarni o\'chirishda xato:', err);
      setError('Savollarni o\'chirishda xato yuz berdi');
    } finally {
      setSaving(false);
      setDeleteConfirmation({ show: false, testIndex: null, questionIndex: null });
      setSelectedQuestions([]);
    }
  }, [deleteConfirmation, selectedQuestions, selectedCategory, fetchTests]);

  const toggleQuestionSelection = useCallback((testIndex, questionIndex) => {
    setSelectedQuestions(prev => {
      const exists = prev.some(item => item.testIndex === testIndex && item.questionIndex === questionIndex);
      if (exists) {
        return prev.filter(item => !(item.testIndex === testIndex && item.questionIndex === questionIndex));
      } else {
        return [...prev, { testIndex, questionIndex }];
      }
    });
  }, []);

  const handleSaveClick = useCallback(async () => {
    // Validation
    if (!editedQuestionData.question.trim()) {
      setError('Savol matnini kiriting');
      return;
    }

    if (editedQuestionData.options.some(option => !option.trim())) {
      setError('Barcha variantlarni to\'ldiring');
      return;
    }

    if (!editedQuestionData.correctAnswer.trim()) {
      setError('To\'g\'ri javobni kiriting');
      return;
    }

    if (!editedQuestionData.options.includes(editedQuestionData.correctAnswer)) {
      setError('To\'g\'ri javob variantlar ichida bo\'lishi kerak');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const categoryDocRef = doc(db, 'categories', selectedCategory);
      const categoryDocSnap = await getDoc(categoryDocRef);

      if (categoryDocSnap.exists()) {
        const categoryData = categoryDocSnap.data();
        const updatedQuestion = {
          question: editedQuestionData.question.trim(),
          options: editedQuestionData.options.map(opt => opt.trim()),
          correctAnswer: editedQuestionData.correctAnswer.trim(),
          updatedAt: new Date().toISOString()
        };

        if (!categoryData.tests || !categoryData.tests[editingTestIndex] || !categoryData.tests[editingTestIndex].questions) {
          setError('Test ma\'lumotlari topilmadi');
          return;
        }

        categoryData.tests[editingTestIndex].questions[editingQuestionIndex] = updatedQuestion;
        await updateDoc(categoryDocRef, { tests: categoryData.tests });
        
        setSuccess('Savol muvaffaqiyatli yangilandi');
        await fetchTests();
        handleCancelEdit();
      } else {
        setError('Kategoriya topilmadi');
      }
    } catch (err) {
      console.error('Savolni o\'zgartirishda xato:', err);
      setError('Savolni saqlashda xato yuz berdi');
    } finally {
      setSaving(false);
    }
  }, [editedQuestionData, selectedCategory, editingTestIndex, editingQuestionIndex, fetchTests, handleCancelEdit]);

  // Memoized validation
  const isFormValid = useMemo(() => {
    return editedQuestionData.question.trim() &&
           (editedQuestionData.options || []).every(opt => opt.trim()) &&
           editedQuestionData.correctAnswer.trim() &&
           (editedQuestionData.options || []).includes(editedQuestionData.correctAnswer);
  }, [editedQuestionData]);

  const selectedCategoryName = useMemo(() => {
    const category = categories.find(cat => cat.id === selectedCategory);
    return category ? category.name : '';
  }, [categories, selectedCategory]);

  // Download tests as image (renders styled HTML to PNG)
  const downloadTestsAsImage = useCallback(async () => {
    if (!selectedCategory || tests.length === 0) {
      setError('Yuklab olish uchun testlar mavjud emas');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const totalQuestions = tests.reduce((acc, t) => acc + ((t.questions && t.questions.length) || 0), 0);

      // Build offscreen container
      const container = document.createElement('div');
      container.style.width = '800px';
      container.style.padding = '24px';
      container.style.background = '#ffffff';
      container.style.color = '#111827';
      container.style.fontFamily = 'Inter, UI-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
      container.style.boxSizing = 'border-box';
      container.style.lineHeight = '1.4';
      container.style.maxWidth = '900px';

      const header = document.createElement('h2');
      header.innerText = `${selectedCategoryName} - Testlar`;
      header.style.textAlign = 'center';
      header.style.margin = '0 0 8px';
      header.style.fontSize = '22px';
      header.style.fontWeight = '700';
      container.appendChild(header);

      const sub = document.createElement('p');
      sub.innerText = `Jami: ${totalQuestions} ta savol`;
      sub.style.textAlign = 'center';
      sub.style.margin = '0 0 16px';
      sub.style.color = '#4B5563';
      container.appendChild(sub);

      tests.forEach((test) => {
        const testTitle = document.createElement('div');
        testTitle.innerText = test.title || '';
        testTitle.style.fontWeight = '600';
        testTitle.style.margin = '12px 0 6px';
        testTitle.style.fontSize = '16px';
        container.appendChild(testTitle);

        (test.questions || []).forEach((q, qIndex) => {
          const qDiv = document.createElement('div');
          qDiv.style.border = '1px solid #E5E7EB';
          qDiv.style.borderRadius = '8px';
          qDiv.style.padding = '10px';
          qDiv.style.margin = '8px 0';

          const qText = document.createElement('div');
          qText.innerText = `${qIndex + 1}. ${q.question || ''}`;
          qText.style.fontSize = '14px';
          qText.style.marginBottom = '8px';
          qDiv.appendChild(qText);

          const opts = document.createElement('div');
          (q.options || []).forEach((opt, i) => {
            const optSpan = document.createElement('div');
            optSpan.innerText = `${String.fromCharCode(65 + i)}. ${opt}`;
            optSpan.style.padding = '6px 8px';
            optSpan.style.display = 'inline-block';
            optSpan.style.marginRight = '8px';
            optSpan.style.marginBottom = '6px';
            optSpan.style.borderRadius = '6px';
            optSpan.style.fontSize = '13px';
            if (opt === q.correctAnswer) {
              optSpan.style.background = '#ECFDF5';
              optSpan.style.color = '#065F46';
              optSpan.style.fontWeight = '600';
            } else {
              optSpan.style.background = '#F3F4F6';
              optSpan.style.color = '#374151';
            }
            opts.appendChild(optSpan);
          });
          qDiv.appendChild(opts);
          container.appendChild(qDiv);
        });
      });

      container.id = '__test_export_container';
      document.body.appendChild(container);

      // Render to canvas and download
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedCategoryName}_testlar_${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // cleanup
      const existing = document.getElementById('__test_export_container');
      if (existing) existing.remove();

      setSuccess('Testlar rasm sifatida yuklab olindi');
    } catch (err) {
      console.error('Image export error:', err);
      setError('Rasm yaratishda xato: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }, [tests, selectedCategory, selectedCategoryName]);

  // Download tests as Word file with plain/text layout (image-like text layout)
  const downloadTestsAsStyledWord = useCallback(async () => {
    if (!selectedCategory || tests.length === 0) {
      setError('Yuklab olish uchun testlar mavjud emas');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const children = [];

      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${selectedCategoryName} - Testlar`, bold: true, size: 32 })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }));

      const total = tests.reduce((acc, t) => acc + ((t.questions && t.questions.length) || 0), 0);
      children.push(new Paragraph({ text: `Jami: ${total} ta savol`, alignment: AlignmentType.CENTER, spacing: { after: 300 } }));

      let qIndexGlobal = 1;
      tests.forEach((test) => {
        if (test.title) {
          children.push(new Paragraph({ text: test.title, bold: true, spacing: { before: 200, after: 100 } }));
        }

        (test.questions || []).forEach((q) => {
          // Savol line
          children.push(new Paragraph({
            children: [
              new TextRun({ text: "Savol: ", bold: true }),
              new TextRun({ text: q.question || '' })
            ],
            spacing: { after: 100 }
          }));

          // Options
          (q.options || []).forEach((opt, oi) => {
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `${String.fromCharCode(65 + oi)}) `, bold: true }),
                new TextRun({ text: opt || '' })
              ],
              spacing: { after: 40 }
            }));
          });

          // Correct answer
          children.push(new Paragraph({
            children: [
              new TextRun({ text: "To'g'ri javob: ", bold: true }),
              new TextRun({ text: q.correctAnswer || '' })
            ],
            spacing: { after: 200 }
          }));

          qIndexGlobal++;
        });
      });

      const doc = new Document({ sections: [{ children }] });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedCategoryName}_testlar_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess('Testlar muvaffaqiyatli yuklab olindi (Word - matn ko\'rinishi)');
    } catch (err) {
      console.error('Word fayl yaratishda xato:', err);
      setError('Word fayl yaratishda xato yuz berdi: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }, [tests, selectedCategory, selectedCategoryName]);

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
          {/* Header */}
          <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-600 to-indigo-600">
            <h1 className="text-2xl font-bold text-white">Testlar ro'yxati va tahrirlash</h1>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <FaTimes className="text-red-500 mr-2" />
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}
          {success && (
            <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <FaCheck className="text-green-500 mr-2" />
                <p className="text-green-600 text-sm font-medium">{success}</p>
              </div>
            </div>
          )}

          {/* Category Selector */}
          <div className="p-6 border-b border-gray-100">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Yo'nalishni tanlang:
              </label>
              {categoriesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <FaSpinner className="animate-spin text-blue-600 mr-2" />
                  <span className="text-gray-600">Kategoriyalar yuklanmoqda...</span>
                </div>
              ) : (
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
              )}
            </div>
          </div>

          {/* Tests List */}
          <div className="p-6">
            {selectedCategory && (
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedCategoryName} - Testlar ro'yxati
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">
                    Jami {tests.length} ta test mavjud
                  </p>
                </div>
                {tests.length > 0 && (
                  <button
                      onClick={downloadTestsAsStyledWord}
                      disabled={loading}
                      className="inline-flex items-center px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 rounded-lg hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {loading ? (
                        <>
                          <FaSpinner className="animate-spin mr-2" />
                          Yuklanmoqda...
                        </>
                      ) : (
                        <>
                          <FaDownload className="mr-2" />
                          Word yuklab olish
                        </>
                      )}
                    </button>
                )}
              </div>
            )}

            {testsLoading ? (
              <div className="flex items-center justify-center py-12">
                <FaSpinner className="animate-spin text-blue-600 text-2xl mr-3" />
                <span className="text-gray-600 text-lg">Testlar yuklanmoqda...</span>
              </div>
            ) : !selectedCategory ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Testlarni ko'rish uchun yo'nalishni tanlang</p>
              </div>
            ) : tests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Bu yo'nalishda hozircha testlar mavjud emas</p>
              </div>
            ) : (
              <div className="space-y-6">
                {tests.map((test, testIndex) => (
                  <div key={test.id ?? `test-${testIndex}`} className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{test.title}</h3>
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        {test.questions?.length || 0} savol
                      </span>
                    </div>

                    {test.questions && test.questions.map((q, questionIndex) => (
                      <div 
                        key={`${test.testIndex ?? testIndex}-${questionIndex}`}
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
                                className={`w-full rounded-lg shadow-md p-[10px] focus:ring-2 ${
                                  !editedQuestionData.question.trim() 
                                    ? 'border border-gray-300 focus:border-blue-500 focus:ring-blue-500' 
                                    : 'border border-green-300 focus:border-green-500 focus:ring-green-500'
                                }`}
                                placeholder="Savol"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Variantlar:
                              </label>
                              <div className="space-y-2">
                                {(editedQuestionData.options || []).map((option, optionIndex) => (
                                  <input
                                    key={optionIndex}
                                    type="text"
                                    value={option}
                                    onChange={(e) => handleOptionChange(optionIndex, e.target.value)}
                                    className={`w-full rounded-lg shadow-md p-[10px] focus:ring-2 ${
                                      !option.trim() 
                                        ? 'border border-gray-300 focus:border-blue-500 focus:ring-blue-500' 
                                        : 'border border-green-300 focus:border-green-500 focus:ring-green-500'
                                    }`}
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
                                className={`w-full rounded-lg shadow-md p-[10px] focus:ring-2 ${
                                  !editedQuestionData.correctAnswer.trim() 
                                    ? 'border border-gray-300 focus:border-blue-500 focus:ring-blue-500' 
                                    : editedQuestionData.options.includes(editedQuestionData.correctAnswer)
                                      ? 'border border-green-300 focus:border-green-500 focus:ring-green-500'
                                      : 'border border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500'
                                }`}
                                placeholder="To'g'ri javob"
                              />
                              {editedQuestionData.correctAnswer.trim() && !editedQuestionData.options.includes(editedQuestionData.correctAnswer) && (
                                <p className="text-yellow-600 text-xs mt-1">
                                  To'g'ri javob yuqoridagi variantlar ichida bo'lishi kerak
                                </p>
                              )}
                            </div>

                            {/* Form validation status */}
                            <div className="bg-gray-50 p-3 rounded-lg border">
                              <h4 className="font-medium text-gray-900 mb-2 text-sm">Tahrirlash holati:</h4>
                              <div className="space-y-1">
                                <div className={`flex items-center gap-2 text-xs ${editedQuestionData.question.trim() ? 'text-green-600' : 'text-gray-500'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${editedQuestionData.question.trim() ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                  Savol kiritildi
                                </div>
                                <div className={`flex items-center gap-2 text-xs ${(editedQuestionData.options || []).every(opt => opt.trim()) ? 'text-green-600' : 'text-gray-500'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${(editedQuestionData.options || []).every(opt => opt.trim()) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                  Barcha variantlar to'ldirildi
                                </div>
                                <div className={`flex items-center gap-2 text-xs ${isFormValid ? 'text-green-600' : 'text-gray-500'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isFormValid ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                  To'g'ri javob belgilandi
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-3">
                              <button
                                onClick={handleSaveClick}
                                disabled={!isFormValid || saving}
                                className="flex-1 inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {saving ? <FaSpinner className="animate-spin mr-2" /> : <FaSave className="mr-2" />}
                                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={saving}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                              >
                                <FaTimes className="mr-2" />
                                Bekor qilish
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {/* Multiple Selection Toolbar */}
                            {selectedQuestions.length > 0 && (
                              <div className="bg-blue-50 p-3 rounded-lg mb-4 flex items-center justify-between">
                                <div className="flex items-center">
                                  <span className="text-blue-700 font-medium">{selectedQuestions.length} ta savol tanlandi</span>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setSelectedQuestions([])}
                                    className="px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100 rounded-lg"
                                  >
                                    Bekor qilish
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmation({ show: true })}
                                    className="px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg"
                                  >
                                    Tanlanganlarni o'chirish
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <div className="flex-1 flex items-start gap-3">
                                <div className="pt-1">
                                  <input
                                    type="checkbox"
                                    checked={selectedQuestions.some(item => item.testIndex === testIndex && item.questionIndex === questionIndex)}
                                    onChange={() => toggleQuestionSelection(testIndex, questionIndex)}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                  />
                                </div>
                                <div className="flex-1">
                                  <p className="text-gray-900 font-medium mb-1">{q.question}</p>
                                  <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                                    {(q.options || []).map((option, idx) => (
                                      <span 
                                        key={idx}
                                        className={`px-2 py-1 rounded ${
                                          option === q.correctAnswer 
                                            ? 'bg-green-100 text-green-800 font-medium' 
                                            : 'bg-gray-100 text-gray-600'
                                        }`}
                                      >
                                        {idx + 1}. {option}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => handleEditClick(testIndex, questionIndex, q)}
                                  disabled={ (editingTestIndex !== null && editingTestIndex !== testIndex) || saving || selectedQuestions.length > 0 }
                                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <FaEdit className="mr-2" />
                                  O'zgartirish
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmation({ show: true, testIndex, questionIndex })}
                                  disabled={ (editingTestIndex !== null && editingTestIndex !== testIndex) || saving || selectedQuestions.length > 0 }
                                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <FaTrash className="mr-2" />
                                  O'chirish
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delete Confirmation Modal */}
          {deleteConfirmation.show && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 max-w-sm w-full">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {selectedQuestions.length > 1 
                    ? 'Savollarni o\'chirish' 
                    : 'Savolni o\'chirish'
                  }
                </h3>
                <p className="text-gray-600 mb-6">
                  {selectedQuestions.length > 1 
                    ? `${selectedQuestions.length} ta savolni o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.`
                    : 'Ushbu savolni o\'chirishni xohlaysizmi? Bu amalni qaytarib bo\'lmaydi.'
                  }
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteQuestions}
                    disabled={saving}
                    className="flex-1 inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {saving ? <FaSpinner className="animate-spin mr-2" /> : <FaTrash className="mr-2" />}
                    {saving ? 'O\'chirilmoqda...' : 'O\'chirish'}
                  </button>
                  <button
                    onClick={() => setDeleteConfirmation({ show: false, testIndex: null, questionIndex: null })}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                  >
                    Bekor qilish
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TestList;