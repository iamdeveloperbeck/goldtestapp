import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../data/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { FaFolderPlus, FaClipboardList, FaDownload } from "react-icons/fa";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editUserId, setEditUserId] = useState(null);
  const [editUserData, setEditUserData] = useState({});

  useEffect(() => {
    const fetchUsers = () => {
      const usersRef = collection(db, 'users');
      return onSnapshot(usersRef, (snapshot) => {
        try {
          const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log("Users:", usersData); // Debugging
          setUsers(usersData);
          setLoading(false);
        } catch (err) {
          console.error("Error fetching users:", err);
          setError("Error fetching users");
          setLoading(false);
        }
      });
    };

    const unsubscribe = fetchUsers();
    return () => unsubscribe();
  }, []);

  const handleEditUser = async () => {
    if (!editUserId) return;
    try {
      const userRef = doc(db, 'users', editUserId);
      await updateDoc(userRef, editUserData);
      setEditUserId(null);
      setEditUserData({});
    } catch (err) {
      console.error("Error updating user:", err);
      alert("Error updating user data");
    }
  };

  const startEditing = (user) => {
    setEditUserId(user.id);
    setEditUserData({ 
      firstName: user.firstName, 
      lastName: user.lastName, 
      correct: user.correct, 
      incorrect: user.incorrect 
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditUserData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleDeleteUser = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Error deleting user data");
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Test topshirganlar hisoboti", 20, 10);
    doc.autoTable({
      head: [['Ism va familiya', 'To‘g‘ri javoblar', 'Noto‘g‘ri javoblar', 'Holat']],
      body: users.map(user => [
        `${user.firstName} ${user.lastName}`,
        user.correct,
        user.incorrect,
        user.passed ? 'O‘tgan' : 'O‘tmagan'
      ]),
    });
    doc.save('foydalanuvchilar_hisobi.pdf');
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className='p-[20px] w-full'>
      <div className='flex items-center justify-between'>
        <h1 className='mb-4 text-4xl font-extrabold leading-none tracking-tight text-gray-900 '>Boshqaruv paneli</h1>
        <nav>
          <ul className='mb-4 flex items-center gap-5'>
            <li>
              <Link to="/add-category" className='text-blue-500 flex items-center gap-2 text-1xl font-medium hover:underline leading-none tracking-tight'><FaFolderPlus /> Yo'nalish va savollar qo'shish</Link>
            </li>
            <li>
              <Link to="/test-list" className='text-blue-500 flex items-center gap-2 text-1xl font-medium hover:underline leading-none tracking-tight'><FaClipboardList /> Testlar ro'yxati</Link>
            </li>
          </ul>
        </nav>
      </div>

      <button
        onClick={exportToPDF}
        className='mb-4 p-2 bg-blue-500 text-white rounded flex items-center gap-2'
      >
        <FaDownload /> PDF ga yuklab olish
      </button>

      <table className='min-w-full bg-white border border-gray-300'>
        <thead>
          <tr>
            <th className='py-2 px-4 border-b border-r text-left'>Ism</th>
            <th className='py-2 px-4 border-b border-r text-left'>Familiya</th>
            <th className='py-2 px-4 border-b border-r text-left'>To'g'ri javoblar</th>
            <th className='py-2 px-4 border-b border-r text-left'>Noto'g'ri javoblar</th>
            <th className='py-2 px-4 border-b border-r text-left'>Holat</th>
            <th className='py-2 px-4 border-b border-r text-left'>Harakatlar</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td className='py-2 px-4 border-b border-r'>
                {editUserId === user.id ? (
                  <input
                    type="text"
                    name="firstName"
                    value={editUserData.firstName}
                    onChange={handleChange}
                    className="border p-1"
                  />
                ) : (
                  user.firstName
                )}
              </td>
              <td className='py-2 px-4 border-b border-r'>
                {editUserId === user.id ? (
                  <input
                    type="text"
                    name="lastName"
                    value={editUserData.lastName}
                    onChange={handleChange}
                    className="border p-1"
                  />
                ) : (
                  user.lastName
                )}
              </td>
              <td className='py-2 px-4 border-b border-r'>
                {editUserId === user.id ? (
                  <input
                    type="number"
                    name="correct"
                    value={editUserData.correct}
                    onChange={handleChange}
                    className="border p-1"
                  />
                ) : (
                  user.correct
                )}
              </td>
              <td className='py-2 px-4 border-b border-r'>
                {editUserId === user.id ? (
                  <input
                    type="number"
                    name="incorrect"
                    value={editUserData.incorrect}
                    onChange={handleChange}
                    className="border p-1"
                  />
                ) : (
                  user.incorrect
                )}
              </td>
              <td className='py-2 px-4 border-b border-r'>{user.passed ? 'O‘tdi' : 'O‘ta olmadi'}</td>
              <td className='py-2 px-4 border-b'>
                {editUserId === user.id ? (
                  <button onClick={handleEditUser} className='p-2 bg-green-500 text-white rounded mr-2'>Saqlash</button>
                ) : (
                  <button onClick={() => startEditing(user)} className='p-2 bg-yellow-500 text-white rounded mr-2'>Tahrirlash</button>
                )}
                <button
                  onClick={() => handleDeleteUser(user.id)}
                  className='p-2 bg-red-500 text-white rounded'
                >
                  O‘chirish
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminDashboard;