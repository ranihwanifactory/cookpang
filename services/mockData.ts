
import { RecipeVideo, RecipeCategory } from '../types';

export const MOCK_VIDEOS: RecipeVideo[] = [
  {
    id: 'v1',
    youtubeId: 'qf_wN7fS_u8',
    title: '정말 맛있는 김치볶음밥 황금레시피',
    channelTitle: '백종원의 요리비책',
    thumbnail: 'https://picsum.photos/seed/kimchi/600/400',
    category: RecipeCategory.KOREAN,
    description: '간단하게 만들 수 있는 최고의 김치볶음밥입니다.',
    publishedAt: '2024-03-01'
  },
  {
    id: 'v2',
    youtubeId: 'W_I02LqUasY',
    title: '부드러운 스테이크 굽는 법',
    channelTitle: 'Chef Gordon',
    thumbnail: 'https://picsum.photos/seed/steak/600/400',
    category: RecipeCategory.WESTERN,
    description: '집에서도 레스토랑처럼 부드러운 스테이크를 즐기세요.',
    publishedAt: '2024-03-05'
  },
  {
    id: 'v3',
    youtubeId: 'pP0XyK-6v7k',
    title: '초간단 계란찜 비법',
    channelTitle: '하루요리',
    thumbnail: 'https://picsum.photos/seed/egg/600/400',
    category: RecipeCategory.KOREAN,
    description: '몽글몽글 폭신폭신한 계란찜 만드는 법입니다.',
    publishedAt: '2024-02-28'
  },
  {
    id: 'v4',
    youtubeId: 'dQw4w9WgXcQ',
    title: '홈베이킹 초보용 초코칩 쿠키',
    channelTitle: 'Baking Joy',
    thumbnail: 'https://picsum.photos/seed/cookie/600/400',
    category: RecipeCategory.BAKING,
    description: '실패 없는 달콤한 초코칩 쿠키 레시피입니다.',
    publishedAt: '2024-03-10'
  },
  {
    id: 'v5',
    youtubeId: '6T97S6x8Tyk',
    title: '다이어트용 닭가슴살 샐러드',
    channelTitle: '건강식단TV',
    thumbnail: 'https://picsum.photos/seed/salad/600/400',
    category: RecipeCategory.DIET,
    description: '맛있게 먹으면서 살 빼는 건강 샐러드입니다.',
    publishedAt: '2024-03-12'
  },
  {
    id: 'v6',
    youtubeId: 'r7qP2p-Y7X8',
    title: '불맛 나는 짜장면 만들기',
    channelTitle: '중식의 달인',
    thumbnail: 'https://picsum.photos/seed/noodle/600/400',
    category: RecipeCategory.CHINESE,
    description: '집에서 즐기는 정통 짜장면 레시피입니다.',
    publishedAt: '2024-03-15'
  }
];
