import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import SupabaseImage from '@/components/SupabaseImage';
import PostListItem from '@/components/PostListItem';
import { hideTabBar, showTabBar } from '@/components/AnimatedTabBar';

async function searchProfiles(query: string) {
  if (!query.trim()) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url, bio, followers_count')
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

async function searchPosts(query: string) {
  if (!query.trim()) return [];
  const { data, error } = await supabase
    .from('posts')
    .select('*, user:profiles(id, full_name, username, avatar_url)')
    .ilike('content', `%${query}%`)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'people' | 'posts'>('people');
  const insets = useSafeAreaInsets();

  const lastY = useRef(0);
  const tabVisible = useRef(true);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const diff = y - lastY.current;
    if (diff > 10 && tabVisible.current) { tabVisible.current = false; hideTabBar(); }
    else if (diff < -10 && !tabVisible.current) { tabVisible.current = true; showTabBar(); }
    lastY.current = y;
  };

  const { data: people = [], isFetching: fetchingPeople } = useQuery({
    queryKey: ['search-people', query],
    queryFn: () => searchProfiles(query),
    enabled: query.trim().length > 0,
    staleTime: 10_000,
  });

  const { data: posts = [], isFetching: fetchingPosts } = useQuery({
    queryKey: ['search-posts', query],
    queryFn: () => searchPosts(query),
    enabled: query.trim().length > 0,
    staleTime: 10_000,
  });

  const loading = tab === 'people' ? fetchingPeople : fetchingPosts;
  const hasQuery = query.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#0f0f0f' }}>
      {/* Search bar with back button */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 12,
          paddingTop: insets.top + 12,
          paddingBottom: 8,
          backgroundColor: '#0f0f0f',
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </Pressable>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#1a1a1a',
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            gap: 8,
          }}
        >
          <Ionicons name="search" size={18} color="#6b7280" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search people or posts..."
            placeholderTextColor="#6b7280"
            autoFocus
            style={{ flex: 1, color: '#fff', fontSize: 15 }}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#6b7280" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Tabs */}
      {hasQuery && (
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#2a2a2a' }}>
          {(['people', 'posts'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={{
                flex: 1, paddingVertical: 11, alignItems: 'center',
                borderBottomWidth: 2,
                borderBottomColor: tab === t ? '#f97316' : 'transparent',
              }}
            >
              <Text style={{
                color: tab === t ? '#f97316' : '#6b7280',
                fontWeight: '600', textTransform: 'capitalize', fontSize: 14,
              }}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* States */}
      {!hasQuery ? (
        <View style={{ alignItems: 'center', marginTop: 64, gap: 12 }}>
          <Ionicons name="search-outline" size={52} color="#2a2a2a" />
          <Text style={{ color: '#6b7280', fontSize: 15 }}>Search for people or posts</Text>
        </View>
      ) : loading ? (
        <ActivityIndicator color="#f97316" style={{ marginTop: 40 }} />
      ) : tab === 'people' ? (
        people.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ color: '#6b7280', fontSize: 15 }}>No people found for "{query}"</Text>
          </View>
        ) : (
          <FlatList
            data={people}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(
                  `/(protected)/(tabs)/profile/${item.id}?username=${encodeURIComponent(item.username ?? '')}`
                )}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  paddingHorizontal: 16, paddingVertical: 12,
                  borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
                }}
              >
                <SupabaseImage
                  bucket="avatars"
                  path={item.avatar_url}
                  style={{ width: 48, height: 48, borderRadius: 24 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>
                    {item.full_name || 'User'}
                  </Text>
                  <Text style={{ color: '#6b7280', fontSize: 13 }}>
                    @{(item.username ?? '').toLowerCase()}
                  </Text>
                  {item.bio ? (
                    <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                      {item.bio}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ color: '#6b7280', fontSize: 12 }}>
                  {item.followers_count ?? 0} followers
                </Text>
              </Pressable>
            )}
          />
        )
      ) : (
        // Posts tab — full PostListItem with images and actions
        posts.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ color: '#6b7280', fontSize: 15 }}>No posts found for "{query}"</Text>
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={({ item, index }) => (
              <PostListItem
                post={item}
                isLastInGroup={index === posts.length - 1}
              />
            )}
          />
        )
      )}
    </View>
  );
}
