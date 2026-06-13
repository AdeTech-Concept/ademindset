require('dotenv').config();

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
console.log('VIDIA SERVER VERSION 2026-06-13-A');
const {
  GoogleGenerativeAI,
} = require('@google/generative-ai');

const app = express();
const adminEmail = 'josh0mathew@gmail.com';
const deleteWindowMs = 30 * 24 * 60 * 60 * 1000;

app.use(cors());
app.use(express.json());

const getFirebaseCredential = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    );
  }

  const serviceAccountPath = path.resolve('serviceAccountKey.json');

  if (fs.existsSync(serviceAccountPath)) {
    return admin.credential.cert(require(serviceAccountPath));
  }

  return admin.credential.applicationDefault();
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: getFirebaseCredential(),
  });
}

const firestore = admin.firestore();

const openai = process.env.OPENAI_API_KEY ? new OpenAI() : null;
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const generateChatReply = async (message) => {
  /*if (openai) {
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      instructions:
        'You are Vidia AI, a concise, motivational assistant for the Ademindset app.',
      input: message,
    });

    return response.output_text;
  }*/

  if (genAI) {
    console.log('MODEL BEING USED:', 'gemini-2.0-flash');
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
    });
    
    
    const result = await model.generateContent(message);

    return result.response.text();
  }

  throw new Error('No AI API key configured.');
};

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7);
};

const requireSignedInUser = async (req, res, next) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({ error: 'Missing auth token.' });
    }

    req.authUser = await admin.auth().verifyIdToken(token);
    return next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({ error: 'Invalid auth token.' });
  }
};

const requireAdmin = async (req, res, next) => {
  await requireSignedInUser(req, res, () => {
    if (req.authUser.email !== adminEmail) {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    return next();
  });
};

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Message is required.',
      });
    }

    res.json({
      reply: await generateChatReply(message),
    });
  } catch (error) {
    const errorMessage = error.message || String(error);

    console.log(error);
    console.log(errorMessage);

    if (
      error.status === 401 ||
      error.code === 'invalid_api_key' ||
      errorMessage.toLowerCase().includes('incorrect api key')
    ) {
      return res.status(503).json({
        error: 'AI API key is invalid. Add a valid OPENAI_API_KEY or GEMINI_API_KEY on the backend.',
      });
    }

    if (errorMessage === 'No AI API key configured.') {
      return res.status(503).json({
        error: 'AI is not configured. Add OPENAI_API_KEY or GEMINI_API_KEY on the backend.',
      });
    }

    return res.status(500).json({
      error: 'Something went wrong.',
    });
  }
});

app.patch('/admin/users/:uid/password', requireAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters.',
      });
    }

    await admin.auth().updateUser(uid, { password });

    return res.json({ success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Could not update password.' });
  }
});

app.delete('/admin/users/:uid', requireAdmin, async (req, res) => {
  try {
    const { uid } = req.params;

    if (uid === req.authUser.uid) {
      return res.status(400).json({
        error: 'Admins cannot delete their own account here.',
      });
    }

    try {
      await admin.auth().deleteUser(uid);
    } catch (error) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    await firestore.collection('users').doc(uid).delete();

    return res.json({ success: true });
  } catch (error) {
    console.log(error.message || error);
    return res.status(500).json({
      error: error.message || 'Could not delete user.',
    });
  }
});

app.post('/users/account-deletion/request', requireSignedInUser, async (req, res) => {
  try {
    const requestedAt = new Date();
    const scheduledFor = new Date(requestedAt.getTime() + deleteWindowMs);

    await firestore.collection('users').doc(req.authUser.uid).set(
      {
        accountDeletionRequested: true,
        accountDeletionRequestedAt: admin.firestore.Timestamp.fromDate(requestedAt),
        accountDeletionScheduledFor: admin.firestore.Timestamp.fromDate(scheduledFor),
      },
      { merge: true }
    );

    return res.json({
      success: true,
      scheduledFor: scheduledFor.toISOString(),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Could not request account deletion.' });
  }
});

app.post('/maintenance/delete-scheduled-users', async (req, res) => {
  try {
    if (req.headers['x-maintenance-secret'] !== process.env.MAINTENANCE_SECRET) {
      return res.status(401).json({ error: 'Invalid maintenance secret.' });
    }

    const now = admin.firestore.Timestamp.now();
    const snapshot = await firestore
      .collection('users')
      .where('accountDeletionRequested', '==', true)
      .where('accountDeletionScheduledFor', '<=', now)
      .get();

    const deleted = [];

    for (const userDoc of snapshot.docs) {
      try {
        await admin.auth().deleteUser(userDoc.id);
      } catch (error) {
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
      }

      await userDoc.ref.delete();
      deleted.push(userDoc.id);
    }

    return res.json({ success: true, deleted });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Could not delete scheduled users.' });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
