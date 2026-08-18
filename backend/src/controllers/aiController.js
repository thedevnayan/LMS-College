const { GoogleGenerativeAI } = require('@google/generative-ai');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const { ApiError } = require('../middleware/errorHandler');

/**
 * @desc    Generate assignment questions using Gemini AI
 * @route   POST /api/ai/generate-questions
 * @access  Private (Professor)
 */
const generateQuestions = asyncHandler(async (req, res, next) => {
  const { topic, count = 5, difficulty = 'medium' } = req.body;

  if (!topic) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Topic is required'));
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return next(new ApiError(500, 'CONFIG_ERROR', 'Gemini API key is not configured on the server.'));
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

  const prompt = `You are an expert college professor creating assignment questions.
Generate ${count} ${difficulty} level multiple choice questions (MCQs) on the topic: "${topic}".
Return ONLY a strictly valid JSON array of objects. 
Do not wrap it in markdown code blocks (\`\`\`json).
Each object must have exactly four fields:
- "text" (String): The question text.
- "options" (Array of 4 Strings): The four possible answers.
- "correctOptionIndex" (Number): The index (0 to 3) of the correct answer in the options array.
- "marks" (Number): Suggested marks for this question (between 1 and 10 based on difficulty).

Example output format:
[
  { 
    "text": "What is the primary function of the CPU?", 
    "options": ["Storage", "Processing", "Networking", "Cooling"],
    "correctOptionIndex": 1,
    "marks": 2 
  }
]`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    // Clean up potential markdown blocks if Gemini decides to include them anyway
    let cleanedText = responseText;
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```/, '');
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.replace(/```$/, '');
    }

    const questions = JSON.parse(cleanedText.trim());

    res.status(200).json(successResponse(questions, 'Questions generated successfully'));
  } catch (err) {
    console.error('Gemini Generation Error:', err);
    return next(new ApiError(500, 'AI_ERROR', 'Failed to generate questions using AI. Please try again or check your API key.'));
  }
});

module.exports = {
  generateQuestions
};
