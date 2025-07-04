import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, doc, query, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// --- Configuration ---
const appId = 'conxept-hub-live-data'; 
const firebaseConfig = {
  apiKey: "AIzaSyChJItkgPTyVNfqcR-Y_AD6DqwXrapKbvk",
  authDomain: "conxepthub.firebaseapp.com",
  projectId: "conxepthub",
  storageBucket: "conxepthub.appspot.com",
  messagingSenderId: "834555144984",
  appId: "1:834555144984:web:44a43dfc8ff6bc566ccc6d",
  measurementId: "G-ENMZ24KEFH"
};

// --- Child Components ---

const XLogo = ({ className }) => (
    <svg className={className} viewBox="0 0 1080 1080" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <polygon points="946.19 784.74 643.16 784.74 505.44 656.21 357.41 784.74 151.73 784.74 251.4 695.58 405.23 557.94 406.09 557.17 405.23 556.35 319.97 474.51 132.89 294.88 435.92 294.88 567.81 420.59 715.41 294.88 921.08 294.88 785.89 415.58 670.09 518.97 853.76 695.78 946.19 784.74"/>
    </svg>
);

const PriorityPill = ({ priority, className = '' }) => {
    const colors = { HIGH: 'bg-red-500/20 text-red-400 border border-red-500/30', MED: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30', LOW: 'bg-sky-500/20 text-sky-400 border border-sky-500/30' };
    return <span className={`px-3 py-1 text-xs font-bold rounded-full ${colors[priority]} ${className}`}>{priority}</span>;
};

const TaskModal = ({ show, onClose, taskToEdit, handleSaveTask, clients, team }) => {
    const [task, setTask] = useState(null);
    
    useEffect(() => {
        if (show) {
            setTask(taskToEdit || { title: '', client: clients[0]?.name || '', assignee: team[0]?.name || '', priority: 'MED', status: 'To Do', description: '', taskType: 'Client' });
        }
    }, [show, taskToEdit, clients, team]);

    useEffect(() => {
        if (task?.taskType === 'CONXEPT') {
            setTask(t => ({ ...t, client: 'CONXEPT' }));
        } else if (task?.client === 'CONXEPT') {
            setTask(t => ({ ...t, client: clients[0]?.name || '' }));
        }
    }, [task, clients]);
    
    if (!show || !task) return null;

    const handleInputChange = (e) => setTask(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSubmit = (e) => { e.preventDefault(); handleSaveTask(task, !!taskToEdit); };

    return (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4"><div className="bg-[#1A1A1A] rounded-2xl shadow-2xl p-8 w-full max-w-lg text-white border border-gray-700">
            <h2 className="text-3xl font-bold mb-6 text-center text-gray-200">{taskToEdit ? 'Edit Task' : 'Add New Task'}</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="mb-4"><label className="block text-sm font-medium text-gray-400 mb-2">Task Type</label><div className="flex bg-black/50 rounded-lg p-1"><button type="button" onClick={() => setTask(t => ({...t, taskType: 'Client'}))} className={`w-1/2 py-2 text-sm font-bold rounded-md transition-colors ${task.taskType === 'Client' ? 'bg-[#0a21cd] text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Client</button><button type="button" onClick={() => setTask(t => ({...t, taskType: 'CONXEPT'}))} className={`w-1/2 py-2 text-sm font-bold rounded-md transition-colors ${task.taskType === 'CONXEPT' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>CONXEPT</button></div></div>
                <div><label className="block text-sm font-medium text-gray-400 mb-1">Task Title</label><input type="text" name="title" value={task.title} onChange={handleInputChange} className="w-full p-3 bg-gray-800/50 rounded-lg border border-gray-700 focus:ring-2 focus:ring-[#0a21cd] outline-none" required /></div>
                <div><label className="block text-sm font-medium text-gray-400 mb-1">Description</label><textarea name="description" value={task.description} onChange={handleInputChange} className="w-full p-3 bg-gray-800/50 rounded-lg border border-gray-700 h-24 resize-none focus:ring-2 focus:ring-[#0a21cd] outline-none"></textarea></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-400 mb-1">Client</label><select name="client" value={task.client} onChange={handleInputChange} disabled={task.taskType === 'CONXEPT'} className="w-full p-3 bg-gray-800/50 rounded-lg border border-gray-700 disabled:bg-gray-700/50 disabled:cursor-not-allowed">{clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                    <div><label className="block text-sm font-medium text-gray-400 mb-1">Assignee</label><select name="assignee" value={task.assignee} onChange={handleInputChange} className="w-full p-3 bg-gray-800/50 rounded-lg border border-gray-700">{team.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}</select></div>
                    <div><label className="block text-sm font-medium text-gray-400 mb-1">Priority</label><select name="priority" value={task.priority} onChange={handleInputChange} className="w-full p-3 bg-gray-800/50 rounded-lg border border-gray-700"><option>HIGH</option><option>MED</option><option>LOW</option></select></div>
                    <div><label className="block text-sm font-medium text-gray-400 mb-1">Status</label><select name="status" value={task.status} onChange={handleInputChange} className="w-full p-3 bg-gray-800/50 rounded-lg border border-gray-700"><option>To Do</option><option>In Progress</option><option>Pending</option><option>Completed</option></select></div>
                </div>
                <div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={onClose} className="px-6 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 transition-colors">Cancel</button><button type="submit" className="px-6 py-2 rounded-lg bg-[#0a21cd] hover:bg-blue-700 font-semibold transition-colors">{taskToEdit ? 'Save Changes' : 'Add Task'}</button></div>
            </form>
        </div></div>
    );
};

const SettingsModal = ({ show, onClose, db, team, clients }) => {
    const [newItemName, setNewItemName] = useState(''); 
    const [newClientName, setNewClientName] = useState('');
    
    if (!show) return null;

    const handleAddItem = async (type) => { 
        const name = type === 'team' ? newItemName : newClientName; 
        if (!name.trim() || !db) return; 
        await addDoc(collection(db, `artifacts/${appId}/public/data/${type}`), { name: name.trim() }); 
        if (type === 'team') setNewItemName(''); else setNewClientName(''); 
    };
    
    const handleDeleteItem = async (type, id) => { 
        if (!db) return; 
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/${type}`, id)); 
    };

    return (
         <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4"><div className="bg-[#1A1A1A] rounded-2xl shadow-2xl p-8 w-full max-w-2xl text-white border border-gray-700">
            <h2 className="text-3xl font-bold mb-6 text-center text-gray-300">Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div><h3 className="text-xl font-bold text-[#0a21cd] mb-4">Manage Team</h3><div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-2">{team.map(member => (<div key={member.id} className="flex justify-between items-center bg-gray-800/50 p-2 rounded-lg"><span>{member.name}</span><button onClick={() => handleDeleteItem('team', member.id)} className="text-red-500 hover:text-red-400 font-bold text-xl">&times;</button></div>))}</div><div className="flex gap-2"><input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="New member name" className="flex-grow p-2 bg-gray-800/50 rounded-lg border border-gray-700" /><button onClick={() => handleAddItem('team')} className="px-4 py-2 bg-[#0a21cd] rounded-lg hover:bg-blue-700">Add</button></div></div>
                <div><h3 className="text-xl font-bold text-purple-400 mb-4">Manage Clients</h3><div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-2">{clients.map(client => (<div key={client.id} className="flex justify-between items-center bg-gray-800/50 p-2 rounded-lg"><span>{client.name}</span><button onClick={() => handleDeleteItem('clients', client.id)} className="text-red-500 hover:text-red-400 font-bold text-xl">&times;</button></div>))}</div><div className="flex gap-2"><input type="text" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="New client name" className="flex-grow p-2 bg-gray-800/50 rounded-lg border border-gray-700" /><button onClick={() => handleAddItem('clients')} className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-500">Add</button></div></div>
            </div>
            <div className="text-center mt-8"><button onClick={onClose} className="px-8 py-2 bg-gray-600 rounded-lg hover:bg-gray-500 transition-colors">Close</button></div>
        </div></div>
    );
};

const ConfirmationModal = ({ show, onCancel, onConfirm, title, message }) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
            <div className="bg-[#1A1A1A] rounded-2xl shadow-2xl p-8 w-full max-w-sm text-white border border-red-500/50">
                <h2 className="text-2xl font-bold mb-4 text-center text-red-400">{title}</h2>
                <p className="text-gray-300 text-center mb-6">{message}</p>
                <div className="flex justify-center space-x-4">
                    <button onClick={onCancel} className="px-8 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 transition-colors">Cancel</button>
                    <button onClick={onConfirm} className="px-8 py-2 rounded-lg bg-red-600 hover:bg-red-500 font-semibold transition-colors">Confirm</button>
                </div>
            </div>
        </div>
    );
};

const StandupView = ({ tasks, clients, team, exportToCSV, handleCompleteTask, handleUndoCompleteTask }) => {
    const [standupDate, setStandupDate] = useState(new Date());
    const { activeTasks, completedTodayTasks } = useMemo(() => {
        const startOfDay = new Date(standupDate); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(standupDate); endOfDay.setHours(23, 59, 59, 999);
        const active = []; const completedToday = [];
        tasks.forEach(task => {
            const createdAt = task.createdAt; const completedAt = task.completedAt;
            if (completedAt && completedAt >= startOfDay && completedAt <= endOfDay) { completedToday.push(task); return; }
            if (createdAt && createdAt <= endOfDay && (!completedAt || completedAt > endOfDay)) { active.push(task); }
        });
        return { activeTasks: active, completedTodayTasks: completedToday };
    }, [tasks, standupDate]);
    const teamForStandup = team.filter(t => t.name !== 'All');

    return (
        <div className="bg-black/20 p-6 rounded-2xl border border-gray-800">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <XLogo className="h-10 text-white" />
                <div className="flex items-center gap-4 bg-gray-800/50 p-2 rounded-lg">
                     <span className="font-bold text-gray-300">Standup Date:</span>
                     <input type="date" value={standupDate.toISOString().split('T')[0]} onChange={e => setStandupDate(new Date(e.target.value))} className="bg-gray-700 text-white p-2 rounded-md border-gray-600"/>
                     <button onClick={() => exportToCSV([...activeTasks, ...completedTodayTasks], `standup-${standupDate.toISOString().split('T')[0]}`)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-lg" title="Export this view to CSV"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg></button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-gray-800/40 p-4 rounded-lg border border-gray-700"><h3 className="font-bold text-xl text-center text-gray-300 mb-3">CLIENTS</h3><div className="space-y-2">
                    {clients.map(client => { const clientTasks = activeTasks.filter(t => t.client === client.name && t.taskType === 'Client'); if (clientTasks.length === 0) return null; return ( <div key={client.id}><h4 className="font-bold text-gray-200">{client.name}</h4><ul className="list-disc list-inside pl-2 text-sm text-gray-400">{clientTasks.map(task => <li key={task.id}>{task.title}</li>)}</ul></div> ); })}
                </div></div>
                {teamForStandup.map(member => ( <div key={member.id} className="bg-[#0a21cd]/20 p-4 rounded-lg border border-[#0a21cd]/50"><h3 className="font-bold text-xl text-center text-white mb-3">{member.name.toUpperCase()}</h3><div className="space-y-3">
                    {activeTasks.filter(t => t.assignee === member.name).map(task => ( <div key={task.id} className="text-sm bg-black/30 p-2.5 rounded-lg flex justify-between items-center group">
                        <div><p className="text-gray-200 font-medium">{task.title}</p><p className={`text-xs mt-1 px-2 py-0.5 inline-block rounded-full ${task.taskType === 'CONXEPT' ? 'bg-purple-500/30 text-purple-300' : 'bg-gray-500/30 text-gray-300'}`}>{task.client}</p></div>
                        <button onClick={() => handleCompleteTask(task.id)} className="ml-2 p-2 rounded-full bg-gray-700/50 text-gray-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-green-500/50 hover:text-white" title="Complete Task"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></button>
                    </div> ))}
                </div></div> ))}
            </div>
            <div className="mt-8 pt-6 border-t-2 border-green-500/30"><h3 className="font-bold text-2xl text-center text-green-400 mb-4">🏆 Completed Today</h3>
                 {completedTodayTasks.length > 0 ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {completedTodayTasks.map(task => (<div key={task.id} className="bg-green-500/10 p-3 rounded-lg text-sm text-green-300 flex justify-between items-center group">
                            <span className="line-through decoration-green-400/50">{task.title}</span>
                            <button onClick={() => handleUndoCompleteTask(task.id)} className="ml-2 p-1.5 rounded-full bg-gray-700/50 text-gray-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-yellow-500/50 hover:text-white" title="Undo Complete">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                            </button>
                        </div>))}
                    </div>) : (<p className="text-center text-gray-500">No tasks completed yet for this day.</p>)}
            </div>
        </div>
    );
};

const KanbanView = ({ tasks, handleOpenTaskModal, setShowDeleteConfirm }) => {
    const TaskCard = ({ task }) => (
        <div className="bg-[#1A1A1A]/70 p-4 rounded-xl border border-gray-700/50 hover:border-[#0a21cd]/70 transition-all duration-300 group">
            <div className="flex justify-between items-start gap-2">
                <h3 className="font-medium text-gray-200 flex-1 pr-2">{task.title}</h3>
                <PriorityPill priority={task.priority} />
            </div>
            <p className="text-gray-400 mt-2 mb-4 text-sm min-h-[20px]">{task.description}</p>
            <div className="flex justify-between items-center">
                <div className="text-xs text-gray-400 flex items-center gap-2">
                    <span className={`font-semibold px-2 py-1 rounded ${task.taskType === 'CONXEPT' ? 'bg-purple-800/70 text-purple-300' : 'bg-gray-700/50'}`}>{task.client}</span>
                    <span className="font-semibold">{task.assignee}</span>
                </div>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => handleOpenTaskModal(task)} className="p-1 text-gray-400 hover:text-white" title="Edit Task"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                     <button onClick={() => setShowDeleteConfirm(task.id)} className="p-1 text-gray-400 hover:text-red-500" title="Delete Task"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                </div>
            </div>
        </div>
    );
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {['To Do', 'In Progress', 'Pending', 'Completed'].map(status => (
                <div key={status} className="bg-black/20 rounded-xl p-4 border border-gray-800">
                    <h2 className="font-bold text-xl mb-4 text-center text-gray-400">{status}</h2>
                    <div className="space-y-4 h-[60vh] overflow-y-auto p-1 pr-2">
                        {tasks.filter(t => t.status === status).length > 0 ? ( tasks.filter(t => t.status === status).map(task => <TaskCard key={task.id} task={task} />) ) : ( <div className="text-center text-gray-600 pt-8 h-full flex items-center justify-center">No tasks here.</div> )}
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- Main App Component ---
export default function App() {
    // --- State Management ---
    const [db, setDb] = useState(null);
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [clients, setClients] = useState([]);
    const [team, setTeam] = useState([]);
    const [currentView, setCurrentView] = useState('board');
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Firebase Initialization & Auth ---
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const authInstance = getAuth(app);
            setDb(firestore);
            setAuth(authInstance);
            const unsubscribe = onAuthStateChanged(authInstance, async (currentUser) => {
                if (currentUser) { setUser(currentUser); } 
                else { await signInAnonymously(authInstance); }
                setIsAuthReady(true);
            });
            return () => unsubscribe();
        } catch (e) {
            console.error("Firebase initialization error:", e);
            setError("Could not connect to the database.");
            setIsLoading(false);
        }
    }, []);

    // --- Data Fetching ---
    useEffect(() => {
        if (!isAuthReady || !db) return;
        const unsubTasks = onSnapshot(query(collection(db, `artifacts/${appId}/public/data/tasks`)), (snapshot) => {
            setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate(), completedAt: d.data().completedAt?.toDate() })));
            setIsLoading(false);
        });
        const unsubClients = onSnapshot(query(collection(db, `artifacts/${appId}/public/data/clients`)), (snapshot) => setClients(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubTeam = onSnapshot(query(collection(db, `artifacts/${appId}/public/data/team`)), (snapshot) => setTeam(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => { unsubTasks(); unsubClients(); unsubTeam(); };
    }, [isAuthReady, db]);

    // --- Core Handlers (CRUD) ---
    const handleOpenTaskModal = (task = null) => { setEditingTask(task); setShowTaskModal(true); };
    const handleCloseTaskModal = () => { setEditingTask(null); setShowTaskModal(false); };
    const handleSaveTask = async (taskData, isEditing) => {
        if (!taskData.title || !db) return;
        try {
            const originalTask = isEditing ? tasks.find(t => t.id === editingTask.id) : null;
            if (taskData.status === 'Completed' && originalTask?.status !== 'Completed') { taskData.completedAt = serverTimestamp(); } 
            else if (taskData.status !== 'Completed') { taskData.completedAt = null; }
            if (isEditing) { await updateDoc(doc(db, `artifacts/${appId}/public/data/tasks`, editingTask.id), taskData); } 
            else { await addDoc(collection(db, `artifacts/${appId}/public/data/tasks`), { ...taskData, createdAt: serverTimestamp() }); }
            handleCloseTaskModal();
        } catch (err) { console.error("Error saving task:", err); setError("Failed to save task."); }
    };
    const handleDeleteTask = async (taskId) => {
        if (!db || !taskId) return;
        try { await deleteDoc(doc(db, `artifacts/${appId}/public/data/tasks`, taskId)); setShowDeleteConfirm(null); } 
        catch (err) { console.error("Error deleting task:", err); setError("Failed to delete task."); }
    };
    const handleCompleteTask = async (taskId) => {
        if (!db) return;
        try { await updateDoc(doc(db, `artifacts/${appId}/public/data/tasks`, taskId), { status: 'Completed', completedAt: serverTimestamp() }); } 
        catch (err) { console.error("Error completing task: ", err); setError("Could not complete the task."); }
    };
    const handleUndoCompleteTask = async (taskId) => {
        if (!db) return;
        try { await updateDoc(doc(db, `artifacts/${appId}/public/data/tasks`, taskId), { status: 'To Do', completedAt: null }); } 
        catch (err) { console.error("Error undoing task: ", err); setError("Could not undo the task."); }
    };
    
    // --- Export Handler ---
    const exportToCSV = (dataToExport, filename) => {
        if (dataToExport.length === 0) { alert("No data to export."); return; }
        const headers = ['ID', 'Title', 'Description', 'Task Type', 'Client', 'Assignee', 'Priority', 'Status', 'Created At', 'Completed At'];
        const rows = dataToExport.map(task => [ task.id, `"${task.title?.replace(/"/g, '""')}"`, `"${task.description?.replace(/"/g, '""')}"`, task.taskType, task.client, task.assignee, task.priority, task.status, task.createdAt?.toISOString() || '', task.completedAt?.toISOString() || '' ].join(','));
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Main Render ---
    return (
        <div className="bg-[#0D0D0D] text-white min-h-screen font-sans">
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                    <XLogo className="h-10 text-white" />
                    <div className="flex flex-wrap items-center gap-3">
                         <div className="bg-black/50 p-1 rounded-lg flex border border-gray-800"><button onClick={() => setCurrentView('board')} className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${currentView === 'board' ? 'bg-[#0a21cd] text-white' : 'text-gray-400 hover:bg-gray-800'}`}>Board</button><button onClick={() => setCurrentView('standup')} className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${currentView === 'standup' ? 'bg-[#0a21cd] text-white' : 'text-gray-400 hover:bg-gray-800'}`}>Standup</button></div>
                        <button onClick={() => setShowSettingsModal(true)} className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2.5 px-4 rounded-lg flex items-center space-x-2 border border-gray-700" title="Settings"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-1.57 1.996A1.532 1.532 0 013 7.054c-1.56.38-1.56 2.6 0 2.98a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 1.996 1.57A1.532 1.532 0 017.054 17c.38 1.56 2.6 1.56 2.98 0a1.532 1.532 0 012.287-.948c1.372.836 2.942-.734 1.57-1.996A1.532 1.532 0 0117 12.946c1.56-.38 1.56-2.6 0-2.98a1.532 1.532 0 01-.948-2.287c.836-1.372-.734-2.942-1.996-1.57A1.532 1.532 0 0112.946 3c-.38-1.56-2.6-1.56-2.98 0zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg></button>
                        <button onClick={() => exportToCSV(tasks, 'all-tasks')} className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2.5 px-4 rounded-lg flex items-center space-x-2 border border-gray-700" title="Export All Tasks"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg></button>
                        <button onClick={() => handleOpenTaskModal()} className="bg-[#0a21cd] hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-lg flex items-center space-x-2 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg><span>New Task</span></button>
                    </div>
                </header>
                {isLoading && <p className="text-center text-gray-400">Loading dashboard...</p>}
                {error && <p className="text-center text-red-400 bg-red-500/10 p-4 rounded-lg">{error}</p>}
                {!isLoading && !error && (currentView === 'board' ? 
                    <KanbanView tasks={tasks} handleOpenTaskModal={handleOpenTaskModal} setShowDeleteConfirm={setShowDeleteConfirm} /> : 
                    <StandupView tasks={tasks} clients={clients} team={team} exportToCSV={exportToCSV} handleCompleteTask={handleCompleteTask} handleUndoCompleteTask={handleUndoCompleteTask} />
                )}
            </div>
            <TaskModal show={showTaskModal} onClose={handleCloseTaskModal} taskToEdit={editingTask} handleSaveTask={handleSaveTask} clients={clients} team={team} />
            <ConfirmationModal show={!!showDeleteConfirm} onCancel={() => setShowDeleteConfirm(null)} onConfirm={() => handleDeleteTask(showDeleteConfirm)} title="Confirm Deletion" message="Are you sure you want to delete this task? This action cannot be undone."/>
            <SettingsModal show={showSettingsModal} onClose={() => setShowSettingsModal(false)} db={db} team={team} clients={clients} />
            <footer className="text-center p-4 text-xs text-gray-600"><p>User ID: {user ? user.uid : 'Not signed in'}</p></footer>
        </div>
    );
}
