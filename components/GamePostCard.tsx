/**
 * GamePostCard — pinned at the top of the home feed.
 * Looks like a real post but tapping it opens the game.
 * Users can like it and tap the comment icon to see comments/leaderboard feel.
 */
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';

const ORANGE = '#f97316';

export default function GamePostCard() {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(142);

  const handleLike = () => {
    setLiked(v => !v);
    setLikeCount(c => liked ? c - 1 : c + 1);
  };

  return (
    <Pressable
      onPress={() => router.push('/game')}
      style={styles.card}
    >
      {/* Author row */}
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.avatarImg}
            resizeMode="contain"
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>SoshoBird</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>GAME</Text>
            </View>
            <View style={styles.pinnedBadge}>
              <Ionicons name="pin" size={10} color="#f97316" />
              <Text style={styles.pinnedText}>Pinned</Text>
            </View>
          </View>
          <Text style={styles.handle}>@soshobird</Text>
        </View>
        <Ionicons name="game-controller-outline" size={20} color={ORANGE} />
      </View>

      {/* Content */}
      <Text style={styles.content}>
        Can you beat the high score? Fly through obstacles, collect power coins
        and dodge incoming planes. How far can you go?
      </Text>

      {/* Game preview banner */}
      <Pressable
        onPress={() => router.push('/game')}
        style={styles.banner}
      >
        <View style={styles.bannerLeft}>
          <Ionicons name="game-controller" size={28} color={ORANGE} />
          <View>
            <Text style={styles.bannerTitle}>SoshoBird Game</Text>
            <Text style={styles.bannerSub}>Tap to play now</Text>
          </View>
        </View>
        <View style={styles.playBtn}>
          <Ionicons name="play" size={18} color="#fff" />
        </View>
      </Pressable>

      {/* Action row — like + comment */}
      <View style={styles.actions}>
        <Pressable
          onPress={(e) => { e.stopPropagation(); handleLike(); }}
          style={styles.action}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={20}
            color={liked ? ORANGE : '#6b7280'}
          />
          <Text style={[styles.actionText, liked && { color: ORANGE }]}>
            {likeCount}
          </Text>
        </Pressable>

        <Pressable
          onPress={(e) => { e.stopPropagation(); router.push('/game'); }}
          style={styles.action}
        >
          <Ionicons name="chatbubble-outline" size={19} color="#6b7280" />
          <Text style={styles.actionText}>Play</Text>
        </Pressable>

        <Pressable
          onPress={(e) => { e.stopPropagation(); router.push('/game'); }}
          style={styles.action}
        >
          <Feather name="award" size={19} color="#6b7280" />
          <Text style={styles.actionText}>Leaderboard</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#141414',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  name: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  badge: {
    backgroundColor: '#f97316',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#f9731620',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  pinnedText: {
    color: '#f97316',
    fontSize: 9,
    fontWeight: '700',
  },
  handle: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 1,
  },
  content: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 20,
  },
  banner: {
    backgroundColor: '#060d1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f97316',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  bannerSub: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingTop: 2,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    color: '#6b7280',
    fontSize: 13,
  },
});
