import Constants from 'expo-constants';
import { StyleProp, ViewStyle } from 'react-native';

type BookPdfReaderProps = {
  currentPage: number;
  onError: (error: unknown) => void;
  onLoadComplete: (pages: number) => void;
  onPageChanged: (page: number, pages: number) => void;
  style?: StyleProp<ViewStyle>;
  title: string;
  uri: string;
};

const getNativePdf = () => {
  if (Constants.appOwnership === 'expo') return null;

  try {
    // Native PDF rendering is only available in development/production builds.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-pdf').default;
  } catch (error) {
    console.log('PDF module unavailable:', error);
    return null;
  }
};

export default function BookPdfReader({
  currentPage,
  onError,
  onLoadComplete,
  onPageChanged,
  style,
  uri,
}: BookPdfReaderProps) {
  const NativePdf = getNativePdf();

  if (!NativePdf) return null;

  return (
    <NativePdf
      source={{ uri, cache: true }}
      page={currentPage}
      trustAllCerts={false}
      enablePaging={false}
      spacing={8}
      style={style}
      onLoadComplete={onLoadComplete}
      onPageChanged={onPageChanged}
      onError={onError}
    />
  );
}
