import { Animated, Pressable, View, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useRef, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Exported so screens can call it to hide/show the tab bar
let _hideTabBar: (() => void) | null = null;
let _showTabBar: (() => void) | null = null;

export function hideTabBar() { _hideTabBar?.(); }
export function showTabBar() { _showTabBar?.(); }

const TAB_HEIGHT = 56;

export default function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;

  // Register hide/show globally
  _hideTabBar = useCallback(() => {
    Animated.spring(translateY, {
      toValue: TAB_HEIGHT + insets.bottom,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  }, [translateY, insets.bottom]);

  _showTabBar = useCallback(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [translateY]);

  const icons: Record<string, keyof typeof Feather.glyphMap> = {
    '(home)':      'home',
    discover:      'compass',
    plus:          'plus',
    notifications: 'heart',
    profile:       'user',
  };

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          paddingBottom: insets.bottom || 8,
          height: TAB_HEIGHT + (insets.bottom || 8),
          transform: [{ translateY }],
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const icon = icons[route.name] ?? 'circle';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tab}
            hitSlop={8}
          >
            <Feather
              name={icon}
              size={24}
              color={focused ? '#f97316' : '#6b7280'}
            />
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#0f0f0f',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2a2a',
    // web shadow
    ...Platform.select({
      web: { boxShadow: '0 -2px 12px rgba(0,0,0,0.4)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 12,
      },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
});
