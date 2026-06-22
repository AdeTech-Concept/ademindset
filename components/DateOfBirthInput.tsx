import { useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type DateOfBirthInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholderTextColor: string;
  inputStyle: any;
  textColor: string;
  borderColor: string;
  surfaceColor: string;
};

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, index) => currentYear - index);
const months = Array.from({ length: 12 }, (_, index) => index + 1);
const days = Array.from({ length: 31 }, (_, index) => index + 1);

const pad = (value: number) => String(value).padStart(2, '0');

const splitDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);

  return {
    year: year || currentYear - 18,
    month: month || 1,
    day: day || 1,
  };
};

export default function DateOfBirthInput({
  value,
  onChange,
  placeholderTextColor,
  inputStyle,
  textColor,
  borderColor,
  surfaceColor,
}: DateOfBirthInputProps) {
  const [open, setOpen] = useState(false);
  const initial = splitDate(value);
  const [selectedYear, setSelectedYear] = useState(initial.year);
  const [selectedMonth, setSelectedMonth] = useState(initial.month);
  const [selectedDay, setSelectedDay] = useState(initial.day);

  if (Platform.OS === 'web') {
    const WebTextInput = TextInput as any;

    return (
      <WebTextInput
        type="date"
        placeholder="Date of birth"
        placeholderTextColor={placeholderTextColor}
        style={inputStyle}
        value={value}
        onChangeText={onChange}
      />
    );
  }

  const saveDate = () => {
    onChange(`${selectedYear}-${pad(selectedMonth)}-${pad(selectedDay)}`);
    setOpen(false);
  };

  const renderOption = (
    item: number,
    selected: boolean,
    onPress: () => void,
    label = String(item)
  ) => (
    <TouchableOpacity
      key={label}
      style={[styles.option, selected && styles.optionActive]}
      onPress={onPress}
    >
      <Text style={[styles.optionText, selected && styles.optionTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        style={[inputStyle, styles.touchInput, { borderColor }]}
        onPress={() => setOpen(true)}
      >
        <Text style={{ color: value ? textColor : placeholderTextColor }}>
          {value || 'Date of birth'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.title, { color: textColor }]}>Select Date of Birth</Text>

            <View style={styles.columns}>
              <ScrollView style={styles.column} showsVerticalScrollIndicator={false}>
                {days.map(day =>
                  renderOption(day, day === selectedDay, () => setSelectedDay(day), pad(day))
                )}
              </ScrollView>

              <ScrollView style={styles.column} showsVerticalScrollIndicator={false}>
                {months.map(month =>
                  renderOption(
                    month,
                    month === selectedMonth,
                    () => setSelectedMonth(month),
                    pad(month)
                  )
                )}
              </ScrollView>

              <ScrollView style={styles.column} showsVerticalScrollIndicator={false}>
                {years.map(year =>
                  renderOption(year, year === selectedYear, () => setSelectedYear(year))
                )}
              </ScrollView>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={saveDate}>
                <Text style={styles.saveText}>Use Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  touchInput: {
    justifyContent: 'center',
  },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    padding: 20,
  },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 14,
    textAlign: 'center',
  },

  columns: {
    flexDirection: 'row',
    gap: 8,
    height: 260,
  },

  column: {
    flex: 1,
  },

  option: {
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: 7,
    backgroundColor: '#242424',
  },

  optionActive: {
    backgroundColor: '#7CFFB2',
  },

  optionText: {
    color: '#fff',
    fontWeight: '900',
  },

  optionTextActive: {
    color: '#121212',
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  cancelBtn: {
    flex: 1,
    borderRadius: 13,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#242424',
  },

  cancelText: {
    color: '#fff',
    fontWeight: '900',
  },

  saveBtn: {
    flex: 1,
    borderRadius: 13,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#7CFFB2',
  },

  saveText: {
    color: '#121212',
    fontWeight: '900',
  },
});
