import { GoogleGenAI } from "@google/genai";
import { UserProfile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateFitnessRoutine(profile: UserProfile) {
  const prompt = `
    Generate a personalized weekly fitness routine for a user with the following profile:
    - Name: ${profile.name}
    - Gender: ${profile.gender}
    - Age: ${profile.age}
    - Current Weight: ${profile.weight}kg
    - Target Weight Gain: ${profile.targetWeightGain}kg
    - Height: ${profile.height}cm
    - Goal: ${profile.goal}
    - Fitness Level: ${profile.level}
    - Available Equipment: ${profile.equipment.join(", ")}
    - Days per week: ${profile.daysPerWeek}

    Please provide the response in JSON format with the following structure:
    {
      "name": "Routine Name",
      "description": "Overall description and strategy",
      "weeklySchedule": [
        {
          "day": "Day 1",
          "focus": "Upper Body / Cardio / etc",
          "exercises": [
            {
              "name": "Exercise Name",
              "sets": 3,
              "reps": "10-12",
              "rest": "60s",
              "notes": "Brief technique tip"
            }
          ]
        }
      ],
      "dietSuggestions": [
        {
          "mealType": "Breakfast/Lunch/Dinner/Snack",
          "suggestions": ["Option 1", "Option 2"]
        }
      ]
    }
    
    Ensure the exercises are appropriate for the user's level and available equipment.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  return JSON.parse(response.text || "{}");
}
