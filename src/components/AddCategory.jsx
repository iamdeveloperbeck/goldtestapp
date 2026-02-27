import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { db } from "../data/firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
} from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { BiLogOutCircle, BiHelpCircle } from "react-icons/bi";
import {
  FaClipboardList,
  FaEdit,
  FaSpinner,
  FaUpload,
  FaFileWord,
  FaFileCode,
  FaCheck,
} from "react-icons/fa";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import mammoth from "mammoth";

function AddCategoryAndQuestions() {
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState("entrance");
  const [categories, setCategories] = useState([]);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState("entrance");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [testNumber, setTestNumber] = useState(0);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileInfo, setFileInfo] = useState(null);
  const wordFileInputRef = useRef(null);
  const jsonFileInputRef = useRef(null);
  const navigate = useNavigate();

  const wordInstructions = [
    "1. .docx formatidagi fayl tayyorlang",
    "2. Har bir test quyidagi formatda bo'lishi kerak:",
    "   Savol: [Savol matni]",
    "   A) [1-variant]",
    "   B) [2-variant]",
    "   C) [3-variant]",
    "   D) [4-variant]",
    "   To'g'ri javob: [A/B/C/D]",
    "3. Har bir test orasida bo'sh qator qoldiring",
  ];

  const jsonInstructions = [
    "1. JSON fayl quyidagi formatda bo'lishi kerak:",
    "{",
    '  "tests": [',
    "    {",
    '      "question": "Savol matni",',
    '      "options": ["1-variant", "2-variant", "3-variant", "4-variant"],',
    '      "correctAnswer": "To\'g\'ri javob"',
    "    }",
    "  ]",
    "}",
  ];

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchTestCount();
    }
  }, [selectedCategory]);

  const fetchCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      setError("");
      const querySnapshot = await getDocs(collection(db, "categories"));
      const categoriesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCategories(categoriesData);
    } catch (error) {
      console.error("Kategoriyalarni olishda xato:", error);
      setError("Kategoriyalarni yuklashda xato yuz berdi");
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const handleEditClick = useCallback((category) => {
    setEditingCategory(category.id);
    setNewCategoryName(category.name);
    setError("");
  }, []);

  const handleSave = useCallback(
    async (categoryId) => {
      if (!newCategoryName.trim()) {
        setError("Kategoriya nomi bo'sh bo'lishi mumkin emas");
        return;
      }

      try {
        setLoading(true);
        setError("");
        const categoryRef = doc(db, "categories", categoryId);
        await updateDoc(categoryRef, { name: newCategoryName.trim() });
        setEditingCategory(null);
        setSuccess("Kategoriya muvaffaqiyatli yangilandi");
        await fetchCategories();
      } catch (error) {
        console.error("Kategoriyani yangilashda xato:", error);
        setError("Kategoriyani yangilashda xato yuz berdi");
      } finally {
        setLoading(false);
      }
    },
    [newCategoryName, fetchCategories]
  );

  const fetchTestCount = useCallback(async () => {
    try {
      setError("");
      const categoryRef = doc(db, "categories", selectedCategory);
      const categoryDoc = await getDoc(categoryRef);
      if (categoryDoc.exists()) {
        const tests = categoryDoc.data().tests || [];
        setTestNumber(tests.length + 1);
      } else {
        setError("Tanlangan kategoriya topilmadi");
      }
    } catch (error) {
      console.error("Testlarni olishda xato:", error);
      setError("Testlarni yuklashda xato yuz berdi");
    }
  }, [selectedCategory]);

  const addCategory = useCallback(async () => {
    if (!categoryName.trim()) {
      setError("Kategoriya nomi bo'sh bo'lishi mumkin emas");
      return;
    }

    const existingCategory = categories.find(
      (cat) =>
        cat.name.toLowerCase() === categoryName.trim().toLowerCase() &&
        cat.type === categoryType
    );
    if (existingCategory) {
      setError(
        `Bu nomda ${
          categoryType === "entrance" ? "kirish" : "chiqish"
        } kategoriyasi allaqachon mavjud`
      );
      return;
    }

    try {
      setLoading(true);
      setError("");
      const newCategory = {
        name: categoryName.trim(),
        type: categoryType,
        tests: [],
        maxQuestions: categoryType === "entrance" ? 100 : 200,
        questionsPerTest: categoryType === "entrance" ? 30 : 50,
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, "categories"), newCategory);
      setCategoryName("");
      setSuccess("Kategoriya muvaffaqiyatli qo'shildi");
      await fetchCategories();
    } catch (error) {
      console.error("Kategoriya qo'shishda xato:", error);
      setError("Kategoriya qo'shishda xato yuz berdi");
    } finally {
      setLoading(false);
    }
  }, [categoryName, categories, fetchCategories]);

  const addQuestion = useCallback(async () => {
    if (!selectedCategory) {
      setError("Kategoriya tanlanmadi");
      return;
    }

    if (!question.trim()) {
      setError("Savol matnini kiriting");
      return;
    }

    if (options.some((option) => !option.trim())) {
      setError("Barcha variantlarni to'ldiring");
      return;
    }

    if (!correctAnswer.trim()) {
      setError("To'g'ri javobni kiriting");
      return;
    }

    if (!options.includes(correctAnswer)) {
      setError("To'g'ri javob variantlar ichida bo'lishi kerak");
      return;
    }

    const newQuestion = {
      question: question.trim(),
      options: options.map((opt) => opt.trim()),
      correctAnswer: correctAnswer.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      setLoading(true);
      setError("");
      const categoryRef = doc(db, "categories", selectedCategory);
      await updateDoc(categoryRef, {
        tests: arrayUnion({
          title: `Test ${testNumber}`,
          questions: [newQuestion],
          createdAt: new Date().toISOString(),
        }),
      });

      setQuestion("");
      setOptions(["", "", "", ""]);
      setCorrectAnswer("");
      setTestNumber(testNumber + 1);
      setSuccess("Savol muvaffaqiyatli qo'shildi");
    } catch (error) {
      console.error("Savol qo'shishda xato:", error);
      setError("Savol qo'shishda xato yuz berdi");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, question, options, correctAnswer, testNumber]);

  const updateOption = useCallback(
    (index, value) => {
      let cleaned = value.replace(/^\s*\d+[\.|\-|\)|\s]+/, "");
      const newOptions = [...options];
      newOptions[index] = cleaned;
      setOptions(newOptions);
    },
    [options]
  );

  const isFormValid = useMemo(() => {
    return (
      question.trim() &&
      options.every((opt) => opt.trim()) &&
      correctAnswer.trim() &&
      selectedCategory
    );
  }, [question, options, correctAnswer, selectedCategory]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = useCallback(async (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    await handleFile(file, type, selectedCategory);
  }, [selectedCategory]);

  const handleFileInput = useCallback(async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    await handleFile(file, type, selectedCategory);
  }, [selectedCategory]);

  const resetFileUpload = useCallback(() => {
    setUploadStatus("");
    setUploadProgress(0);
    setFileInfo(null);
    if (wordFileInputRef.current) wordFileInputRef.current.value = "";
    if (jsonFileInputRef.current) jsonFileInputRef.current.value = "";
  }, []);

  const handleFile = useCallback(async (file, type, category) => {
    setLoading(true);
    setError("");

    try {
      if (!category) {
        throw new Error("Iltimos, avval kategoriyani tanlang");
      }

      setUploadStatus("preparing");
      setUploadProgress(0);

      setFileInfo({
        name: file.name,
        size: (file.size / 1024).toFixed(2) + " KB",
        type: file.type,
      });

      const fileExtension = file.name.split(".").pop().toLowerCase();
      setUploadStatus("checking");
      setUploadProgress(10);

      if (type === "word" && fileExtension !== "docx") {
        throw new Error("Iltimos, faqat .docx formatidagi faylni yuklang");
      }

      if (type === "json" && fileExtension !== "json") {
        throw new Error("Iltimos, faqat .json formatidagi faylni yuklang");
      }

      setUploadProgress(20);
      setUploadStatus("reading");

      let tests = [];

      if (fileExtension === "json") {
        const fileContent = await file.text();
        try {
          const jsonData = JSON.parse(fileContent);
          if (!jsonData.tests || !Array.isArray(jsonData.tests)) {
            throw new Error(
              "Noto'g'ri JSON format. Fayl tarkibi namuna formatiga mos kelishi kerak"
            );
          }
          tests = jsonData.tests;
        } catch (err) {
          throw new Error(
            "JSON faylni tahlil qilishda xatolik: " + err.message
          );
        }
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const text = await convertWordToText(arrayBuffer);
        tests = parseWordDocument(text);
      }

      if (!Array.isArray(tests) || tests.length === 0) {
        throw new Error("Faylda to'g'ri formatda testlar topilmadi");
      }

      setUploadProgress(70);
      setUploadStatus("validating");

      const validTests = tests.filter(test => 
        test.question && 
        Array.isArray(test.options) && 
        test.options.length >= 2 && 
        test.correctAnswer
      );

      if (validTests.length === 0) {
        throw new Error("Hech qanday to'g'ri test topilmadi. Iltimos fayl formatini tekshiring");
      }

      setUploadProgress(80);
      setUploadStatus("saving");

      await saveTests(validTests, category);

      setUploadProgress(100);
      setUploadStatus("completed");
      setSuccess(`${validTests.length} ta test muvaffaqiyatli yuklandi`);
      setFileInfo((prev) => ({ ...prev, testsCount: validTests.length }));

      setTimeout(() => {
        resetFileUpload();
      }, 3000);
    } catch (error) {
      console.error("File upload error:", error);
      setError(error.message || "Faylni yuklashda xatolik yuz berdi");
      setUploadStatus("error");
      resetFileUpload();
    } finally {
      setLoading(false);
    }
  }, []);

  const convertWordToText = async (arrayBuffer) => {
    try {
      const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
      return result.value;
    } catch (error) {
      throw new Error("Word faylni o'qishda xatolik: " + error.message);
    }
  };

  const parseWordDocument = (text) => {
    try {
      const tests = [];
      const lines = text.split(/\r?\n/);
      let currentTest = null;

      const questionRegex = /^\s*(?:Savol|Savol)\s*:?\s*(.+)$/i;
      const optionLineRegex = /^\s*([A-D])\s*[\)\.\-:]\s*(.+)$/i;
      const answerRegex = /^\s*(?:To'g'ri\s+javob|Togri\s+javob|To g ri javob)\s*:?\s*(.+)$/i;

      const pushIfValid = (t) => {
        if (t && t.question && Array.isArray(t.options) && t.options.length >= 2 && t.correctAnswer) {
          const filteredOptions = t.options.filter(opt => opt && opt.trim());
          if (filteredOptions.length >= 2) {
            tests.push({
              question: t.question,
              options: filteredOptions,
              correctAnswer: t.correctAnswer,
            });
          }
        }
      };

      for (let rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        const qMatch = line.match(questionRegex);
        if (qMatch) {
          if (currentTest) pushIfValid(currentTest);
          currentTest = { question: qMatch[1].trim(), options: [], correctAnswer: '' };
          continue;
        }

        if (currentTest) {
          const oMatch = line.match(optionLineRegex);
          if (oMatch) {
            const letter = oMatch[1].toUpperCase();
            const txt = oMatch[2].trim();
            const idx = 'ABCD'.indexOf(letter);
            while (currentTest.options.length <= idx) currentTest.options.push('');
            currentTest.options[idx] = txt;
            continue;
          }

          const aMatch = line.match(answerRegex);
          if (aMatch) {
            const answerText = aMatch[1].trim();
            const letterOnly = answerText.match(/^([A-D])$/i);
            if (letterOnly) {
              const letter = letterOnly[1].toUpperCase();
              const idx = 'ABCD'.indexOf(letter);
              if (idx !== -1 && currentTest.options[idx]) {
                currentTest.correctAnswer = currentTest.options[idx];
              }
            } else {
              currentTest.correctAnswer = answerText;
            }
            continue;
          }
        }
      }

      if (currentTest) pushIfValid(currentTest);

      if (tests.length === 0) {
        throw new Error("Faylda to'g'ri formatda testlar topilmadi");
      }

      return tests;
    } catch (error) {
      throw new Error("Word faylni tahlil qilishda xatolik: " + error.message);
    }
  };

  const saveTests = async (tests, category) => {
    try {
      const categoryRef = doc(db, "categories", category);
      const categoryDoc = await getDoc(categoryRef);

      if (!categoryDoc.exists()) {
        throw new Error("Kategoriya topilmadi");
      }

      const currentTests = categoryDoc.data().tests || [];
      const maxTests = categoryDoc.data().maxQuestions || 100;

      if (currentTests.length + tests.length > maxTests) {
        throw new Error(
          `Ushbu kategoriya uchun maksimal testlar soni ${maxTests} ta`
        );
      }

      for (const testData of tests) {
        await updateDoc(categoryRef, {
          tests: arrayUnion({
            title: `Test ${currentTests.length + 1}`,
            questions: [testData],
            createdAt: new Date().toISOString(),
          }),
        });
      }
    } catch (err) {
      throw new Error(`Testlarni saqlashda xatolik: ${err.message}`);
    }
  };

  const isCategoryFormValid = useMemo(() => {
    return (
      categoryName.trim() &&
      !categories.some(
        (cat) => cat.name.toLowerCase() === categoryName.trim().toLowerCase()
      )
    );
  }, [categoryName, categories]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
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
            <h1 className="text-2xl font-bold text-white">
              Yo'nalishlar va savollar qo'shish
            </h1>
          </div>

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
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Yo'nalish qo'shish
              </h2>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Yo'nalish nomi"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" &&
                        isCategoryFormValid &&
                        !loading &&
                        addCategory()
                      }
                      className={`w-full rounded-lg shadow-md p-[10px] focus:ring-2 ${
                        categoryName.trim() &&
                        categories.some(
                          (cat) =>
                            cat.name.toLowerCase() ===
                              categoryName.trim().toLowerCase() &&
                            cat.type === categoryType
                        )
                          ? "border border-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      }`}
                    />
                  </div>
                  <select
                    value={categoryType}
                    onChange={(e) => setCategoryType(e.target.value)}
                    className="rounded-lg shadow-md p-[10px] focus:ring-2 focus:ring-blue-500 border border-gray-300"
                  >
                    <option value="entrance">Kirish testi</option>
                    <option value="exit">Chiqish testi</option>
                  </select>
                  <button
                    onClick={addCategory}
                    disabled={!isCategoryFormValid || loading}
                    className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? <FaSpinner className="animate-spin" /> : null}
                    Qo'shish
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  {categoryType === "entrance"
                    ? "* Kirish testida har bir kategoriyada 100 ta test bo'ladi, o'quvchi uchun 30 tasi random shaklda chiqadi"
                    : "* Chiqish testida har bir kategoriyada 200 ta test bo'ladi, o'quvchi uchun 50 tasi random shaklda chiqadi"}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Mavjud yo'nalishlar ro'yxati:
              </h2>
              {categoriesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <FaSpinner className="animate-spin text-blue-600 text-2xl" />
                  <span className="ml-2 text-gray-600">
                    Kategoriyalar yuklanmoqda...
                  </span>
                </div>
              ) : categories.length === 0 ? (
                <p className="text-gray-500 italic">
                  Hozircha kategoriyalar mavjud emas
                </p>
              ) : (
                <div className="flex flex-wrap gap-8">
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Kirish testlari
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {categories
                        .filter((category) => category.type === "entrance")
                        .map((category) => (
                          <div key={category.id} className="relative group">
                            {editingCategory === category.id ? (
                              <div className="relative flex items-center">
                                <input
                                  type="text"
                                  value={newCategoryName}
                                  onChange={(e) =>
                                    setNewCategoryName(e.target.value)
                                  }
                                  onKeyPress={(e) =>
                                    e.key === "Enter" && handleSave(category.id)
                                  }
                                  className="px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 focus:outline-none pr-8"
                                />
                                <button
                                  className="absolute right-2 text-blue-600 hover:text-blue-800"
                                  onClick={() => handleSave(category.id)}
                                  disabled={loading}
                                >
                                  {loading ? (
                                    <FaSpinner className="animate-spin w-4 h-4" />
                                  ) : (
                                    <FaCheck className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <div className="group relative inline-block">
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 group-hover:pr-8">
                                  {category.name} ({category.tests?.length || 0}
                                  /100 test)
                                  <button
                                    className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-800"
                                    onClick={() => handleEditClick(category)}
                                    disabled={loading}
                                  >
                                    <FaEdit className="w-3 h-3" />
                                  </button>
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-green-800 mb-2">
                      Chiqish testlari
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {categories
                        .filter((category) => category.type === "exit")
                        .map((category) => (
                          <div key={category.id} className="relative group">
                            {editingCategory === category.id ? (
                              <div className="relative flex items-center">
                                <input
                                  type="text"
                                  value={newCategoryName}
                                  onChange={(e) =>
                                    setNewCategoryName(e.target.value)
                                  }
                                  onKeyPress={(e) =>
                                    e.key === "Enter" && handleSave(category.id)
                                  }
                                  className="px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 focus:outline-none pr-8"
                                />
                                <button
                                  className="absolute right-2 text-green-600 hover:text-green-800"
                                  onClick={() => handleSave(category.id)}
                                  disabled={loading}
                                >
                                  {loading ? (
                                    <FaSpinner className="animate-spin w-4 h-4" />
                                  ) : (
                                    <FaCheck className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <div className="group relative inline-block">
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 group-hover:pr-8">
                                  {category.name} ({category.tests?.length || 0}
                                  /200 test)
                                  <button
                                    className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity text-green-600 hover:text-green-800"
                                    onClick={() => handleEditClick(category)}
                                    disabled={loading}
                                  >
                                    <FaEdit className="w-3 h-3" />
                                  </button>
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Savol qo'shish:
              </h2>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test qo'shish uchun yo'nalishni tanlang
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-2 rounded-lg shadow-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Yo'nalishni tanlang</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} (
                      {category.type === "entrance" ? "Kirish" : "Chiqish"})
                    </option>
                  ))}
                </select>
              </div>

              {selectedCategory && (
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Test qo'shish usullari
                    </h3>
                    <button
                      onClick={() => setShowInstructions(!showInstructions)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Yo'riqnoma"
                    >
                      <BiHelpCircle className="w-6 h-6" />
                    </button>
                  </div>

                  <Tabs
                    selectedIndex={activeTab}
                    onSelect={(index) => setActiveTab(index)}
                  >
                    <TabList>
                      <Tab>Qo'lda kiritish</Tab>
                      <Tab>Word fayldan yuklash</Tab>
                      <Tab>JSON fayldan yuklash</Tab>
                    </TabList>

                    <TabPanel>
                      <div className="space-y-4 mt-4">
                        <textarea
                          placeholder="Savolni kiriting"
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                        {options.map((option, index) => (
                          <input
                            key={index}
                            type="text"
                            placeholder={`${index + 1}-variant`}
                            value={option}
                            onChange={(e) =>
                              updateOption(index, e.target.value)
                            }
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        ))}
                        <select
                          value={correctAnswer}
                          onChange={(e) => setCorrectAnswer(e.target.value)}
                          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">To'g'ri javobni tanlang</option>
                          {options.map(
                            (option, index) =>
                              option && (
                                <option key={index} value={option}>
                                  {option}
                                </option>
                              )
                          )}
                        </select>
                        <button
                          onClick={addQuestion}
                          disabled={!isFormValid || loading}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {loading ? (
                            <FaSpinner className="animate-spin mx-auto" />
                          ) : (
                            "Savolni qo'shish"
                          )}
                        </button>
                      </div>
                    </TabPanel>

                    <TabPanel>
                      <div className="space-y-6">
                        <div
                          className={`p-8 border-2 border-dashed rounded-lg text-center ${
                            dragActive
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-300"
                          } ${loading ? "opacity-50" : ""}`}
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={(e) => handleDrop(e, "word")}
                        >
                          <input
                            ref={wordFileInputRef}
                            type="file"
                            accept=".docx"
                            onChange={(e) => handleFileInput(e, "word")}
                            className="hidden"
                          />
                          <div className="space-y-4">
                            {uploadStatus ? (
                              <div className="space-y-4">
                                <div className="relative pt-1">
                                  <div className="flex mb-2 items-center justify-between">
                                    <div>
                                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                                        {uploadStatus === "preparing" &&
                                          "Tayyorlanmoqda..."}
                                        {uploadStatus === "checking" &&
                                          "Tekshirilmoqda..."}
                                        {uploadStatus === "validating" &&
                                          "Tekshirilmoqda..."}
                                        {uploadStatus === "saving" &&
                                          "Saqlanmoqda..."}
                                        {uploadStatus === "completed" &&
                                          "Muvaffaqiyatli yuklandi!"}
                                        {uploadStatus === "error" &&
                                          "Xatolik yuz berdi"}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs font-semibold inline-block text-blue-600">
                                        {uploadProgress}%
                                      </span>
                                    </div>
                                  </div>
                                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                                    <div
                                      style={{ width: `${uploadProgress}%` }}
                                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                                        uploadStatus === "error"
                                          ? "bg-red-500"
                                          : "bg-blue-500"
                                      }`}
                                    ></div>
                                  </div>
                                </div>
                                {fileInfo && (
                                  <div className="text-sm text-gray-600">
                                    <p>Fayl nomi: {fileInfo.name}</p>
                                    <p>Hajmi: {fileInfo.size}</p>
                                    {fileInfo.testsCount && (
                                      <p>
                                        Yuklangan testlar: {fileInfo.testsCount} ta
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <>
                                <FaFileWord className="w-12 h-12 mx-auto text-blue-600" />
                                <p className="text-gray-600">
                                  Word faylni bu yerga tashlang yoki
                                  <button
                                    onClick={() =>
                                      wordFileInputRef.current?.click()
                                    }
                                    className="mx-2 text-blue-600 hover:text-blue-800"
                                  >
                                    kompyuterdan tanlang
                                  </button>
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-center">
                          <a
                            href="/templates/sample_tests.docx"
                            download
                            className="inline-flex items-center px-4 py-2 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            <FaFileWord className="mr-2" />
                            Namuna Word faylni yuklab olish
                          </a>
                          <p className="mt-2 text-sm text-gray-500">
                            * Namuna fayl test formatini ko'rsatadi
                          </p>
                        </div>
                      </div>
                    </TabPanel>

                    <TabPanel>
                      <div className="space-y-6">
                        <div
                          className={`p-8 border-2 border-dashed rounded-lg text-center ${
                            dragActive
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-300"
                          } ${loading ? "opacity-50" : ""}`}
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={(e) => handleDrop(e, "json")}
                        >
                          <input
                            ref={jsonFileInputRef}
                            type="file"
                            accept=".json"
                            onChange={(e) => handleFileInput(e, "json")}
                            className="hidden"
                          />
                          <div className="space-y-4">
                            <FaFileCode className="w-12 h-12 mx-auto text-blue-600" />
                            <p className="text-gray-600">
                              JSON faylni bu yerga tashlang yoki
                              <button
                                onClick={() =>
                                  jsonFileInputRef.current?.click()
                                }
                                className="mx-2 text-blue-600 hover:text-blue-800"
                              >
                                kompyuterdan tanlang
                              </button>
                            </p>
                          </div>
                        </div>

                        <div className="text-center">
                          <a
                            href="/templates/sample_tests.json"
                            download
                            className="inline-flex items-center px-4 py-2 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            <FaFileCode className="mr-2" />
                            Namuna JSON faylni yuklab olish
                          </a>
                          <p className="mt-2 text-sm text-gray-500">
                            * Namuna fayl test formatini ko'rsatadi
                          </p>
                        </div>
                      </div>
                    </TabPanel>
                  </Tabs>

                  {showInstructions && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                      <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-medium">
                            Fayl yuklash yo'riqnomasi
                          </h3>
                          <button
                            onClick={() => setShowInstructions(false)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <h4 className="font-medium mb-2">
                              Word fayl formati:
                            </h4>
                            <pre className="bg-gray-50 p-4 rounded-lg text-sm">
                              {wordInstructions.join("\n")}
                            </pre>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">
                              JSON fayl formati:
                            </h4>
                            <pre className="bg-gray-50 p-4 rounded-lg text-sm">
                              {jsonInstructions.join("\n")}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-4">
                  {correctAnswer.trim() && !options.includes(correctAnswer) && (
                    <p className="text-yellow-600 text-xs mt-1">
                      To'g'ri javob yuqoridagi variantlar ichida bo'lishi kerak
                    </p>
                  )}

                  {selectedCategory && (
                    <div className="bg-gray-50 p-4 rounded-lg border mt-4">
                      <h4 className="font-medium text-gray-900 mb-2">
                        Form holati:
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div
                          className={`flex items-center gap-2 ${
                            question.trim() ? "text-green-600" : "text-gray-500"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              question.trim() ? "bg-green-500" : "bg-gray-300"
                            }`}
                          ></span>
                          Savol kiritildi
                        </div>
                        <div
                          className={`flex items-center gap-2 ${
                            options.every((opt) => opt.trim())
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              options.every((opt) => opt.trim())
                                ? "bg-green-500"
                                : "bg-gray-300"
                            }`}
                          ></span>
                          Barcha variantlar to'ldirildi
                        </div>
                        <div
                          className={`flex items-center gap-2 ${
                            correctAnswer.trim() &&
                            options.includes(correctAnswer)
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              correctAnswer.trim() &&
                              options.includes(correctAnswer)
                                ? "bg-green-500"
                                : "bg-gray-300"
                            }`}
                          ></span>
                          To'g'ri javob ko'rsatildi
                        </div>
                      </div>
                    </div>
                  )}
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
