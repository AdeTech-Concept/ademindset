import { StyleProp, ViewStyle } from 'react-native';

export type BookPdfReaderProps = {
  currentPage?: number;
  onError?: (error: unknown) => void;
  onLoadComplete?: (pages: number) => void;
  onPageChanged?: (page: number, pages: number) => void;
  style?: StyleProp<ViewStyle>;
  title: string;
  uri: string;
};

export default function BookPdfReader(_props: BookPdfReaderProps) {
  return null;
}
