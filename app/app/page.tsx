'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { getTasks, createTask, updateTask, deleteTask as deleteTaskFromDB, getCompletedTasks, type Task as DBTask, type Priority } from '@/lib/tasks';
import { supabase } from '@/lib/supabase';
import { getSession, signOut, getUser } from '@/lib/auth';
import { getProfile, hasProfile } from '@/lib/profile';
import { getAvatarById } from '@/lib/avatars';
import { AIChat } from '@/components/ai-chat';

// Custom Date Picker Component
function CustomDatePicker({ value, onChange, placeholder = "Select date" }: {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : new Date());
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const datePickerRef = useRef<HTMLDivElement>(null);
  
  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Only close if clicking outside both the input and the dropdown
      if (datePickerRef.current && 
          !datePickerRef.current.contains(target) && 
          !target.closest('.date-picker-dropdown')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  const today = new Date();
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };
  
  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    const dateString = formatDate(newDate);
    onChange(dateString);
    setIsOpen(false);
  };
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setMonth(currentMonth - 1);
    } else {
      newDate.setMonth(currentMonth + 1);
    }
    setSelectedDate(newDate);
  };
  
  const goToToday = () => {
    const todayDate = new Date();
    setSelectedDate(todayDate);
    onChange(formatDate(todayDate));
    setIsOpen(false);
  };
  
  const clearDate = () => {
    onChange('');
    setIsOpen(false);
  };
  
  const isToday = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    return formatDate(date) === formatDate(today);
  };
  
  const isSelected = (day: number) => {
    if (!value) return false;
    const date = new Date(currentYear, currentMonth, day);
    return formatDate(date) === value;
  };

  const handleOpen = () => {
    setIsOpen(true);
  };

  // Calculate position when dropdown opens
  useEffect(() => {
    if (isOpen && datePickerRef.current) {
      const rect = datePickerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 320; // Approximate height of the dropdown
      
      // Check if there's enough space below, otherwise position above
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      let top;
      if (spaceBelow >= dropdownHeight || spaceBelow > spaceAbove) {
        // Position below
        top = rect.bottom + window.scrollY + 8;
      } else {
        // Position above
        top = rect.top + window.scrollY - dropdownHeight - 8;
      }
      
      setDropdownPosition({
        top,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);
  
  return (
    <div className="relative date-picker-container" ref={datePickerRef}>
      <button
        type="button"
        onClick={handleOpen}
        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-left flex items-center justify-between"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value ? new Date(value).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          }) : placeholder}
        </span>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
      
      {isOpen && createPortal(
        <div 
          className="date-picker-dropdown p-4"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="font-semibold text-gray-900">
              {monthNames[currentMonth]} {currentYear}
            </h3>
            <button
              onClick={() => navigateMonth('next')}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-xs font-medium text-gray-500 text-center py-2">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <div key={`empty-${i}`} className="h-8"></div>
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              return (
                <button
                  key={day}
                  onClick={() => handleDateSelect(day)}
                  className={`h-8 text-sm rounded-lg transition-colors ${
                    isSelected(day)
                      ? 'bg-blue-500 text-white'
                      : isToday(day)
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={clearDate}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={goToToday}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Today
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// Sidebar with added "All Tasks"
function Sidebar({ activeMenu, setActiveMenu, onSignOut, profileName, userEmail, avatarId }: { activeMenu: string; setActiveMenu: (menu: string) => void; onSignOut: () => void; profileName: string | null; userEmail: string | null; avatarId?: number }) {
  return (
    <aside className="card soft-border w-[280px] shrink-0 p-3 h-full overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
        <div className="size-8 rounded-xl bg-black text-white grid place-items-center text-sm font-bold">B</div>
        <div className="font-semibold text-[15px]">BetterTasks</div>
      </div>

      <div className="divider" />

      <div className="space-y-3 overflow-y-auto pr-1 select-none" draggable="false" onDragStart={(e) => e.preventDefault()}>
        <div>
          <div className="sidebar-section-title px-2 mb-2">Main Menu</div>
          <nav className="space-y-1">
            {[
              { label: 'Today', icon: '☀️', color: 'text-orange-500' },
              { label: 'All Tasks', icon: '📋', color: 'text-blue-500' },
              { label: 'Calendar', icon: '📅', color: 'text-purple-500' },
              { label: 'Analytics', icon: '📊', color: 'text-green-500' },
              { label: 'Focus Mode', icon: '🎯', color: 'text-red-500' },
            ].map((i) => (
              <button
                key={i.label}
                onClick={() => setActiveMenu(i.label)}
                draggable="false"
                className={`w-full flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-all duration-200 ${
                  activeMenu === i.label
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                    : 'btn-ghost hover:bg-zinc-50 text-zinc-800'
                }`}
              >
                <span className={`text-lg ${i.color}`} draggable="false">{i.icon}</span>
                <span className="flex-1 text-left text-[14px] font-medium">{i.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-4">
          <div className="sidebar-section-title px-2 mb-2 flex items-center justify-between">
            <span>Lists</span>
            <span className="text-lg">+</span>
          </div>
          <div className="space-y-2">
            <div>
              <div className="text-xs font-medium px-2 mb-1 text-[--color-muted]">Projects</div>
              <ul className="space-y-1">
                <li className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 cursor-pointer" draggable="false">
                  <span className="text-zinc-400">+</span>
                  <span className="text-sm flex-1 text-[--color-muted]">Create a project</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="divider" />

        <div className="flex items-center justify-between px-2">
          <div className="btn-ghost rounded-full px-2 py-1 text-xs">◐ Light</div>
          <div className="text-[--color-muted]">|</div>
          <div className="btn-ghost rounded-full px-2 py-1 text-xs">☾ Dark</div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="size-10 rounded-full bg-white border-2 border-gray-200 grid place-items-center shrink-0 overflow-hidden" draggable="false">
              {getAvatarById(avatarId || 1)}
            </div>
            <div className="text-sm leading-tight min-w-0 flex-1">
              <div className="font-medium truncate">{profileName || 'User'}</div>
              <div className="text-xs text-[--color-muted] truncate">{userEmail || 'No email'}</div>
            </div>
          </div>
          <button
            onClick={onSignOut}
            draggable="false"
            className="btn-ghost size-8 rounded-full grid place-items-center text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0 group relative"
            title="Sign out"
            aria-label="Sign out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5" draggable="false">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Sign out
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function TopCard({ connectionStatus, userName }: { connectionStatus: string; userName: string | null }) {
  const displayName = userName || 'there';
  return (
    <div className="card soft-border px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-semibold">Welcome, {displayName}!</div>
          <div className="text-sm text-[--color-muted]">What do you plan to do today?</div>
          {connectionStatus && (
            <div className={`text-xs mt-2 ${connectionStatus.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
              {connectionStatus}
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="text-sm text-[--color-muted]">Y-Y:</div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="size-3 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium">2</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="size-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm font-medium">1</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="size-3 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium">0</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative size-16">
              <svg className="size-16 transform -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#3b82f6" strokeWidth="4" strokeDasharray="70, 100" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-800">70%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="text-sm text-gray-600">This page can only be seen by logged-in users.</div>
      </div>
    </div>
  );
}

// UI Task type (uses 'badge' for display)
type Task = { 
  id: string; 
  title: string; 
  description?: string; 
  badge: Priority; 
  date: string; 
  completed?: boolean; 
  completedAt?: string;
};

// Helper to convert DB task to UI task
function dbTaskToUITask(dbTask: DBTask): Task {
  return {
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description || undefined,
    badge: dbTask.priority,
    date: dbTask.date,
    completed: dbTask.completed,
    completedAt: dbTask.completed_at || undefined,
  };
}

function TaskRow({ task, onToggle, onEdit, onDelete, highlightRed, isAnimating }:{ 
  task: Task; 
  onToggle?: () => void; 
  onEdit?: () => void;
  onDelete?: () => void;
  highlightRed?: boolean;
  isAnimating?: boolean;
}) {
  const { title, description, badge, completed = false } = task;
  const color = badge === 'High' ? 'bg-red-50 text-red-700 border-red-200' : badge === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-white text-gray-700 border-gray-200';
  
  return (
    <div className={`flex items-start gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${completed ? 'bg-green-50 border-2 border-green-300' : 'bg-white border-2 border-blue-500 hover:bg-gray-50'} shadow-sm ${isAnimating ? 'animate-slide-out' : ''}`}>
      <button onClick={onToggle} className={`size-6 rounded-full grid place-items-center text-sm font-medium transition-all duration-200 ${completed ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'} mt-0.5`} aria-label="Toggle complete">
        {completed ? '✓' : ''}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium transition-all duration-200 ${completed ? 'text-green-700 line-through' : (highlightRed ? 'text-red-600' : 'text-gray-800')}`}>{title}</div>
        {description && (
          <div className={`text-xs mt-1 transition-all duration-200 ${completed ? 'text-green-600 line-through' : 'text-gray-600'}`}>
            {description}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${color}`}>{badge}</span>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="btn-ghost size-8 rounded-md grid place-items-center text-gray-400 hover:text-gray-600" title="Edit">✏</button>
          <button onClick={onDelete} className="btn-ghost size-8 rounded-md grid place-items-center text-gray-400 hover:text-red-500" title="Delete">×</button>
        </div>
      </div>
    </div>
  );
}

function TodayTasks({ tasks, onToggle, onAdd, onEdit, onDelete, animatingTasks, onShowHistory }:{ 
  tasks: Task[]; 
  onToggle: (id:string)=>void; 
  onAdd: ()=>void;
  onEdit: (id:string)=>void;
  onDelete: (id:string)=>void;
  animatingTasks: Set<string>;
  onShowHistory: () => void;
}) {
  const completedCount = tasks.filter(t => t.completed).length;
  return (
    <div className="card soft-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Today's Tasks</h2>
          <p className="text-sm text-gray-500 mt-1">{completedCount} of {tasks.length} tasks completed</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onShowHistory} className="btn btn-primary text-sm px-4 py-2">📚 History</button>
        </div>
      </div>

      <div className="space-y-2">
        {tasks.map((t) => (
          <TaskRow 
            key={t.id} 
            task={t} 
            onToggle={() => onToggle(t.id)} 
            onEdit={() => onEdit(t.id)} 
            onDelete={() => onDelete(t.id)} 
            isAnimating={animatingTasks.has(t.id)}
          />
        ))}
        {tasks.length === 0 && <div className="text-sm text-gray-500 px-1 py-6">No tasks for today.</div>}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <button onClick={onAdd} className="btn btn-ghost text-sm px-4 py-2 text-gray-600 hover:text-gray-800">+ Add Task</button>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>{completedCount} completed</span>
            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
            <span>{tasks.length - completedCount} pending</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0,0,0,0);
  const tStr = today.toISOString().slice(0,10);
  
  if (dateStr < tStr) return `Missed - ${d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function AllTasks({ tasks, onToggle, onAdd, onEdit, onDelete, animatingTasks, onShowHistory }:{ 
  tasks: Task[]; 
  onToggle: (id:string)=>void; 
  onAdd: ()=>void;
  onEdit?: (id:string)=>void;
  onDelete?: (id:string)=>void;
  animatingTasks: Set<string>;
  onShowHistory: () => void;
}) {
  const groups = useMemo(() => {
    const byDate = new Map<string, Task[]>();
    [...tasks]
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach(t => {
        if (!byDate.has(t.date)) byDate.set(t.date, []);
        byDate.get(t.date)!.push(t);
      });
    return Array.from(byDate.entries());
  }, [tasks]);

  return (
    <div className="card soft-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">All Tasks</h2>
          <p className="text-sm text-gray-500 mt-1">{tasks.filter(t=>t.completed).length} completed • {tasks.length} total</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onShowHistory} className="btn btn-primary text-sm px-4 py-2">📚 History</button>
        </div>
      </div>

      <div className="space-y-6">
        {groups.map(([date, list]) => (
          <div key={date} className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-1">{formatDateLabel(date)}</div>
            {list.map((t) => {
              const today = toLocalISODate();
              const isOverdue = !t.completed && t.date < today;
              return (
                <TaskRow
                  key={t.id}
                  task={t}
                  onToggle={() => onToggle(t.id)}
                  onEdit={onEdit ? () => onEdit(t.id) : undefined}
                  onDelete={onDelete ? () => onDelete(t.id) : undefined}
                  highlightRed={isOverdue}
                  isAnimating={animatingTasks.has(t.id)}
                />
              );
            })}
          </div>
        ))}
        {groups.length === 0 && <div className="text-sm text-gray-500 px-1 py-6">No tasks yet. Add your first task.</div>}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <button onClick={onAdd} className="btn btn-ghost text-sm px-4 py-2 text-gray-600 hover:text-gray-800">+ Add Task</button>
        </div>
      </div>
    </div>
  );
}

function toLocalISODate(d = new Date()) {
  const dt = new Date(d);
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  return dt.toISOString().slice(0,10);
}

function AddTaskForm({ onCreate, onCancel, editingTask }:{ 
  onCreate: (data: { title:string; description?: string; badge: Priority; date?: string })=>void; 
  onCancel: ()=>void;
  editingTask?: Task;
}) {
  const [title, setTitle] = useState(editingTask?.title || '');
  const [description, setDescription] = useState(editingTask?.description || '');
  const [badge, setBadge] = useState<Priority>(editingTask?.badge || 'Medium');
  const [date, setDate] = useState<string>(editingTask?.date || '');

  return (
    <div className="card soft-border p-6 relative overflow-visible">
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-semibold text-gray-800">{editingTask ? 'Edit Task' : 'Add Task'}</div>
        <button 
          onClick={onCancel}
          className="btn-ghost size-10 rounded-full grid place-items-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-xl font-medium transition-colors"
          title="Close"
        >
          ×
        </button>
      </div>
      <div className="space-y-4">
        <div>
          <input 
            value={title} 
            onChange={e=>setTitle(e.target.value)} 
            placeholder="Task title" 
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400" 
          />
        </div>
        <div>
          <textarea 
            value={description} 
            onChange={e=>setDescription(e.target.value)} 
            placeholder="Task description (optional)" 
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400 h-24 resize-none" 
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <div className="relative">
              <select 
                value={badge} 
                onChange={e=>setBadge(e.target.value as Priority)} 
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
              >
                <option value="High">🔴 High Priority</option>
                <option value="Medium">🟡 Medium Priority</option>
                <option value="Low">🟢 Low Priority</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
            <CustomDatePicker 
              value={date} 
              onChange={setDate}
              placeholder="Select due date"
            />
          </div>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <div className="text-xs text-gray-500">If no date picked, task is for Today.</div>
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost px-4 py-2 text-sm" onClick={onCancel}>Cancel</button>
          <button
            className="btn btn-primary px-6 py-2 text-sm font-medium"
            onClick={() => {
              if (!title.trim()) return;
              onCreate({ title: title.trim(), description: description.trim() || undefined, badge, date: date || undefined });
              setTitle('');
              setDescription('');
              setBadge('Medium');
              setDate('');
            }}
          >
            {editingTask ? 'Update Task' : 'Save Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryPanel({ completedTasks, onClose, currentView }:{ 
  completedTasks: Task[]; 
  onClose: () => void;
  currentView: string;
}) {
  const filteredTasks = useMemo(() => {
    if (currentView === 'Today') {
      const today = toLocalISODate();
      return completedTasks.filter(t => t.date === today);
    }
    return completedTasks;
  }, [completedTasks, currentView]);

  const groups = useMemo(() => {
    const byDate = new Map<string, Task[]>();
    [...filteredTasks]
      .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
      .forEach(t => {
        const date = t.date;
        if (!byDate.has(date)) byDate.set(date, []);
        byDate.get(date)!.push(t);
      });
    return Array.from(byDate.entries());
  }, [filteredTasks]);

  return (
    <aside className="card soft-border w-[360px] shrink-0 p-3 h-full flex flex-col">
      <div className="flex items-start justify-between px-1">
        <div>
          <div className="font-semibold">📚 History</div>
          <div className="text-xs text-[--color-muted]">
            {currentView === 'Today' ? 'Today\'s completed tasks' : 'All completed tasks'}
          </div>
        </div>
        <button onClick={onClose} className="btn-ghost size-8 rounded-full">×</button>
      </div>

      <div className="mt-4 overflow-y-auto pr-1">
        {groups.length === 0 ? (
          <div className="card soft-border p-6 text-center">
            <div className="text-sm text-gray-500">No completed tasks yet</div>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map(([date, list]) => (
              <div key={date} className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-1">
                  {formatDateLabel(date)}
                </div>
                {list.map((t) => (
                  <div key={t.id} className="flex items-start gap-3 px-3 py-3 rounded-lg bg-green-50 border-2 border-green-200 shadow-sm">
                    <div className="size-6 rounded-full bg-green-500 text-white grid place-items-center text-sm font-medium mt-0.5">
                      ✓
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-green-700 line-through">{t.title}</div>
                      {t.description && (
                        <div className="text-xs mt-1 text-green-600 line-through">
                          {t.description}
                        </div>
                      )}
                      {t.completedAt && (
                        <div className="text-xs mt-1 text-green-500">
                          Completed at {new Date(t.completedAt).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                        t.badge === 'High' ? 'bg-red-50 text-red-700 border-red-200' : 
                        t.badge === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                        'bg-white text-gray-700 border-gray-200'
                      }`}>
                        {t.badge}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

// AssistantPanel is now replaced by AIChat component

export default function AppPage() {
  const [activeMenu, setActiveMenu] = useState('Today');
  const [showAdd, setShowAdd] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [animatingTasks, setAnimatingTasks] = useState<Set<string>>(new Set());
  const [completedTasksHistory, setCompletedTasksHistory] = useState<Task[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userAvatarId, setUserAvatarId] = useState<number>(1);
  const router = useRouter();

  const todayStr = toLocalISODate();
  const todayTasks = useMemo(() => tasks.filter(t => t.date === todayStr), [tasks, todayStr]);

  // Check authentication on mount and load user profile
  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession();
      if (!session) {
        router.push('/auth/login');
      } else {
        // Check if user has a profile, redirect if not
        try {
          const profileExists = await hasProfile();
          if (!profileExists) {
            router.push('/auth/setup-profile');
            return;
          }
          
          setCheckingAuth(false);
          // Load user profile to get name, email, and avatar
          try {
            const profile = await getProfile();
            if (profile) {
              setUserName(profile.full_name);
              setUserAvatarId(profile.avatar_id || 1);
            }
            // Get user email from session
            const user = await getUser();
            if (user?.email) {
              setUserEmail(user.email);
            }
          } catch (error) {
            console.error('Failed to load user profile:', error);
            // Continue without name if profile can't be loaded
          }
        } catch (error) {
          // If profile check fails, redirect to setup-profile as fallback
          console.error('Error checking profile:', error);
          router.push('/auth/setup-profile');
        }
      }
    };
    checkAuth();
  }, [router]);

  // Function to load tasks from database
  const loadTasks = async () => {
    try {
      setLoading(true);
      console.log('Loading tasks from database...');
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout: Database connection took too long')), 10000)
      );
      
      const dbTasks = await Promise.race([getTasks(), timeoutPromise]) as Awaited<ReturnType<typeof getTasks>>;
      console.log('Loaded tasks from database:', dbTasks);
      const uiTasks = dbTasks.map(dbTaskToUITask);
      setTasks(uiTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      // Show error message to user
      setConnectionStatus(`⚠️ Failed to load tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Load tasks from Supabase on mount and set up real-time subscription
  useEffect(() => {
    if (checkingAuth) return;

    loadTasks();

    // Set up real-time subscription to listen for database changes
    try {
      console.log('Setting up Supabase Realtime subscription...');

      const channel = supabase
        .channel('tasks-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'tasks'
          },
          (payload: any) => {
            console.log('Real-time change detected:', payload);

            // Reload tasks whenever any change occurs in the database
            loadTasks();
          }
        )
        .subscribe((status: string) => {
          console.log('Subscription status:', status);
        });

      // Cleanup subscription on unmount
      return () => {
        console.log('Cleaning up Supabase subscription...');
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.error('Error cleaning up subscription:', error);
        }
      };
    } catch (error) {
      console.error('Failed to set up Supabase subscription:', error);
      // Don't prevent page from loading if subscription fails
    }
  }, [checkingAuth]);

  async function toggleTask(id: string) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    try {
      const newCompletedStatus = !task.completed;
      
      // Update in database
      console.log('Updating task in database:', id, { completed: newCompletedStatus });
      const updatedDBTask = await updateTask(id, { completed: newCompletedStatus });
      console.log('Task updated successfully:', updatedDBTask);
      const updatedTask = dbTaskToUITask(updatedDBTask);
      
      if (newCompletedStatus) {
        // Mark as completed and start animation
        setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
        setAnimatingTasks(prev => new Set(prev).add(id));
        
        // Store completed task in history before removal
        setCompletedTasksHistory(prev => [...prev, updatedTask]);
        
        // Remove task after animation completes and reload tasks
        setTimeout(async () => {
          setTasks(prev => prev.filter(t => t.id !== id));
          setAnimatingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });
          // Reload tasks to sync with database
          await loadTasks();
        }, 1000); // Animation duration
      } else {
        // If uncompleting, just update the task
        setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
        // Remove from history if it was there
        setCompletedTasksHistory(prev => prev.filter(t => t.id !== id));
      }
    } catch (error) {
      console.error('Failed to toggle task:', error);
      alert(`Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}. Check console for details.`);
    }
  }

  async function addTask(data: { title:string; description?: string; badge: Priority; date?: string }) {
    const date = data.date && data.date.length > 0 ? data.date : toLocalISODate();
    const todayDate = toLocalISODate();
    
    try {
      if (editingTask) {
        // Update existing task
        console.log('Updating task in database:', editingTask.id, data);
        const updatedDBTask = await updateTask(editingTask.id, {
          title: data.title,
          description: data.description,
          priority: data.badge,
          date: date
        });
        console.log('Task updated successfully:', updatedDBTask);
        const updatedTask = dbTaskToUITask(updatedDBTask);
        setTasks(prev => prev.map(t => t.id === editingTask.id ? updatedTask : t));
      } else {
        // Create new task
        console.log('Creating new task in database:', data);
        try {
          const newDBTask = await createTask({
            title: data.title,
            description: data.description,
            priority: data.badge,
            date: date
          });
          console.log('Task created successfully in database:', newDBTask);
          console.log('Task ID:', newDBTask.id);
          const newTask = dbTaskToUITask(newDBTask);
          setTasks(prev => [...prev, newTask]);
          
          // Reload tasks to verify it was saved
          console.log('Reloading tasks to verify...');
          await loadTasks();
          console.log('Tasks reloaded. Check if new task appears in database.');
        } catch (createError) {
          console.error('CREATE TASK ERROR:', createError);
          throw createError; // Re-throw to trigger the outer catch
        }
      }
      
      // For edit case, reload tasks
      if (editingTask) {
        await loadTasks();
      }
      
      // Switch to All Tasks view if task date is not today
      if (date !== todayDate) {
        setActiveMenu('All Tasks');
      }
      
      setShowAdd(false);
      setEditingTask(undefined);
    } catch (error) {
      console.error('Failed to save task:', error);
      alert(`Failed to save task: ${error instanceof Error ? error.message : 'Unknown error'}. Check console for details.`);
    }
  }

  function editTask(id: string) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      setEditingTask(task);
      setShowAdd(true);
    }
  }

  async function deleteTask(id: string) {
    try {
      console.log('Deleting task from database:', id);
      await deleteTaskFromDB(id);
      console.log('Task deleted successfully');
      setTasks(prev => prev.filter(t => t.id !== id));
      setCompletedTasksHistory(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert(`Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}. Check console for details.`);
    }
  }

  function handleCancel() {
    setShowAdd(false);
    setEditingTask(undefined);
  }

  async function handleShowHistory() {
    setShowHistory(true);
    // Load completed tasks from database
    try {
      const dbCompletedTasks = await getCompletedTasks();
      const uiCompletedTasks = dbCompletedTasks.map(dbTaskToUITask);
      setCompletedTasksHistory(uiCompletedTasks);
    } catch (error) {
      console.error('Failed to load completed tasks:', error);
    }
  }

  function handleCloseHistory() {
    setShowHistory(false);
  }

  async function handleSignOut() {
    try {
      await signOut();
      router.push('/auth/login');
      router.refresh();
    } catch (error) {
      console.error('Failed to sign out:', error);
      alert('Failed to sign out. Please try again.');
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Checking authentication...</div>
      </div>
    );
  }

  return (
    <main className="p-3 h-screen overflow-hidden">
      <div className="mx-auto max-w-[1400px] h-full grid grid-cols-[280px_1fr_360px] gap-3">
        <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} onSignOut={handleSignOut} profileName={userName} userEmail={userEmail} avatarId={userAvatarId} />
        <div className="space-y-3 overflow-y-auto pr-2">
          <TopCard connectionStatus={connectionStatus} userName={userName} />
          {loading ? (
            <div className="card soft-border p-6 text-center">
              <div className="text-sm text-gray-500">Loading tasks...</div>
            </div>
          ) : (
            <>
              {activeMenu === 'All Tasks' ? (
                <>
                  <AllTasks tasks={tasks} onToggle={toggleTask} onAdd={() => setShowAdd(true)} onEdit={editTask} onDelete={deleteTask} animatingTasks={animatingTasks} onShowHistory={handleShowHistory} />
                  {showAdd && <AddTaskForm onCreate={addTask} onCancel={handleCancel} editingTask={editingTask} />}
                </>
              ) : (
                <>
                  <TodayTasks tasks={todayTasks} onToggle={toggleTask} onAdd={() => setShowAdd(true)} onEdit={editTask} onDelete={deleteTask} animatingTasks={animatingTasks} onShowHistory={handleShowHistory} />
                  {showAdd && <AddTaskForm onCreate={addTask} onCancel={handleCancel} editingTask={editingTask} />}
                </>
              )}
            </>
          )}
        </div>
        {showHistory ? (
          <HistoryPanel 
            completedTasks={completedTasksHistory} 
            onClose={handleCloseHistory} 
            currentView={activeMenu} 
          />
        ) : (
          <AIChat onClose={() => {}} />
        )}
      </div>
    </main>
  );
}

