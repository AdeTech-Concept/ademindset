import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

export default function PostCard({
  item,
  onLike,
  onSave,
  onRemoveLike,
  onRemoveSave,
  showRemoveLike,
  showRemoveSave,
}: any) {
  const router = useRouter();
  const [lastTap, setLastTap] = useState<any>(null);

  const handleDoubleTap = () => {
    const now = Date.now();

    if (lastTap && now - lastTap < 300 && onLike) {
      onLike(item.id);
    }

    setLastTap(now);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.card}
      onPress={() => router.push(`/post/${item.id}`)}
    >
      {item.image_url && (
        <TouchableWithoutFeedback onPress={handleDoubleTap}>
          <View style={styles.imageWrap}>
            <Image
              source={{ uri: item.image_url }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        </TouchableWithoutFeedback>
      )}

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>

          {item.pinned && (
            <View style={styles.pinBadge}>
              <Ionicons name="pin" size={13} color="#121212" />
              <Text style={styles.pinText}>Pinned</Text>
            </View>
          )}
        </View>

        {!!item.caption && (
          <Text style={styles.caption} numberOfLines={2}>
            {item.caption}
          </Text>
        )}

        <View style={styles.actions}>
          <ActionButton
            icon={item.liked || showRemoveLike ? 'heart' : 'heart-outline'}
            label={showRemoveLike ? 'Remove' : 'Like'}
            active={item.liked || showRemoveLike}
            activeColor="#FF4D67"
            onPress={() =>
              showRemoveLike
                ? onRemoveLike && onRemoveLike(item.id)
                : onLike && onLike(item.id)
            }
          />

          <ActionButton
            icon={item.saved || showRemoveSave ? 'bookmark' : 'bookmark-outline'}
            label={showRemoveSave ? 'Remove' : 'Save'}
            active={item.saved || showRemoveSave}
            activeColor="#FFD166"
            onPress={() =>
              showRemoveSave
                ? onRemoveSave && onRemoveSave(item.id)
                : onSave && onSave(item.id)
            }
          />

          <ActionButton
            icon="chatbubble-outline"
            label="Open"
            active={false}
            activeColor="#7CFFB2"
            onPress={() => router.push(`/post/${item.id}`)}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ActionButton({ icon, label, active, activeColor, onPress }: any) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.actionButton,
        active && { backgroundColor: `${activeColor}22` },
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={19}
        color={active ? activeColor : '#999'}
      />
      <Text style={[styles.actionLabel, active && { color: activeColor }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#292929',
  },

  imageWrap: {
    backgroundColor: '#0F0F0F',
  },

  image: {
    width: '100%',
    height: 230,
  },

  content: {
    padding: 15,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },

  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },

  pinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7CFFB2',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },

  pinText: {
    color: '#121212',
    fontSize: 11,
    fontWeight: '800',
  },

  caption: {
    color: '#AAA',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },

  actionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#242424',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  actionLabel: {
    color: '#999',
    fontWeight: '800',
    fontSize: 13,
  },
});
