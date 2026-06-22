import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getAppTheme } from '../../constants/app-theme';
import { useThemePreference } from '../../contexts/theme-preference';
import { app, db } from '../../firebaseConfig';

const auth = getAuth(app);
const quizSize = 10;
const passingScore = 8;
const streakGoal = 5;
const vidiaAccent = '#6D5BFF';
const vidiaAccentAlt = '#8B5CF6';
const rewardImage = require('../../assets/images/vidia.png');

const shuffle = (items: any[]) =>
  [...items].sort(() => Math.random() - 0.5);

const getDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getPreviousDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  date.setDate(date.getDate() - 1);

  return getDateKey(date);
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { themePreference } = useThemePreference();
  const theme = getAppTheme(themePreference);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingResult, setSavingResult] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [streakDays, setStreakDays] = useState(0);

  const currentQuestion = questions[currentQuestionIndex];
  const progressPercent = questions.length
    ? ((submitted ? questions.length : currentQuestionIndex + 1) / questions.length) * 100
    : 0;

  const getScore = useCallback((selectedAnswers: Record<string, number>) =>
    questions.reduce(
      (total, question) =>
        selectedAnswers[question.id] === question.correctIndex ? total + 1 : total,
      0
    ), [questions]);

  const score = useMemo(() => getScore(answers), [answers, getScore]);
  const isWinningScore = score >= passingScore;
  const displayedStreak = isWinningScore ? Math.max(1, streakDays) : streakDays;
  const revealPercent = Math.min(displayedStreak, streakGoal) / streakGoal;

  const loadStreak = async () => {
    try {
      const user = auth.currentUser;

      if (!user) return;

      const userSnapshot = await getDoc(doc(db, 'users', user.uid));

      if (userSnapshot.exists()) {
        setStreakDays(userSnapshot.data().quizCurrentStreak || 0);
      }
    } catch (error) {
      console.log('Quiz streak load error:', error);
    }
  };

  const loadQuiz = async () => {
    setLoading(true);
    setSubmitted(false);
    setAnswers({});
    setCurrentQuestionIndex(0);

    try {
      const snapshot = await getDocs(collection(db, 'questions'));
      const activeQuestions = snapshot.docs
        .map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        .filter(
          (question: any) =>
            question.active !== false &&
            question.question &&
            Array.isArray(question.options) &&
            question.options.length >= 2
        );

      setQuestions(shuffle(activeQuestions).slice(0, quizSize));
    } catch (error) {
      console.log('Quiz load error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuiz();
    loadStreak();
  }, []);

  const recordWinningStreak = async () => {
    const todayKey = getDateKey();
    const user = auth.currentUser;

    if (!user) {
      setStreakDays(prev => Math.min(prev + 1, streakGoal));
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const userSnapshot = await getDoc(userRef);
    const data = userSnapshot.exists() ? userSnapshot.data() : {};
    const currentStreak = data.quizCurrentStreak || 0;
    const lastWinDate = data.quizLastWinDate;
    const yesterdayKey = getPreviousDateKey(todayKey);
    let nextStreak = 1;

    if (lastWinDate === todayKey) {
      nextStreak = Math.max(currentStreak, 1);
    } else if (lastWinDate === yesterdayKey) {
      nextStreak = Math.min(currentStreak + 1, streakGoal);
    }

    setStreakDays(nextStreak);

    await setDoc(
      userRef,
      {
        quizCurrentStreak: nextStreak,
        quizLastWinDate: todayKey,
        quizStreakUpdatedAt: new Date(),
      },
      { merge: true }
    );
  };

  const submitQuiz = async (finalAnswers: Record<string, number>) => {
    const finalScore = getScore(finalAnswers);

    setSavingResult(true);

    try {
      const user = auth.currentUser;

      if (user) {
        await addDoc(collection(db, 'quizResults'), {
          userId: user.uid,
          score: finalScore,
          total: questions.length,
          answers: finalAnswers,
          questionIds: questions.map(question => question.id),
          createdAt: new Date(),
        });

        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const data = userSnap.exists() ? userSnap.data() : {};

        await setDoc(
          userRef,
          {
            quizzesCompleted: (data.quizzesCompleted || 0) + 1,
            points: (data.points || 0) + (finalScore >= passingScore ? 50 : 20),
            lastQuizCompletedAt: new Date(),
          },
          { merge: true }
        );
      }

      if (finalScore >= passingScore) {
        await recordWinningStreak();
      }
    } catch (error) {
      console.log('Quiz result save error:', error);
    } finally {
      setSavingResult(false);
    }
  };

  const selectAnswer = (questionId: string, optionIndex: number) => {
    if (submitted || savingResult) return;

    const nextAnswers = {
      ...answers,
      [questionId]: optionIndex,
    };

    setAnswers(nextAnswers);

    if (currentQuestionIndex >= questions.length - 1) {
      setSubmitted(true);
      submitQuiz(nextAnswers);
      return;
    }

    setCurrentQuestionIndex(prev => prev + 1);
  };

  const resultMessage =
    score >= passingScore
      ? 'Sharp work. You are locked in.'
      : score >= 5
        ? 'Solid run. Tighten the weak spots.'
        : 'Good start. Run another set and build the edge.';

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <TouchableOpacity
          activeOpacity={0.75}
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={34} color={theme.muted} />
        </TouchableOpacity>

        <View style={styles.progressCluster}>
          <View style={styles.headerIcon}>
            <Ionicons name="extension-puzzle" size={30} color="#FFFFFF" />
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(progressPercent, 100)}%` },
              ]}
            />
          </View>

          <Text style={[styles.progressText, { color: theme.text }]}>
            {questions.length ? Math.min(currentQuestionIndex + 1, questions.length) : 0}/
            {questions.length || quizSize}
          </Text>
        </View>
      </View>

      {questions.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
          ]}
        >
          <Ionicons name="reader-outline" size={36} color={theme.muted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No questions yet</Text>
          <Text style={[styles.emptyText, { color: theme.muted }]}>
            Add questions from the admin panel to start quiz sessions.
          </Text>
        </View>
      ) : submitted ? (
        <View style={styles.resultWrap}>
          {isWinningScore ? (
            <View style={styles.winHero}>
              <View style={styles.datePill}>
                <Text style={styles.dateDay}>{new Date().getDate()}</Text>
                <Text style={styles.dateMonth}>
                  {new Date().toLocaleString('default', { month: 'short' })}
                </Text>
              </View>

              <View style={styles.trophyBadge}>
                <Ionicons name="trophy" size={38} color="#FFD166" />
              </View>

              <View style={styles.rewardFrame}>
                <Image source={rewardImage} style={styles.rewardImage} resizeMode="cover" />
                {revealPercent < 1 && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.rewardCover,
                      { height: `${(1 - revealPercent) * 100}%` },
                    ]}
                  />
                )}
              </View>

              <Text style={styles.congratsTitle}>
                {revealPercent >= 1 ? 'Congrats!' : 'Great Score!'}
              </Text>
              <Text style={styles.congratsText}>
                {revealPercent >= 1
                  ? "You've unlocked the full picture of the week."
                  : `Picture reveal: ${displayedStreak}/${streakGoal} winning days.`}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.resultCard,
                { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.resultKicker, { color: theme.warning }]}>Keep Going</Text>
              <Text style={[styles.resultScore, { color: theme.text }]}>
                {score}/{questions.length}
              </Text>
              <Text style={[styles.resultTitle, { color: theme.text }]}>{resultMessage}</Text>
              <Text style={[styles.resultQuote, { color: theme.muted }]}>
                Success is the sum of small efforts, repeated day in and day out.
              </Text>
              {savingResult && (
                <ActivityIndicator style={styles.savingSpinner} color={theme.primary} />
              )}
            </View>
          )}

          <View
            style={[
              styles.answersCard,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.answersTitle, { color: theme.text }]}>
              Correct Answers
            </Text>

            {questions.map((question, index) => {
              const selectedIndex = answers[question.id];
              const correctIndex = question.correctIndex;
              const isCorrect = selectedIndex === correctIndex;
              const selectedAnswer =
                typeof selectedIndex === 'number'
                  ? question.options[selectedIndex]
                  : 'No answer selected';
              const correctAnswer = question.options[correctIndex];

              return (
                <View
                  key={question.id}
                  style={[
                    styles.answerReview,
                    { borderColor: theme.border },
                  ]}
                >
                  <View style={styles.answerReviewTop}>
                    <Text style={[styles.answerNumber, { color: theme.muted }]}>
                      Question {index + 1}
                    </Text>
                    <Ionicons
                      name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                      size={22}
                      color={isCorrect ? theme.primary : theme.danger}
                    />
                  </View>

                  <Text style={[styles.reviewQuestion, { color: theme.text }]}>
                    {question.question}
                  </Text>
                  <Text style={[styles.reviewLine, { color: theme.muted }]}>
                    Your answer: {selectedAnswer}
                  </Text>
                  <Text style={[styles.reviewLine, { color: theme.text }]}>
                    Correct answer: {correctAnswer}
                  </Text>
                  {!!question.explanation && (
                    <Text style={[styles.reviewExplanation, { color: theme.subtle }]}>
                      {question.explanation}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={loadQuiz}
            activeOpacity={0.86}
          >
            <Text style={styles.primaryButtonText}>
              {isWinningScore ? 'Do More Questions' : 'Try Again'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.questionCard}>
            <View style={styles.questionTopRow}>
              <Text style={styles.questionMeta}>
                Question {currentQuestionIndex + 1}/{questions.length}
              </Text>
            </View>

            <View style={styles.questionPrompt}>
              <Text
                style={styles.questionText}
                numberOfLines={6}
                adjustsFontSizeToFit
                minimumFontScale={0.62}
              >
                {currentQuestion?.question}
              </Text>
            </View>
          </View>

          <View style={styles.optionsStack}>
            {currentQuestion?.options.map((option: string, optionIndex: number) => (
              <TouchableOpacity
                key={`${currentQuestion.id}-${option}`}
                activeOpacity={0.82}
                style={styles.optionButton}
                onPress={() => selectAnswer(currentQuestion.id, optionIndex)}
              >
                <Text
                  style={styles.optionText}
                  numberOfLines={3}
                  adjustsFontSizeToFit
                  minimumFontScale={0.68}
                >
                  {String.fromCharCode(65 + optionIndex)}. {option}
                </Text>
              </TouchableOpacity>
            ))}

            {savingResult && (
              <ActivityIndicator style={styles.savingSpinner} color={theme.primary} />
            )}
          </View>

          <View style={styles.quizFooter}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={loadQuiz}
              activeOpacity={0.86}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.muted }]}>
                Restart Quiz
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },

  content: {
    padding: 18,
    paddingTop: 26,
    paddingBottom: 104,
  },

  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  backButton: {
    width: 46,
    height: 46,
    justifyContent: 'center',
  },

  progressCluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingRight: 46,
  },

  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: vidiaAccent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  progressTrack: {
    width: 92,
    height: 14,
    borderRadius: 999,
    backgroundColor: '#3A3A3A',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: vidiaAccent,
  },

  progressText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },

  questionCard: {
    backgroundColor: vidiaAccent,
    borderRadius: 18,
    padding: 8,
    marginBottom: 24,
  },

  questionTopRow: {
    minHeight: 52,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  questionMeta: {
    color: '#fff',
    fontSize: 23,
    fontWeight: '900',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 1,
  },

  questionPrompt: {
    height: 210,
    borderRadius: 4,
    backgroundColor: '#202020',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },

  questionText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 1,
  },

  optionsStack: {
    gap: 12,
    paddingHorizontal: 12,
  },

  optionButton: {
    height: 68,
    backgroundColor: '#242424',
    borderRadius: 999,
    paddingHorizontal: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  optionText: {
    color: '#fff',
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 23,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 1,
  },

  quizFooter: {
    marginTop: 26,
    alignItems: 'center',
  },

  secondaryButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },

  secondaryButtonText: {
    fontWeight: '800',
  },

  resultWrap: {
    gap: 16,
  },

  winHero: {
    alignItems: 'center',
    paddingTop: 8,
  },

  datePill: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: vidiaAccent,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 34,
  },

  dateDay: {
    backgroundColor: vidiaAccent,
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    paddingHorizontal: 12,
    paddingVertical: 8,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 1,
  },

  dateMonth: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    paddingHorizontal: 12,
    paddingVertical: 12,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 1,
  },

  trophyBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 70,
    height: 70,
    borderRadius: 14,
    backgroundColor: '#2A255C',
    alignItems: 'center',
    justifyContent: 'center',
  },

  rewardFrame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 22,
    borderWidth: 12,
    borderColor: vidiaAccentAlt,
    overflow: 'hidden',
    backgroundColor: '#202020',
  },

  rewardImage: {
    width: '100%',
    height: '100%',
  },

  rewardCover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(18,18,18,0.88)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },

  congratsTitle: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '900',
    marginTop: 34,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 1,
  },

  congratsText: {
    color: '#fff',
    fontSize: 24,
    lineHeight: 32,
    marginTop: 12,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 1,
  },

  resultCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 22,
    alignItems: 'center',
  },

  resultKicker: {
    color: '#7CFFB2',
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  resultScore: {
    color: '#fff',
    fontSize: 54,
    fontWeight: '900',
    marginTop: 8,
  },

  resultTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },

  resultText: {
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },

  resultQuote: {
    color: '#999',
    fontSize: 16,
    lineHeight: 23,
    marginTop: 14,
    textAlign: 'center',
  },

  answersCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 16,
  },

  answersTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 12,
  },

  answerReview: {
    borderTopWidth: 1,
    borderColor: '#292929',
    paddingVertical: 14,
  },

  answerReviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  answerNumber: {
    color: '#888',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  reviewQuestion: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
    marginBottom: 8,
  },

  reviewLine: {
    color: '#fff',
    lineHeight: 20,
    marginTop: 4,
  },

  reviewExplanation: {
    color: '#AAA',
    lineHeight: 20,
    marginTop: 8,
  },

  primaryButton: {
    minHeight: 58,
    borderRadius: 999,
    backgroundColor: '#7CFFB2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    color: '#121212',
    fontWeight: '900',
    fontSize: 16,
  },

  savingSpinner: {
    marginTop: 16,
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
    marginTop: 12,
  },

  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
});
