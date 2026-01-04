
import React, { useState, useEffect, useMemo } from 'react';
import { 
  RecipeVideo, 
  UserProfile,
  DEFAULT_CATEGORIES
} from './types';
import { MOCK_VIDEOS } from './services/mockData';
import { auth, googleProvider, db } from './firebase';
import { 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  collection,
  onSnapshot,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { 
  Utensils, 
  Search, 
  Heart, 
  LogOut, 
  User as UserIcon, 
  ChefHat, 
  Flame,
  Star,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  Lock
} from 'lucide-react';
import VideoCard from './components/VideoCard';
import VideoDetail from './components/VideoDetail';
import AdminDashboard from './components/AdminDashboard';

const ADMIN_EMAIL = 'acehwan69@gmail.com';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<RecipeVideo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(DEFAULT_CATEGORIES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<RecipeVideo | null>(null);
  const [isFavoritesView, setIsFavoritesView] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{code: string; message: string} | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  // Sync Videos from Firestore with Robust Error Handling
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    let unsubscribe: () => void = () => {};
    
    try {
      const q = query(collection(db, "videos"), orderBy("publishedAt", "desc"));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const videoList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecipeVideo));
        setVideos(videoList);
        setIsLoading(false);
        setError(null);
        
        // Seed initial data if empty and user is admin
        if (videoList.length === 0 && isAdmin) {
          seedInitialData();
        }
      }, (err) => {
        console.error("Firestore Snapshot Error:", err);
        setIsLoading(false);
        setError({
          code: err.code,
          message: err.code === 'permission-denied' 
            ? "데이터베이스 접근 권한이 없습니다. 보안 규칙을 설정해주세요." 
            : "데이터를 불러오는 중 예상치 못한 오류가 발생했습니다."
        });
      });
    } catch (e: any) {
      setIsLoading(false);
      setError({ code: 'unknown', message: e.message });
    }

    return () => unsubscribe();
  }, [isAdmin]);

  const seedInitialData = async () => {
    try {
      if (window.confirm("데이터베이스가 비어있습니다. 초기 샘플 데이터를 등록할까요? (관리자만 가능)")) {
        const batch = writeBatch(db);
        MOCK_VIDEOS.forEach(v => {
          const newDocRef = doc(collection(db, "videos"));
          batch.set(newDocRef, { ...v, id: newDocRef.id });
        });
        await batch.commit();
        alert("초기 데이터가 성공적으로 등록되었습니다.");
      }
    } catch (err) {
      console.error("Seeding Error:", err);
      alert("데이터 등록 중 권한 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDocRef = doc(db, "users", fbUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            const newProfile: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName,
              photoURL: fbUser.photoURL,
              favorites: []
            };
            await setDoc(userDocRef, newProfile);
            setUser(newProfile);
          } else {
            setUser(userDoc.data() as UserProfile);
          }
        } catch (err: any) {
          console.error("User Profile Error:", err);
          // Even if profile fails, set basic user from auth
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            photoURL: fbUser.photoURL,
            favorites: []
          });
          if (err.code === 'permission-denied') {
            setError({ code: 'permission-denied', message: '사용자 정보 접근 권한이 없습니다.' });
          }
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login Error", err);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setIsFavoritesView(false);
  };

  const toggleFavorite = async (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    if (!user) {
      handleLogin();
      return;
    }

    const isFav = user.favorites.includes(videoId);
    const userDocRef = doc(db, "users", user.uid);

    try {
      if (isFav) {
        await updateDoc(userDocRef, { favorites: arrayRemove(videoId) });
        setUser({ ...user, favorites: user.favorites.filter(id => id !== videoId) });
      } else {
        await updateDoc(userDocRef, { favorites: arrayUnion(videoId) });
        setUser({ ...user, favorites: [...user.favorites, videoId] });
      }
    } catch (err) {
      alert("즐겨찾기 업데이트 권한이 없습니다. Firebase 보안 규칙을 확인해주세요.");
    }
  };

  const filteredVideos = useMemo(() => {
    let result = videos;
    if (isFavoritesView && user) {
      result = result.filter(v => user.favorites.includes(v.id));
    } else if (selectedCategory !== '전체') {
      result = result.filter(v => v.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(v => 
        v.title.toLowerCase().includes(lowerQuery) || 
        v.channelTitle.toLowerCase().includes(lowerQuery)
      );
    }
    return result;
  }, [videos, selectedCategory, searchQuery, isFavoritesView, user?.favorites]);

  const firestoreRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /videos/{videoId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.email == '${ADMIN_EMAIL}';
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /comments/{commentId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow delete: if request.auth != null && (request.auth.uid == resource.data.userId || request.auth.token.email == '${ADMIN_EMAIL}');
    }
  }
}`;

  return (
    <div className="min-h-screen pb-20 selection:bg-orange-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-orange-100 px-4 py-3 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div 
            onClick={() => { setIsFavoritesView(false); setSelectedCategory('전체'); setError(null); }} 
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="bg-orange-500 p-2 rounded-xl text-white group-hover:rotate-12 transition-transform shadow-lg shadow-orange-200">
              <ChefHat size={28} />
            </div>
            <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">
              요리<span className="text-orange-500">해조</span>
            </h1>
          </div>

          <div className="flex-1 max-w-xl relative hidden md:block">
            <input 
              type="text"
              placeholder="레시피, 셰프, 요리명 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl text-sm focus:border-orange-400 focus:bg-white transition-all outline-none"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {isAdmin && (
              <button 
                onClick={() => setShowAdmin(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-colors shadow-lg"
              >
                <ShieldCheck size={18} />
                <span>관리자</span>
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsFavoritesView(!isFavoritesView)}
                  className={`p-2 rounded-xl transition-all ${isFavoritesView ? 'bg-rose-500 text-white shadow-lg' : 'bg-rose-50 text-rose-500 hover:bg-rose-100'}`}
                  title="즐겨찾기"
                >
                  <Heart size={24} fill={isFavoritesView ? "currentColor" : "none"} />
                </button>
                <img 
                  src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                  className="w-10 h-10 rounded-full border-2 border-orange-200 shadow-sm"
                  alt="Profile"
                />
                <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-full text-gray-400" title="로그아웃">
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
              >
                <UserIcon size={18} />
                <span>로그인</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Permission Error Setup Guide */}
        {error?.code === 'permission-denied' ? (
          <div className="mb-12 p-8 bg-white border-4 border-orange-400 rounded-[3rem] shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="bg-orange-500 p-6 rounded-[2rem] text-white shadow-xl shadow-orange-200 shrink-0 mx-auto md:mx-0">
                <Lock size={48} className="animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-orange-100 text-orange-600 text-xs font-black rounded-full uppercase">Setup Required</span>
                  <h3 className="text-2xl font-black text-gray-900">Firestore 보안 규칙 설정이 필요합니다</h3>
                </div>
                <p className="text-gray-600 text-base mb-6 leading-relaxed">
                  현재 Firebase 프로젝트의 데이터베이스가 '잠금 모드'로 설정되어 있어 데이터를 불러올 수 없습니다. <br/>
                  아래의 단계를 따라 보안 규칙을 업데이트해주세요.
                </p>
                
                <div className="space-y-4 mb-8">
                  <div className="flex gap-4">
                    <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold shrink-0">1</span>
                    <p className="text-sm text-gray-700 font-medium"><b>Firebase Console</b>에 접속하여 <b>Firestore Database</b> 메뉴로 이동합니다.</p>
                  </div>
                  <div className="flex gap-4">
                    <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold shrink-0">2</span>
                    <p className="text-sm text-gray-700 font-medium">상단의 <b>Rules(규칙)</b> 탭을 선택하고 기존 내용을 삭제합니다.</p>
                  </div>
                  <div className="flex gap-4">
                    <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold shrink-0">3</span>
                    <p className="text-sm text-gray-700 font-medium">아래 코드를 복사해서 붙여넣고 <b>게시(Publish)</b>를 누르세요.</p>
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute -top-3 left-6 px-3 py-1 bg-gray-800 text-white text-[10px] font-bold rounded-full z-10">FIRESTORE RULES</div>
                  <pre className="bg-gray-900 text-orange-100 p-8 rounded-3xl text-xs overflow-x-auto border border-gray-800 leading-normal font-mono shadow-2xl">
                    {firestoreRules}
                  </pre>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(firestoreRules);
                      alert("규칙이 복사되었습니다! 이제 Firebase Console에 붙여넣으세요.");
                    }}
                    className="absolute top-4 right-4 p-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-all flex items-center gap-2 text-xs font-bold shadow-lg"
                  >
                    <Copy size={16} /> 코드 복사하기
                  </button>
                </div>

                <div className="mt-8 flex flex-wrap gap-4">
                  <a 
                    href="https://console.firebase.google.com/" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl hover:-translate-y-1"
                  >
                    Firebase 콘솔 열기 <ExternalLink size={18} />
                  </a>
                  <button 
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-3 px-8 py-4 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-xl hover:-translate-y-1 shadow-orange-200"
                  >
                    <RefreshCw size={18} /> 규칙 적용 완료 (새로고침)
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : error && (
          <div className="mb-8 p-8 bg-red-50 border-2 border-red-100 rounded-3xl text-center shadow-sm">
            <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-red-900 mb-2">오류가 발생했습니다</h3>
            <p className="text-red-600 font-medium mb-6">{error.message}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
            >
              다시 시도하기
            </button>
          </div>
        )}

        {/* Hero Banner with Food Background */}
        {!isFavoritesView && !error && (
          <div className="mb-12 relative rounded-[3rem] overflow-hidden shadow-2xl h-[400px] flex items-center group">
            <img 
              src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
              alt="Gourmet Food"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent"></div>
            <div className="relative z-10 px-8 md:px-16 text-white max-w-2xl">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/90 backdrop-blur-md rounded-full text-xs font-black mb-6 tracking-widest uppercase">
                <Flame size={16} className="text-yellow-300 animate-pulse" /> Trending Recipes
              </span>
              <h2 className="text-5xl md:text-6xl font-black mb-6 leading-tight drop-shadow-2xl">
                당신의 식탁을<br />특별한 <span className="text-orange-400">셰프의 경험</span>으로
              </h2>
              <p className="text-white/90 text-base md:text-lg mb-8 leading-relaxed max-w-lg drop-shadow-md">
                Gemini AI가 영상의 핵심만을 쏙쏙 골라 요약해드립니다. <br/>
                지금 바로 맛있는 여행을 시작해보세요!
              </p>
              <div className="flex gap-4">
                <button 
                   onClick={() => setSelectedCategory('한식')}
                   className="px-10 py-4 bg-orange-500 text-white rounded-2xl font-black hover:bg-orange-600 transition-all shadow-2xl hover:scale-105 active:scale-95 shadow-orange-500/30"
                >
                  오늘 뭐 먹지?
                </button>
                <button 
                   onClick={() => setIsFavoritesView(true)}
                   className="px-10 py-4 bg-white/10 backdrop-blur-md text-white border-2 border-white/20 rounded-2xl font-black hover:bg-white/20 transition-all shadow-xl"
                >
                  나의 즐겨찾기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Category Tabs */}
        {!isFavoritesView && !error && (
          <div className="flex gap-3 mb-12 overflow-x-auto py-2 scrollbar-hide no-scrollbar">
            {DEFAULT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-8 py-3.5 rounded-2xl text-sm font-black transition-all border-2 ${
                  selectedCategory === cat 
                  ? 'bg-orange-500 text-white border-orange-500 shadow-xl shadow-orange-100 scale-105' 
                  : 'bg-white text-gray-500 border-gray-100 hover:border-orange-200 hover:text-orange-500 hover:bg-orange-50/30'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Section Heading */}
        {!error && (
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-3 rounded-2xl text-orange-500">
                <Star size={28} fill="currentColor" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                {isFavoritesView ? '내가 찜한 레시피' : `${selectedCategory} 요리 모음`}
              </h2>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm text-gray-400 font-black tracking-widest uppercase">
                Total {filteredVideos.length} Discoveries
              </p>
            </div>
          </div>
        )}

        {/* Responsive Video Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-48">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin"></div>
              <ChefHat className="absolute inset-0 m-auto text-orange-200" size={24} />
            </div>
            <p className="text-gray-400 font-black mt-6 tracking-widest animate-pulse">CHEF IS PREPARING...</p>
          </div>
        ) : filteredVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredVideos.map((video) => (
              <VideoCard 
                key={video.id}
                video={video}
                isFavorite={user?.favorites.includes(video.id) || false}
                onSelect={setSelectedVideo}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        ) : !error && (
          <div className="flex flex-col items-center justify-center py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-gray-100 shadow-inner">
            <div className="bg-orange-50 p-10 rounded-full mb-8 text-orange-200 animate-bounce">
              <Search size={64} />
            </div>
            <h3 className="text-2xl font-black text-gray-800">아직 준비된 레시피가 없네요</h3>
            <p className="text-gray-400 text-sm mt-3 max-w-xs leading-relaxed font-medium">다른 카테고리를 선택하거나 검색어를 바꿔보세요!</p>
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="max-w-7xl mx-auto px-8 py-12 border-t border-orange-50 flex flex-col md:flex-row items-center justify-between gap-6 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
        <div className="flex items-center gap-2">
          <ChefHat size={20} className="text-orange-500" />
          <span className="font-black text-gray-800 tracking-tighter">요리해조 RECIPE HUB</span>
        </div>
        <p className="text-xs font-medium text-gray-400">© 2024 K-Chef Recipe Hub. Powered by Gemini AI</p>
      </footer>

      {/* Modals & Overlays */}
      {showAdmin && isAdmin && (
        <AdminDashboard videos={videos} onClose={() => setShowAdmin(false)} />
      )}
      
      {selectedVideo && (
        <VideoDetail 
          video={selectedVideo} 
          user={user} 
          onClose={() => setSelectedVideo(null)} 
        />
      )}

      {/* Ambient Background Glows */}
      <div className="fixed -bottom-40 -left-40 w-[600px] h-[600px] bg-orange-200/20 rounded-full blur-[120px] -z-10 pointer-events-none animate-pulse"></div>
      <div className="fixed top-1/2 -right-40 w-[500px] h-[500px] bg-rose-200/10 rounded-full blur-[120px] -z-10 pointer-events-none animate-pulse"></div>
    </div>
  );
};

export default App;
