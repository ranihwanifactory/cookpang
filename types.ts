
export interface RecipeVideo {
  id: string;
  youtubeId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  category: string;
  description: string;
  publishedAt: string;
}

// Added RecipeCategory constant to resolve the 'no exported member' error in services/mockData.ts
export const RecipeCategory = {
  KOREAN: '한식',
  WESTERN: '양식',
  CHINESE: '중식',
  JAPANESE: '일식',
  BAKING: '베이킹',
  SNACK: '간식/야식',
  DIET: '다이어트'
} as const;

export interface Category {
  id: string;
  name: string;
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: number;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  favorites: string[]; // List of video IDs
}

export const DEFAULT_CATEGORIES = [
  '전체', '한식', '양식', '중식', '일식', '베이킹', '간식/야식', '다이어트'
];
