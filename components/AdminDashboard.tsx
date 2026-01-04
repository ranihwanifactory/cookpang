
import React, { useState } from 'react';
import { RecipeVideo, DEFAULT_CATEGORIES } from '../types';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Plus, Trash2, Edit2, X, Save, Settings, AlertCircle } from 'lucide-react';

interface AdminDashboardProps {
  videos: RecipeVideo[];
  onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ videos, onClose }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<RecipeVideo>>({
    title: '',
    youtubeId: '',
    category: '한식',
    channelTitle: '',
    description: ''
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const videoData = {
      ...formData,
      thumbnail: `https://img.youtube.com/vi/${formData.youtubeId}/maxresdefault.jpg`,
      publishedAt: new Date().toISOString().split('T')[0]
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "videos", editingId), videoData);
      } else {
        await addDoc(collection(db, "videos"), videoData);
      }
      resetForm();
    } catch (err: any) {
      console.error("Save error", err);
      if (err.code === 'permission-denied') {
        alert("저장 권한이 없습니다. Firebase Console의 보안 규칙을 확인하세요.");
      } else {
        alert("저장 중 오류가 발생했습니다.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("정말로 이 영상을 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, "videos", id));
    } catch (err: any) {
      console.error("Delete error", err);
      if (err.code === 'permission-denied') {
        alert("삭제 권한이 없습니다.");
      }
    }
  };

  const resetForm = () => {
    setFormData({ title: '', youtubeId: '', category: '한식', channelTitle: '', description: '' });
    setEditingId(null);
  };

  const startEdit = (video: RecipeVideo) => {
    setFormData(video);
    setEditingId(video.id);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-gray-50 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2">
              <Settings className="text-orange-500" /> 관리자 대시보드
            </h1>
            <p className="text-gray-500 mt-1">콘텐츠 및 카테고리를 관리합니다.</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-full transition-colors shadow-sm">
            <X size={28} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-6 shadow-xl shadow-orange-100/50 border border-orange-100 sticky top-24">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                {editingId ? <Edit2 size={20} className="text-blue-500" /> : <Plus size={20} className="text-orange-500" />}
                {editingId ? '영상 수정하기' : '새 영상 등록'}
              </h2>
              
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">제목</label>
                  <input 
                    required
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-orange-500"
                    placeholder="영상 제목을 입력하세요"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">YouTube ID</label>
                    <input 
                      required
                      value={formData.youtubeId}
                      onChange={e => setFormData({...formData, youtubeId: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-orange-500"
                      placeholder="qf_wN7fS_u8"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">카테고리</label>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-orange-500 text-sm"
                    >
                      {DEFAULT_CATEGORIES.filter(c => c !== '전체').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">채널명</label>
                  <input 
                    required
                    value={formData.channelTitle}
                    onChange={e => setFormData({...formData, channelTitle: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-orange-500"
                    placeholder="채널 이름을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">설명</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-orange-500 h-24 resize-none"
                    placeholder="영상에 대한 짧은 설명을 적어주세요"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save size={18} />
                    {editingId ? '수정 완료' : '등록하기'}
                  </button>
                  {editingId && (
                    <button 
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200"
                    >
                      취소
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* List Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-800">등록된 영상 ({videos.length})</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {videos.map((video) => (
                  <div key={video.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    <img 
                      src={video.thumbnail} 
                      className="w-32 h-20 object-cover rounded-xl shadow-sm"
                      alt="" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-bold rounded">
                          {video.category}
                        </span>
                        <span className="text-[10px] text-gray-400">{video.publishedAt}</span>
                      </div>
                      <h3 className="font-bold text-gray-800 truncate">{video.title}</h3>
                      <p className="text-xs text-gray-400 truncate">{video.channelTitle}</p>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => startEdit(video)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(video.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {videos.length === 0 && (
                  <div className="p-20 text-center text-gray-400">
                    등록된 영상이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
