require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
      }
    });

    const topic = "Math";
    const count = 5;
    const difficulty = "medium";
    
    const prompt = `You are an expert college professor creating assignment questions.
Generate ${count} ${difficulty} level multiple choice questions (MCQs) on the topic: "${topic}".
Return ONLY a strictly valid JSON array of objects. 
Do not wrap it in markdown code blocks (\`\`\`json).
Each object must have exactly four fields:
- "text" (String): The question text.
- "options" (Array of 4 Strings): The four possible answers.
- "correctOptionIndex" (Number): The index (0 to 3) of the correct answer in the options array.
- "marks" (Number): Suggested marks for this question (between 1 and 10 based on difficulty).

Example output:
[
  {
    "text": "What is the time complexity of binary search?",
    "options": ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
    "correctOptionIndex": 2,
    "marks": 5
  }
]`;

    console.log('Sending request to Gemini...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    console.log('Gemini returned:', responseText);

    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json/i, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```/i, '');
    }
    cleanedText = cleanedText.trim();
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.replace(/```$/i, '');
    }
    cleanedText = cleanedText.trim();

    let parsedJson = JSON.parse(cleanedText);
    console.log('Successfully parsed JSON:', Array.isArray(parsedJson));
  } catch (err) {
    console.error('Test script error:', err);
  }
}

test();
