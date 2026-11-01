/**
 * NotificationBanner — cross-platform in-app notification popup.
 *
 * Renders as an absolutely-positioned card that slides in from the top,
 * stays for 4 seconds, then slides back out. Works identically on Android
 * and web — no permissions required, no Expo Go restrictions.
 *
 * Usage:
 *   const { showBanner } = useNotificationBanner();
 *   showBanner('John posted', 'Check out their latest update');
 */
import {
  Animated,
  Pressable,
  Text,
  View,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Context ─────────────────────────────────────────────────────────────────

type BannerCtx = {
  showBanner: (title: string, body?: string, type?: 'follow' | 'post') => void;
};

const BannerContext = createContext<BannerCtx>({ showBanner: () => {} });

export const useNotificationBanner = () => useContext(BannerContext);

// ─── Provider + banner UI ─────────────────────────────────────────────────────

export function NotificationBannerProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [content, setContent] = useState<{
    title: string;
    body?: string;
    type: 'follow' | 'post';
  } | null>(null);

  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: -120,
      duration: 280,
      useNativeDriver: true,
    }).start(() => setContent(null));
  }, [translateY]);

  const showBanner = useCallback(
    (title: string, body?: string, type: 'follow' | 'post' = 'post') => {
      // Cancel any running auto-dismiss
      if (timerRef.current) clearTimeout(timerRef.current);

      setContent({ title, body, type });

      // Slide in
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
      }).start();

      // Auto-dismiss after 4 s
      timerRef.current = setTimeout(dismiss, 4000);
    },
    [translateY, dismiss]
  );

  const icon: keyof typeof Ionicons.glyphMap =
    content?.type === 'follow' ? 'person-add' : 'newspaper-outline';

  return (
    <BannerContext.Provider value={{ showBanner }}>
      {children}

      {content && (
        <Animated.View
          style={[
            styles.banner,
            {
              top: insets.top + (Platform.OS === 'web' ? 8 : 4),
              transform: [{ translateY }],
            },
          ]}
        >
          <Pressable onPress={dismiss} style={styles.inner}>
            {/* Icon */}
            <View style={styles.iconWrap}>
              <Ionicons name={icon} size={20} color="#f97316" />
            </View>

            {/* Text */}
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {content.title}
              </Text>
              {!!content.body && (
                <Text style={styles.body} numberOfLines={2}>
                  {content.body}
                </Text>
              )}
            </View>

            {/* Dismiss X */}
            <Pressable onPress={dismiss} hitSlop={10} style={{ padding: 2 }}>
              <Ionicons name="close" size={16} color="#6b7280" />
            </Pressable>
          </Pressable>
        </Animated.View>
      )}
    </BannerContext.Provider>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    // Web needs explicit elevation workaround
    ...Platform.select({
      web: { zIndex: 9999 },
      default: { elevation: 20 },
    }),
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f9731620',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 18,
  },
  body: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 17,
    marginTop: 2,
  },
});
