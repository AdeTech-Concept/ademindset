import { Ionicons } from '@expo/vector-icons';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getAppTheme } from '../constants/app-theme';
import { useThemePreference } from './theme-preference';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AppAlertState = {
  title: string;
  message?: string;
  buttons: AlertButton[];
};

type AppAlertContextValue = {
  showAlert: (
    title: string,
    message?: string,
    buttons?: AlertButton[]
  ) => void;
};

const AppAlertContext = createContext<AppAlertContextValue | null>(null);

let appAlertHandler: AppAlertContextValue['showAlert'] | null = null;

export function showAppAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[]
) {
  if (appAlertHandler) {
    appAlertHandler(title, message, buttons);
    return;
  }

  console.log([title, message].filter(Boolean).join(': '));
}

export function AppAlertProvider({ children }: { children: ReactNode }) {
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);
  const [alertState, setAlertState] = useState<AppAlertState | null>(null);

  const showAlert = useCallback(
    (title: string, message?: string, buttons?: AlertButton[]) => {
      setAlertState({
        title,
        message,
        buttons: buttons?.length ? buttons : [{ text: 'OK' }],
      });
    },
    []
  );

  useEffect(() => {
    appAlertHandler = showAlert;

    return () => {
      appAlertHandler = null;
    };
  }, [showAlert]);

  const value = useMemo(() => ({ showAlert }), [showAlert]);

  const closeAlert = (button?: AlertButton) => {
    setAlertState(null);
    button?.onPress?.();
  };

  const iconName =
    alertState?.buttons.some(button => button.style === 'destructive')
      ? 'warning-outline'
      : 'information-circle-outline';

  return (
    <AppAlertContext.Provider value={value}>
      {children}

      <Modal
        transparent
        animationType="fade"
        visible={!!alertState}
        onRequestClose={() => setAlertState(null)}
      >
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={iconName} size={28} color="#121212" />
            </View>

            <Text style={[styles.title, { color: theme.text }]}>
              {alertState?.title}
            </Text>

            {!!alertState?.message && (
              <Text style={[styles.message, { color: theme.muted }]}>
                {alertState.message}
              </Text>
            )}

            <View style={styles.actions}>
              {alertState?.buttons.map((button, index) => {
                const isCancel = button.style === 'cancel';
                const isDestructive = button.style === 'destructive';

                return (
                  <TouchableOpacity
                    key={`${button.text || 'OK'}-${index}`}
                    activeOpacity={0.85}
                    style={[
                      styles.button,
                      {
                        backgroundColor: isCancel
                          ? theme.surfaceAlt
                          : isDestructive
                            ? theme.danger
                            : theme.primary,
                      },
                    ]}
                    onPress={() => closeAlert(button)}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        { color: isCancel ? theme.text : theme.primaryText },
                      ]}
                    >
                      {button.text || 'OK'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AppAlertContext.Provider>
  );
}

export function useAppAlert() {
  const context = useContext(AppAlertContext);

  if (!context) {
    throw new Error('useAppAlert must be used inside AppAlertProvider');
  }

  return context;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },

  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
  },

  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#8BE0B0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  title: {
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
  },

  message: {
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 21,
  },

  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },

  button: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  buttonText: {
    fontWeight: '900',
  },
});
