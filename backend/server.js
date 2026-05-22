require('dotenv').config();

const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are Ademindset AI, a smart productivity and mindset assistant.',
        },
        {
          role: 'user',
          content: message,
        },
      ],
    });

    res.json({
      reply: response.choices[0].message.content,
    });
  } catch (error) {
    console.log(error.message);
    console.log(error.response?.data);
    console.log(error);

    res.status(500).json({
      error: 'Something went wrong.',
    });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});