require('dotenv').config();

const express = require('express');
const cors = require('cors');

const {
  GoogleGenerativeAI,
} = require('@google/generative-ai');

const app = express();

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });

    const result = await model.generateContent(message);

    const response = result.response.text();

    res.json({
      reply: response,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: 'Something went wrong.',
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});