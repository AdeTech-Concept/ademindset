import { showAppAlert } from '../../contexts/app-alert';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { app, db } from '../../firebaseConfig';

const auth = getAuth(app);
const adminEmail = 'josh0mathew@gmail.com';

const blankOptions = ['', '', '', ''];

const getErrorMessage = (error: any) =>
  error?.code
    ? `${error.code}: ${error.message || 'Unknown Firebase error'}`
    : error?.message || 'Unknown error';

export default function AdminQuestionsScreen() {
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('');
  const [options, setOptions] = useState(blankOptions);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.email !== adminEmail) {
      showAppAlert('Access denied', 'Only the admin can open this page.');
      router.replace('/(tabs)');
      return;
    }

    fetchQuestions();
  }, [router]);

  const fetchQuestions = async () => {
    setLoading(true);

    try {
      const questionsQuery = query(
        collection(db, 'questions'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(questionsQuery);
      const data = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      setQuestions(data);
    } catch (error) {
      console.log('Questions load error:', error);
      showAppAlert('Error', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const updateOption = (value: string, index: number) => {
    setOptions(prev =>
      prev.map((option, optionIndex) =>
        optionIndex === index ? value : option
      )
    );
  };

  const resetForm = () => {
    setQuestion('');
    setCategory('');
    setOptions(blankOptions);
    setCorrectIndex(0);
    setExplanation('');
    setEditingQuestionId(null);
  };

  const startEditQuestion = (item: any) => {
    const nextOptions = [...blankOptions];

    (item.options || []).slice(0, 4).forEach((option: string, index: number) => {
      nextOptions[index] = option;
    });

    setEditingQuestionId(item.id);
    setQuestion(item.question || '');
    setCategory(item.category || '');
    setOptions(nextOptions);
    setCorrectIndex(item.correctIndex || 0);
    setExplanation(item.explanation || '');
  };

  const saveQuestion = async () => {
    const cleanedOptions = options.map(option => option.trim());

    if (!question.trim()) {
      showAppAlert('Missing question', 'Write the question first.');
      return;
    }

    if (cleanedOptions.some(option => !option)) {
      showAppAlert('Missing choices', 'Fill all four answer choices.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        question: question.trim(),
        category: category.trim(),
        options: cleanedOptions,
        correctIndex,
        explanation: explanation.trim(),
        active: true,
        updatedAt: new Date(),
      };

      if (editingQuestionId) {
        await updateDoc(doc(db, 'questions', editingQuestionId), payload);
      } else {
        await addDoc(collection(db, 'questions'), {
          ...payload,
          createdAt: new Date(),
        });
      }

      resetForm();
      await fetchQuestions();
      showAppAlert(
        'Saved',
        editingQuestionId
          ? 'Question updated.'
          : 'Question added to the quiz bank.'
      );
    } catch (error) {
      console.log('Question save error:', error);
      showAppAlert(
        editingQuestionId
          ? 'Could not update question'
          : 'Could not save question',
        getErrorMessage(error)
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleQuestion = async (item: any) => {
    try {
      await updateDoc(doc(db, 'questions', item.id), {
        active: item.active === false,
      });

      setQuestions(prev =>
        prev.map(questionItem =>
          questionItem.id === item.id
            ? { ...questionItem, active: item.active === false }
            : questionItem
        )
      );
    } catch (error) {
      console.log('Question toggle error:', error);
      showAppAlert('Could not update question', getErrorMessage(error));
    }
  };

  const removeQuestion = (questionId: string) => {
    showAppAlert('Delete Question', 'Remove this question from the bank?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'questions', questionId));
            setQuestions(prev =>
              prev.filter(questionItem => questionItem.id !== questionId)
            );
          } catch (error) {
            console.log('Question delete error:', error);
            showAppAlert('Could not delete question', getErrorMessage(error));
          }
        },
      },
    ]);
  };

  const activeCount = questions.filter(item => item.active !== false).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="help-buoy-outline" size={26} color="#121212" />
        </View>

        <View>
          <Text style={styles.eyebrow}>Quiz Studio</Text>
          <Text style={styles.title}>Questions</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{questions.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <View style={styles.formTitleRow}>
          <Text style={styles.sectionTitle}>
            {editingQuestionId ? 'Edit Question' : 'Add Question'}
          </Text>

          {editingQuestionId && (
            <TouchableOpacity style={styles.cancelEditBtn} onPress={resetForm}>
              <Text style={styles.cancelEditText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        <TextInput
          placeholder="Question..."
          placeholderTextColor="#888"
          style={styles.questionInput}
          value={question}
          onChangeText={setQuestion}
          multiline
        />

        <TextInput
          placeholder="Category, e.g. Discipline"
          placeholderTextColor="#888"
          style={styles.input}
          value={category}
          onChangeText={setCategory}
        />

        {options.map((option, index) => (
          <View key={`option-${index}`} style={styles.optionRow}>
            <TouchableOpacity
              style={[
                styles.correctPicker,
                correctIndex === index && styles.correctPickerActive,
              ]}
              onPress={() => setCorrectIndex(index)}
            >
              <Text
                style={[
                  styles.correctPickerText,
                  correctIndex === index && styles.correctPickerTextActive,
                ]}
              >
                {String.fromCharCode(65 + index)}
              </Text>
            </TouchableOpacity>

            <TextInput
              placeholder={`Answer ${String.fromCharCode(65 + index)}`}
              placeholderTextColor="#888"
              style={styles.optionInput}
              value={option}
              onChangeText={value => updateOption(value, index)}
            />
          </View>
        ))}

        <TextInput
          placeholder="Optional explanation shown after results..."
          placeholderTextColor="#888"
          style={styles.explanationInput}
          value={explanation}
          onChangeText={setExplanation}
          multiline
        />

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.disabledButton]}
          onPress={saveQuestion}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#121212" />
          ) : (
            <>
              <Ionicons
                name={
                  editingQuestionId
                    ? 'checkmark-circle-outline'
                    : 'add-circle-outline'
                }
                size={20}
                color="#121212"
              />
              <Text style={styles.saveButtonText}>
                {editingQuestionId ? 'Update Question' : 'Save Question'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Question Bank</Text>

        {loading ? (
          <ActivityIndicator color="#7CFFB2" />
        ) : questions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No questions yet</Text>
            <Text style={styles.emptyText}>
              Add at least 10 active questions for full quiz sessions.
            </Text>
          </View>
        ) : (
          questions.map(item => (
            <View key={item.id} style={styles.questionCard}>
              <View style={styles.questionTopRow}>
                <View style={styles.questionCopy}>
                  <Text style={styles.questionText}>{item.question}</Text>
                  <Text style={styles.questionMeta}>
                    {item.category || 'General'} - Correct:{' '}
                    {String.fromCharCode(65 + (item.correctIndex || 0))}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    item.active === false && styles.statusBadgeOff,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      item.active === false && styles.statusTextOff,
                    ]}
                  >
                    {item.active === false ? 'Off' : 'Live'}
                  </Text>
                </View>
              </View>

              <View style={styles.bankActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => startEditQuestion(item)}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => toggleQuestion(item)}
                >
                  <Text style={styles.secondaryButtonText}>
                    {item.active === false ? 'Activate' : 'Pause'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removeQuestion(item.id)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },

  content: {
    padding: 20,
    paddingTop: 64,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#7CFFB2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  eyebrow: {
    color: '#7CFFB2',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 14,
  },

  statNumber: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
  },

  statLabel: {
    color: '#888',
    fontWeight: '800',
    marginTop: 3,
  },

  formCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 16,
    marginBottom: 24,
  },

  section: {
    gap: 12,
  },

  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12,
  },

  formTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  cancelEditBtn: {
    backgroundColor: '#242424',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 12,
  },

  cancelEditText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },

  input: {
    backgroundColor: '#242424',
    color: '#fff',
    padding: 15,
    borderRadius: 14,
    marginBottom: 12,
  },

  questionInput: {
    backgroundColor: '#242424',
    color: '#fff',
    padding: 15,
    borderRadius: 14,
    marginBottom: 12,
    minHeight: 92,
    textAlignVertical: 'top',
  },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },

  correctPicker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },

  correctPickerActive: {
    backgroundColor: '#7CFFB2',
    borderColor: '#7CFFB2',
  },

  correctPickerText: {
    color: '#fff',
    fontWeight: '900',
  },

  correctPickerTextActive: {
    color: '#121212',
  },

  optionInput: {
    flex: 1,
    backgroundColor: '#242424',
    color: '#fff',
    padding: 14,
    borderRadius: 14,
  },

  explanationInput: {
    backgroundColor: '#242424',
    color: '#fff',
    padding: 15,
    borderRadius: 14,
    marginTop: 2,
    marginBottom: 12,
    minHeight: 86,
    textAlignVertical: 'top',
  },

  saveButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#7CFFB2',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  disabledButton: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: '#121212',
    fontWeight: '900',
  },

  questionCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 15,
  },

  questionTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  questionCopy: {
    flex: 1,
  },

  questionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },

  questionMeta: {
    color: '#888',
    marginTop: 6,
  },

  statusBadge: {
    backgroundColor: '#7CFFB2',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  statusBadgeOff: {
    backgroundColor: '#333',
  },

  statusText: {
    color: '#121212',
    fontSize: 11,
    fontWeight: '900',
  },

  statusTextOff: {
    color: '#999',
  },

  bankActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  secondaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    color: '#fff',
    fontWeight: '900',
  },

  editButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#182820',
    alignItems: 'center',
    justifyContent: 'center',
  },

  editButtonText: {
    color: '#7CFFB2',
    fontWeight: '900',
  },

  deleteButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#301C22',
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteButtonText: {
    color: '#FF4D67',
    fontWeight: '900',
  },

  emptyCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#292929',
  },

  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },

  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 6,
  },
});
