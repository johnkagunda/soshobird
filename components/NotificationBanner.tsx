/**
 * NotificationBanner — cross-platform in-app notification popup.
 *
 * Android: uses RootSibling (react-native-root-siblings) to render
 *          outside the normal view hierarchy, so it appears over everything.
 * Web:     uses position:fixed so it always floats at the top of the viewport.
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
import RootSiblings from 'react-native-root-siblings';

// ─── Context ──────────────────────────────────────────────────────────────────

type BannerCtx = {
  showBanner: (title: string, body?: string, type?: 'follow' | 'post') => void;
};

const BannerContext = createContext<BannerCtx>({ showBanner: () => {} });
export const useNotificationBanner = () => useContext(BannerContext);

// ─── The visual banner ────────────────────────────────────────────────────────

function BannerView({
  title,
  body,
  type,
  topOffset,
  onDismiss,
}: {
  title: string;
  body?: string;
  type: 'follow' | 'post';
  topOffset: number;
  onDismiss: () => void;
}) {
  const translateY = useRef(new Animated.Value(-140)).current;
  const icon: keyof typeof Ionicons.glyphMap =
    type === 'follow' ? 'person-add' : 'newspaper-outline';

  // Slide in on mount
  useRef(
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: Platform.OS !== 'web',
      bounciness: 5,
    }).start()
  );

  const handleDismiss = () => {
    Animated.timing(translateY, {
      toValue: -140,
      duration: 260,
      useNativeDriver: Platform.OS !== 'web',
    }).start(onDismiss);
  };

  return (
    <Animated.View
      style={[
        styles.banner,
        Platform.OS === 'web'
          ? ({ position: 'fixed', top: topOffset } as any)
          : { position: 'absolute', top: topOffset },
        { transform: [{ translateY }] },
      ]}
    >
      <Pressable onPress={handleDismiss} style={styles.inner}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={20} color="#f97316" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {!!body && (
            <Text style={styles.body} numberOfLines={2}>{body}</Text>
          )}
        </View>

        <Pressable onPress={handleDismiss} hitSlop={10} style={{ padding: 2 }}>
          <Ionicons name="close" size={16} color="#6b7280" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NotificationBannerProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const siblingRef = useRef<RootSiblings | null>(null);
  const topOffset = insets.top + 8;

  // Web: use state to render inline (position:fixed handles the overlay)
  const [webContent, setWebContent] = useState<{
    title: string; body?: string; type: 'follow' | 'post';
  } | null>(null);

  const dismissWeb = useCallback(() => setWebContent(null), []);

  const showBanner = useCallback(
    (title: string, body?: string, type: 'follow' | 'post' = 'post') => {
      if (timerRef.current) clearTimeout(timerRef.current);

      if (Platform.OS === 'web') {
        // Web: render via state (position:fixed floats over everything)
        setWebContent({ title, body, type });
        timerRef.current = setTimeout(dismissWeb, 4500);
      } else {
        // Native: render via RootSiblings so it appears above navigation
        siblingRef.current?.destroy();
        const sibling = new RootSiblings(
          <BannerView
            title={title}
            body={body}
            type={type}
            topOffset={topOffset}
            onDismiss={() => sibling.destroy()}
          />
        );
        siblingRef.current = sibling;
        timerRef.current = setTimeout(() => sibling.destroy(), 4500);
      }
    },
    [topOffset, dismissWeb]
  );

  return (
    <BannerContext.Provider value={{ showBanner }}>
      {children}

      {/* Web banner — position:fixed handles the overlay */}
      {Platform.OS === 'web' && webContent && (
        <BannerView
          title={webContent.title}
          body={webContent.body}
          type={webContent.type}
          topOffset={topOffset}
          onDismiss={dismissWeb}
        />
      )}
    </BannerContext.Provider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  banner: {
    left: 12,
    right: 12,
    zIndex: 99999,
    elevation: 99999,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1c1c1c',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#f97316',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f9731622',
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
