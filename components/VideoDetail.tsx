
import React, { useState, useEffect } from 'react';
import { RecipeVideo, Comment, UserProfile } from '../types';
import { X, Send, MessageCircle, AlertCircle, Trash2, Edit2, Check, RotateCcw } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';

interface VideoDetailProps {
  video: RecipeVideo;
  user: UserProfile | null;
  isAdmin: boolean;
  onClose: () => void;
}

const VideoDetail: React.FC<VideoDetailProps> = ({ video, user, isAdmin, onClose }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [commentsError, setCommentsError] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "comments"),
      where("videoId", "==", video.id)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      docs.sort((a, b) => b.createdAt - a.createdAt);
      setComments(docs);
      setCommentsError(false);
    }, (err) => {
      console.error("Comments Fetch Error:", err);
      setCommentsError(true);
    });

    return () => unsubscribe();
  }, [video.id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !commentText.trim()) return;

    try {
      await addDoc(collection(db, "comments"), {
        videoId: video.id,
        userId: user.uid,
        userName: user.displayName || '익명 셰프',
        userPhoto: user.photoURL,
        text: commentText,
        createdAt: Date.now()
      });
      setCommentText('');
    } catch (err) {
      console.error("Comment add error", err);
      alert("댓글 작성에 실패했습니다.");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, "comments", commentId));
    } catch (err) {
      console.error("Delete error", err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.text);
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editingText.trim()) return;
    try {
      await updateDoc(doc(db, "comments", commentId), {
        text: editingText,
        updatedAt: Date.now()
      });
      setEditingCommentId(null);
      setEditingText('');
    } catch (err) {
      console.error("Update error", err);
      alert("수정 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col lg:flex-row h-full max-h-[90vh]">
          {/* Left: Video Content */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-gray-800 line-clamp-1">{video.title}</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                <X size={24} />
              </button>
            </div>
            
            <div className="aspect-video rounded-2xl overflow-hidden bg-black shadow-lg">
              <iframe
                src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1`}
                title={video.title}
                className="w-full h-full"
                allowFullScreen
              />
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                영상 상세 설명
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {video.description || "상세 설명이 없습니다."}
              </p>
            </div>
          </div>

          {/* Right: Comments Section */}
          <div className="w-full lg:w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-2">
              <MessageCircle size={20} className="text-orange-500" />
              <h3 className="font-bold text-gray-800">댓글 ({comments.length})</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {commentsError ? (
                <div className="text-center py-10 px-4">
                  <AlertCircle size={32} className="mx-auto text-orange-300 mb-2" />
                  <p className="text-xs text-gray-400">댓글 로딩 중 오류가 발생했습니다.</p>
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-gray-400">첫 댓글을 남겨보세요!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                    <img 
                      src={comment.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`} 
                      className="w-8 h-8 rounded-full shadow-sm"
                      alt=""
                    />
                    <div className="flex-1 group/comment">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-700">{comment.userName}</span>
                        <div className="flex items-center gap-2 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                          {user?.uid === comment.userId && editingCommentId !== comment.id && (
                            <button onClick={() => handleStartEdit(comment)} className="text-blue-500 hover:text-blue-600 p-1">
                              <Edit2 size={12} />
                            </button>
                          )}
                          {(user?.uid === comment.userId || isAdmin) && (
                            <button onClick={() => handleDeleteComment(comment.id)} className="text-rose-500 hover:text-rose-600 p-1">
                              <Trash2 size={12} />
                            </button>
                          )}
                          <span className="text-[10px] text-gray-400">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      {editingCommentId === comment.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full text-sm text-gray-600 p-2 rounded-lg border-2 border-orange-200 focus:outline-none focus:border-orange-500 resize-none h-20"
                          />
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setEditingCommentId(null)}
                              className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"
                            >
                              <RotateCcw size={14} />
                            </button>
                            <button 
                              onClick={() => handleUpdateComment(comment.id)}
                              className="p-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                            >
                              <Check size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600 leading-relaxed bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                          {comment.text}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {user ? (
              <form onSubmit={handleAddComment} className="p-4 bg-white border-t border-gray-200">
                <div className="relative">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="댓글을 남겨주세요..."
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-orange-500"
                  />
                  <button 
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-orange-500 hover:text-orange-600"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 bg-white border-t border-gray-200 text-center">
                <p className="text-xs text-gray-500">로그인 후 댓글을 남길 수 있습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetail;
