import { createElement } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

type BookPdfReaderProps = {
  title: string;
  uri: string;
  style?: StyleProp<ViewStyle>;
};

export default function BookPdfReader({ title, uri, style }: BookPdfReaderProps) {
  return (
    <View style={style}>
      {createElement('iframe', {
        src: uri,
        title,
        style: {
          width: '100%',
          height: '100%',
          border: 0,
          backgroundColor: '#fff',
        },
      })}
    </View>
  );
}
