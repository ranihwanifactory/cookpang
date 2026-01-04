
import React, { useState, useEffect } from 'react';
import { RecipeVideo, Comment, UserProfile } from '../types';
import { X, Send, Sparkles, MessageCircle, Clock, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { getRecipeSummary } from '../services/geminiService';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy } from 'firebase/firestore';

interface VideoDetailProps {
  video: RecipeVideo;
  user: UserProfile | null;
  onClose: () => void;
}

const VideoDetail: React.FC<VideoDetailProps> = ({ video, user, onClose }) => {
  const [summary, setSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [commentsError, setCommentsError] = useState(false);

  useEffect(() => {
    // Fetch comments in real-time with Error Handling
    const q = query(
      collection(db, "comments"),
      where("videoId", "==", video.id),
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      setComments(docs);
      setCommentsError(false);
    }, (err) => {
      console.error("Comments Fetch Error:", err);
      setCommentsError(true);
    });

    return () => unsubscribe();
  }, [video.id]);

  const handleSummarize = async () => {
    setLoadingSummary(true);
    const result = await getRecipeSummary(video.title, video.description);
    setSummary(result);
    setLoadingSummary(false);
  };

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
      alert("댓글 작성 권한이 없습니다.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col lg:flex-row h-full max-h-[90vh]">
          {/* Left: Video & Summary */}
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

            {/* AI Summary Section */}
            <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-orange-600 font-bold">
                  <Sparkles size={20} />
                  <span>AI 레시피 요약</span>
                </div>
                {summary && (
                  <button 
                    onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                    className="text-orange-400 hover:text-orange-600"
                  >
                    {isSummaryExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                  </button>
                )}
              </div>

              {!summary ? (
                <button 
                  onClick={handleSummarize}
                  disabled={loadingSummary}
                  className="mt-3 w-full py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {loadingSummary ? '레시피 분석 중...' : 'Gemini AI로 레시피 분석하기'}
                </button>
              ) : isSummaryExpanded && (
                <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div>
                    <h4 className="font-bold text-gray-700 text-sm mb-2">준비 재료</h4>
                    <div className="flex flex-wrap gap-2">
                      {summary.ingredients.map((ing: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-white text-orange-700 rounded-full text-xs shadow-sm border border-orange-50">
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-700 text-sm mb-2">핵심 순서</h4>
                    <ol className="space-y-2">
                      {summary.steps.map((step: string, i: number) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-600">
                          <span className="font-bold text-orange-500">{i + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="pt-2 border-t border-orange-200">
                    <p className="text-sm font-medium text-orange-800 italic">" {summary.tip} "</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Comments */}
          <div className="w-full lg:w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-2">
              <MessageCircle size={20} className="text-orange-500" />
              <h3 className="font-bold text-gray-800">댓글 ({comments.length})</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {commentsError ? (
                <div className="text-center py-10 px-4">
                  <AlertCircle size={32} className="mx-auto text-orange-300 mb-2" />
                  <p className="text-xs text-gray-400">댓글 데이터에 접근할 권한이 없습니다. 관리자에게 문의하세요.</p>
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-gray-400">첫 댓글을 남겨보세요!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <img 
                      src={comment.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userName}`} 
                      className="w-8 h-8 rounded-full shadow-sm"
                      alt=""
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-700">{comment.userName}</span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed bg-white p-2 rounded-lg shadow-sm">
                        {comment.text}
                      </p>
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
                    placeholder="맛있는 댓글을 남겨주세요..."
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
                <p className="text-xs text-gray-500 mb-2">로그인 후 댓글 작성이 가능합니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetail;
