
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
  Search, 
  Heart, 
  LogOut, 
  User as UserIcon, 
  ChefHat, 
  Flame,
  Star,
  ShieldCheck,
  Lock,
  Copy,
  RefreshCw
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

  // 관리자 판별 시 user 객체 전체가 아닌 email만 감시하여 찜하기 시 재구독 방지
  const userEmail = user?.email;
  const isAdmin = useMemo(() => {
    const authEmail = auth.currentUser?.email?.toLowerCase();
    const profileEmail = userEmail?.toLowerCase();
    return authEmail === ADMIN_EMAIL.toLowerCase() || profileEmail === ADMIN_EMAIL.toLowerCase();
  }, [userEmail, auth.currentUser?.email]);

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
      }, (err) => {
        console.error("Firestore Error:", err);
        setIsLoading(false);
        if (err.code === 'permission-denied') {
          setError({ code: 'permission-denied', message: "보안 규칙 설정이 필요합니다." });
        }
      });
    } catch (e: any) {
      setIsLoading(false);
      console.error(e);
    }
    return () => unsubscribe();
  }, []);

  const seedInitialData = async () => {
    try {
      if (window.confirm("초기 샘플 데이터를 등록하시겠습니까?")) {
        const batch = writeBatch(db);
        MOCK_VIDEOS.forEach(v => {
          const newDocRef = doc(collection(db, "videos"));
          batch.set(newDocRef, { ...v, id: newDocRef.id });
        });
        await batch.commit();
        alert("데이터가 등록되었습니다.");
      }
    } catch (err) {
      console.error("Seeding Error:", err);
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
            const data = userDoc.data() as UserProfile;
            setUser({ ...data, favorites: data.favorites || [] });
          }
        } catch (err: any) {
          console.error("Auth Fetch Error", err);
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            photoURL: fbUser.photoURL,
            favorites: []
          });
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
    if (!user || !user.uid || !videoId) {
      if (!user) handleLogin();
      return;
    }
    
    const currentFavorites = user.favorites || [];
    const isFav = currentFavorites.includes(videoId);
    const userDocRef = doc(db, "users", user.uid);

    try {
      const nextFavorites = isFav 
        ? currentFavorites.filter(id => id !== videoId)
        : [...currentFavorites, videoId];
      
      setUser({ ...user, favorites: nextFavorites });

      await updateDoc(userDocRef, {
        favorites: isFav ? arrayRemove(videoId) : arrayUnion(videoId)
      });
    } catch (err) {
      console.error("Favorite Update Error:", err);
      setUser({ ...user, favorites: currentFavorites });
      alert("즐겨찾기 업데이트에 실패했습니다.");
    }
  };

  const filteredVideos = useMemo(() => {
    let result = videos;
    const currentFavorites = user?.favorites || [];
    
    if (isFavoritesView && user) {
      result = result.filter(v => currentFavorites.includes(v.id));
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
      allow update: if request.auth != null && request.auth.uid == resource.data.userId;
      allow delete: if request.auth != null && (request.auth.uid == resource.data.userId || request.auth.token.email == '${ADMIN_EMAIL}');
    }
  }
}`;

  return (
    <div className="min-h-screen pb-20 selection:bg-orange-100">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-orange-100 px-4 py-3 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div 
            onClick={() => { setIsFavoritesView(false); setSelectedCategory('전체'); setError(null); }} 
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="bg-orange-500 p-2 rounded-xl text-white group-hover:rotate-12 transition-transform shadow-lg shadow-orange-200">
              <ChefHat size={28} />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">
              쿡<span className="text-orange-500">팡</span>
            </h1>
          </div>
          
          <div className="flex-1 max-w-xl relative hidden md:block">
            <input 
              type="text"
              placeholder="레시피 검색..."
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
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                <ShieldCheck size={18} />
                <span className="whitespace-nowrap">관리자</span>
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsFavoritesView(!isFavoritesView)}
                  className={`p-2 rounded-xl transition-all ${isFavoritesView ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-rose-50 text-rose-500 hover:bg-rose-100'}`}
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
        {error?.code === 'permission-denied' && (
          <div className="mb-12 p-8 bg-white border-4 border-orange-400 rounded-[3rem] shadow-2xl">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="bg-orange-500 p-6 rounded-[2rem] text-white shadow-xl shrink-0 mx-auto md:mx-0">
                <Lock size={48} className="animate-pulse" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-black text-gray-900 mb-2">데이터베이스 접근 권한이 없습니다</h3>
                <p className="text-gray-600 mb-6">Firebase 콘솔의 Firestore Rules 탭에서 규칙을 적용해 주세요.</p>
                <pre className="bg-gray-900 text-orange-100 p-8 rounded-3xl text-xs overflow-x-auto leading-normal font-mono shadow-2xl">
                  {firestoreRules}
                </pre>
                <div className="mt-8 flex gap-4">
                  <button 
                    onClick={() => { navigator.clipboard.writeText(firestoreRules); alert("규칙이 복사되었습니다."); }}
                    className="flex items-center gap-3 px-8 py-4 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600"
                  >
                    <Copy size={18} /> 규칙 복사하기
                  </button>
                  <button onClick={() => window.location.reload()} className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold">새로고침</button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                <Flame size={16} className="text-yellow-300" /> Best Recipe Hub
              </span>
              <h2 className="text-5xl md:text-6xl font-black mb-6 leading-tight drop-shadow-2xl">
                오늘의 요리는<br /><span className="text-orange-400">쿡팡</span>에서
              </h2>
              <div className="flex gap-4">
                <button 
                   onClick={() => setSelectedCategory('한식')}
                   className="px-10 py-4 bg-orange-500 text-white rounded-2xl font-black hover:bg-orange-600 transition-all shadow-2xl hover:scale-105 shadow-orange-500/30"
                >
                  추천 요리 탐색
                </button>
                {isAdmin && videos.length === 0 && (
                  <button 
                    onClick={seedInitialData}
                    className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-xl"
                  >
                    <RefreshCw size={18} /> 초기 데이터 생성
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {!isFavoritesView && !error && (
          <div className="flex gap-3 mb-12 overflow-x-auto py-2 scrollbar-hide no-scrollbar">
            {DEFAULT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-8 py-3.5 rounded-2xl text-sm font-black transition-all border-2 ${
                  selectedCategory === cat 
                  ? 'bg-orange-500 text-white border-orange-500 shadow-xl shadow-orange-100 scale-105' 
                  : 'bg-white text-gray-500 border-gray-100 hover:border-orange-200 hover:text-orange-500'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

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
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-48 text-center">
            <div className="w-16 h-16 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin"></div>
            <p className="text-gray-400 font-black mt-6 tracking-widest animate-pulse">데이터 로드 중...</p>
          </div>
        ) : filteredVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredVideos.map((video) => (
              <VideoCard 
                key={video.id}
                video={video}
                isFavorite={user?.favorites?.includes(video.id) || false}
                onSelect={setSelectedVideo}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        ) : !error && (
          <div className="flex flex-col items-center justify-center py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-gray-100">
            <ChefHat size={64} className="text-orange-200 mb-8" />
            <h3 className="text-2xl font-black text-gray-800">준비된 레시피가 없습니다.</h3>
            {isAdmin && (
              <button 
                onClick={() => setShowAdmin(true)}
                className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100"
              >
                첫 영상 등록하기
              </button>
            )}
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-8 py-12 border-t border-orange-50 flex flex-col md:flex-row items-center justify-between gap-6 opacity-60">
        <div className="flex items-center gap-2">
          <ChefHat size={20} className="text-orange-500" />
          <span className="font-black text-gray-800 tracking-tighter uppercase">KookPang Recipe Hub</span>
        </div>
        <p className="text-xs font-medium text-gray-400">© 2024 쿡팡 | Your Daily Cooking Partner</p>
      </footer>

      {showAdmin && isAdmin && <AdminDashboard videos={videos} onClose={() => setShowAdmin(false)} />}
      {selectedVideo && (
        <VideoDetail 
          video={selectedVideo} 
          user={user} 
          isAdmin={isAdmin}
          onClose={() => setSelectedVideo(null)} 
        />
      )}
    </div>
  );
};

export default App;
