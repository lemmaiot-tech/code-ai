import { GoogleGenAI } from "@google/genai";
import { type GeneratedFile, type GenerationResult, type ChatMessage } from '../types';

const TAILWIND_CONFIG_SCRIPT = `
<script src="https://cdn.tailwindcss.com"><\/script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          'primary': '#7C3AED',
          'secondary': '#EC4899',
          'background': '#111827',
          'surface': '#1F2937',
          'on-surface': '#F9FAFB',
          'on-surface-secondary': '#9CA3AF',
        },
        fontFamily: {
          sans: ['Inter', 'sans-serif'],
        },
      },
    },
  }
<\/script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>body { font-family: 'Inter', sans-serif; background-color: #111827; }<\/style>
`;

const getFrameworkInstructions = (scriptFramework: string, scriptLanguage: string, isJsonExpected: boolean): string => {
  const tsInstruction = scriptLanguage === 'TypeScript' ? " Use TypeScript for all logic, including defining props and state types." : "";

  switch (scriptFramework) {
    case 'HTML + CSS + JS':
      return "- **HTML + CSS + JS Project:** Generate a project with three files: `index.html`, `style.css`, and `script.js`. The HTML file must link to the CSS and JS files correctly. All styles must be in `style.css` and all JavaScript logic in `script.js`.";
    case 'React + Tailwind CSS':
      return `- **React:** Use functional components and hooks. Use JSX for templating.${tsInstruction} The component should be self-contained and ready to be used in a React application. Create a standard Vite project structure.`;
    case 'Vue + Tailwind CSS':
      return `- **Vue:** Use a single-file component structure (\`<template>\`, \`<script setup>\`, \`<style scoped>\`). Use the Composition API with \`<script setup>\`.${tsInstruction} For TypeScript, use \`<script setup lang="ts">\`. Create a standard Vite project structure.`;
    case 'Svelte + Tailwind CSS':
      return `- **Svelte:** Use a standard Svelte component structure (\`<script>\`, markup, \`<style>\`).${tsInstruction} For TypeScript, use \`<script lang="ts">\`. Create a standard SvelteKit project structure.`;
    case 'Angular + Tailwind CSS':
      return `- **Angular:** Generate files for a standalone component using inline templates and styles. Create a standard Angular CLI project structure.${tsInstruction}`;
    case 'Vanilla JS + Tailwind CSS':
      if (isJsonExpected) {
        return "- **Vanilla JS Project:** Generate a project structure with a main `index.html` and any necessary JavaScript in a separate file (e.g., `src/index.js`).";
      }
      return "- **Vanilla JS:** Generate a complete, single HTML file. Place any necessary JavaScript inside a `<script>` tag at the end of the `<body>`.";
    case 'HTML + Tailwind CSS':
    default:
      if (isJsonExpected) {
        return "- **HTML Project:** Generate a project structure with a well-formed `index.html` as the main file.";
      }
      return "- **HTML:** Ensure the output is a well-formed, single, complete HTML document starting with `<!DOCTYPE html>`.";
  }
};

const getBasePrompt = (promptType: 'image' | 'html' | 'figma' | 'url', scriptFramework: string, scriptLanguage: string) => {
    
    const promptSourceDetails = {
      image: {
        source: 'UI design image',
        instructions: ''
      },
      html: {
        source: 'HTML code',
        instructions: ''
      },
      figma: {
        source: 'UI design image and its corresponding Figma JSON data',
        instructions: `
**FIGMA JSON DATA:**
- You have been provided with a JSON object representing the Figma node for this design.
- **THIS IS THE SOURCE OF TRUTH.** Use this JSON data to get the exact values for colors, font sizes, font families, dimensions, padding, borders, etc.
- Cross-reference the visual information from the image with the precise data from the JSON to create a pixel-perfect representation.

**AUTO LAYOUT TO FLEXBOX MAPPING (CRITICAL):**
- When a node has \`layoutMode\`, it signifies a flex container. Map its properties to Tailwind CSS flexbox classes as follows:
  - \`layoutMode: 'HORIZONTAL'\` -> \`flex-row\`
  - \`layoutMode: 'VERTICAL'\` -> \`flex-col\`
  - \`primaryAxisAlignItems: 'MIN'\` -> \`justify-start\`
  - \`primaryAxisAlignItems: 'CENTER'\` -> \`justify-center\`
  - \`primaryAxisAlignItems: 'MAX'\` -> \`justify-end\`
  - \`primaryAxisAlignItems: 'SPACE_BETWEEN'\` -> \`justify-between\`
  - \`counterAxisAlignItems: 'MIN'\` -> \`items-start\`
  - \`counterAxisAlignItems: 'CENTER'\` -> \`items-center\`
  - \`counterAxisAlignItems: 'MAX'\` -> \`items-end\`
  - \`itemSpacing\` -> This is the gap between items. Use Tailwind's \`gap-*\` classes (e.g., \`itemSpacing: 16\` corresponds to \`gap-4\`).
  - \`paddingTop\`, \`paddingBottom\`, \`paddingLeft\`, \`paddingRight\` -> Use Tailwind's padding classes (\`pt-*\`, \`pb-*\`, \`pl-*\`, \`pr-*\`).
  - Child nodes with \`layoutGrow: 1\` should get the \`flex-grow\` class.
  - Child nodes with \`layoutAlign: 'STRETCH'\` in a container with the opposite direction should get the \`self-stretch\` class.`
      },
      url: {
        source: 'webpage URL',
        instructions: `
**URL CLONING & ASSET HANDLING (CRITICAL):**
1.  **Analyze and Clone:** Your primary task is to clone the webpage found at the provided URL. Use your web search capabilities to analyze its structure (HTML), styling (CSS), and layout.
2.  **Recreate UI with Tailwind:** Recreate the visual appearance and layout as closely as possible using the requested framework and **Tailwind CSS**. Focus **only** on the static UI. Do not replicate any backend logic, authentication, or dynamic data fetching.
3.  **Comprehensive CSS Processing:** You MUST analyze CSS from all possible sources on the page:
    -   External stylesheets linked via \`<link rel="stylesheet" href="...">\`.
    -   Inline style blocks within \`<style>\` tags.
    -   Inline style attributes on individual HTML elements (\`style="..."\`).
4.  **Translate to Tailwind:** Your primary goal is to translate all discovered CSS rules into the equivalent Tailwind CSS utility classes. For example, \`font-weight: 700;\` becomes \`font-bold\`, and \`display: flex;\` becomes \`flex\`.
5.  **Fallback for Complex Styles:** If you encounter complex styles that cannot be directly represented by standard Tailwind classes (e.g., unique animations, complex gradients), you MUST:
    a.  Create a separate CSS file (e.g., \`src/index.css\` or \`src/styles/custom.css\`).
    b.  Place the non-translatable custom CSS rules in this file.
    c.  Ensure this custom CSS file is correctly imported into the main application entry point (e.g., \`index.html\`, \`main.tsx\`, \`App.vue\`).
    d.  Prioritize Tailwind heavily. Only use the custom CSS file as a last resort for styles that have no Tailwind equivalent.
6.  **Asset URL Handling:** For all other assets (images, fonts, scripts, favicons):
    -   Identify every asset referenced on the page.
    -   You MUST use the asset's full, absolute URL in the generated code.
    -   If an asset path is relative (e.g., "/images/logo.png"), convert it to an absolute URL by prepending the original domain. For example, if cloning \`https://example.com/about\` and you see \`src="/images/logo.png"\`, the final URL must be \`https://example.com/images/logo.png\`.
7.  **Asset Integrity:** You MUST use the original, absolute URL for all assets as found on the source page. Do not replace any asset URLs with placeholders, even if you suspect the asset might be inaccessible. The goal is to generate a faithful clone of the page's code and its original asset references.
8.  **Generate a Complete Project:** The final output must be a complete project, not just a single component or file.`
      }
    };

    const isFrameworkExpectingJson = !['HTML + Tailwind CSS', 'Vanilla JS + Tailwind CSS'].includes(scriptFramework);
    // When cloning a URL, we always expect a JSON project structure, regardless of the selected framework.
    const isCodeAnArrayOfFiles = promptType === 'url' || isFrameworkExpectingJson;
    
    let stylingInstruction = `2.  **Tailwind CSS:** Use ONLY Tailwind CSS classes for all styling. DO NOT use any custom CSS, inline 'style' attributes, or '<style>' tags (except for Vue/Svelte scoped styles or Angular inline styles which are part of the component structure).`;
    if (scriptFramework === 'HTML + CSS + JS') {
        stylingInstruction = `2.  **Standard CSS:** Write all CSS rules in a separate \`style.css\` file. Use clean, modern, and standard CSS. **DO NOT USE TAILWIND CSS.** The HTML file should not contain any \`<style>\` blocks or inline \`style\` attributes.`;
    }

    const getOutputFormatInstruction = () => {
        if (isCodeAnArrayOfFiles) {
            return `
- You MUST provide the output as a **single JSON object** enclosed in a single markdown code block.
- The JSON object must contain two keys:
  1. \`"code"\`: An array of file objects. Each object must have two keys: \`"path"\` (e.g., "src/App.tsx") and \`"content"\`.
  2. \`"suggestions"\`: A JSON array of 3-4 concise, actionable refinement suggestion strings.
- **DO NOT** add any extra explanations or text outside the single markdown code block that contains the JSON object.

**Example JSON Output for a React project:**
\`\`\`json
{
  "code": [
    {
      "path": "src/App.tsx",
      "content": "import React from 'react';\\n..."
    }
  ],
  "suggestions": [
    "Animate the header on scroll.",
    "Add a footer section.",
    "Implement a dark mode toggle."
  ]
}
\`\`\`
`;
        } else {
            return `
- You MUST provide the output as a **single JSON object** enclosed in a single markdown code block.
- The JSON object must contain two keys:
  1. \`"code"\`: A single string containing the complete HTML file. This file MUST include the following scripts in its \`<head>\` for Tailwind CSS, theme configuration, and fonts:
     \`\`\`html
     ${TAILWIND_CONFIG_SCRIPT}
     \`\`\`
  2. \`"suggestions"\`: A JSON array of 3-4 concise, actionable refinement suggestion strings.
- **DO NOT** add any extra explanations or text outside the single markdown code block.
`;
        }
    };

    const details = promptSourceDetails[promptType];

    return `
You are an expert frontend developer and software architect specializing in converting UI designs into clean, responsive, and production-ready code.
Analyze the provided ${details.source}, generate a complete project structure for a ${scriptFramework} application using ${scriptLanguage}, and provide refinement suggestions.

**CRITICAL REQUIREMENTS:**
1.  **Componentization:** Break down the design into logical, reusable components where appropriate. Create a clean, modern file structure suitable for the chosen framework.
${stylingInstruction}
3.  **Framework-Specific Best Practices:**
    ${getFrameworkInstructions(scriptFramework, scriptLanguage, isCodeAnArrayOfFiles)}
${details.instructions}
4.  **Responsiveness:** The layout MUST be responsive and look great on all screen sizes. Use Tailwind's responsive prefixes (e.g., \`md:\`, \`lg:\`) extensively.
5.  **Placeholders (for image prompts without JSON):**
    - For images, use placeholders from \`https://picsum.photos/WIDTH/HEIGHT\`.
    - For user avatars or profile pictures, use vector avatars from a service like \`https://avatar.iran.liara.run/\`.
    - If text is not legible, use appropriate placeholder text (e.g., 'Lorem Ipsum...').
6.  **Code Quality:**
    - The generated code must be well-structured and use semantic HTML tags where appropriate.
    - Ensure your code is clean, readable, and production-ready.
7.  **Output Format (THIS IS CRITICAL):**
    ${getOutputFormatInstruction()}
`;
}

const extractOutput = (responseText: string): GenerationResult => {
  if (!responseText) {
    throw new Error("The AI returned an empty response. This might be due to a content safety filter.");
  }

  const codeBlockRegex = /```(?:json\n)?([\s\S]*?)```/;
  const match = responseText.match(codeBlockRegex);
  const content = match ? match[1].trim() : responseText.trim();

  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && 'code' in parsed && 'suggestions' in parsed) {
      // Basic validation
      const isCodeValid = typeof parsed.code === 'string' || (Array.isArray(parsed.code) && parsed.code.every(f => 'path' in f && 'content' in f));
      const areSuggestionsValid = Array.isArray(parsed.suggestions) && parsed.suggestions.every(s => typeof s === 'string');
      const isResponseValid = !('response' in parsed) || typeof parsed.response === 'string';

      if (isCodeValid && areSuggestionsValid && isResponseValid) {
        const result: GenerationResult = {
          code: parsed.code,
          suggestions: parsed.suggestions,
        };
        if (parsed.response) {
            result.response = parsed.response;
        }
        return result;
      }
    }
  } catch (e) {
    console.error("Failed to parse expected JSON output:", e, "Raw content:", content);
    throw new Error("The AI returned an invalid JSON format. The response should be a JSON object with 'code' and 'suggestions' keys.");
  }

  throw new Error("The AI returned an invalid JSON structure. It must have 'code' and 'suggestions' properties.");
};

export const generateCodeFromImage = async (
  modelId: string,
  mimeType: string,
  base64Image: string,
  customPrompt: string,
  scriptFramework: string,
  scriptLanguage: string,
): Promise<GenerationResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const basePrompt = getBasePrompt('image', scriptFramework, scriptLanguage);
    const finalPrompt = customPrompt 
      ? `${basePrompt}\n\n**ADDITIONAL USER INSTRUCTIONS:**\n${customPrompt}` 
      : basePrompt;

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Image,
      },
    };

    const textPart = {
      text: finalPrompt,
    };

    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [imagePart, textPart] },
    });

    return extractOutput(response.text);

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Gemini API.");
  }
};


export const generateCodeFromHtml = async (
  modelId: string,
  htmlContent: string,
  customPrompt: string,
  scriptFramework: string,
  scriptLanguage: string,
): Promise<GenerationResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const basePrompt = getBasePrompt('html', scriptFramework, scriptLanguage);
    
    let finalPrompt = `${basePrompt}\n\n**HERE IS THE HTML TO REFACTOR:**\n\`\`\`html\n${htmlContent}\n\`\`\``;

    if (customPrompt) {
      finalPrompt += `\n\n**ADDITIONAL USER INSTRUCTIONS:**\n${customPrompt}`;
    }

    const response = await ai.models.generateContent({
        model: modelId,
        contents: finalPrompt,
    });

    return extractOutput(response.text);

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Gemini API.");
  }
};


export const generateCodeFromFigma = async (
  modelId: string,
  mimeType: string,
  base64Image: string,
  figmaNodeJson: any,
  customPrompt: string,
  scriptFramework: string,
  scriptLanguage: string,
): Promise<GenerationResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const basePrompt = getBasePrompt('figma', scriptFramework, scriptLanguage);
    const finalPrompt = customPrompt 
      ? `${basePrompt}\n\n**ADDITIONAL USER INSTRUCTIONS:**\n${customPrompt}` 
      : basePrompt;

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Image,
      },
    };

    const promptPart = {
      text: finalPrompt,
    };

    const figmaJsonPart = {
        text: `\n\n**FIGMA NODE JSON:**\n\`\`\`json\n${JSON.stringify(figmaNodeJson, null, 2)}\n\`\`\``,
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [promptPart, imagePart, figmaJsonPart] },
    });

    return extractOutput(response.text);

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Gemini API.");
  }
};

export const generateCodeFromUrl = async (
  modelId: string,
  url: string,
  customPrompt: string,
  scriptFramework: string,
  scriptLanguage: string,
): Promise<GenerationResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const basePrompt = getBasePrompt('url', scriptFramework, scriptLanguage);
    
    let finalPrompt = `${basePrompt}\n\n**WEBPAGE URL TO CLONE:**\n${url}`;

    if (customPrompt) {
      finalPrompt += `\n\n**ADDITIONAL USER INSTRUCTIONS:**\n${customPrompt}`;
    }

    const response = await ai.models.generateContent({
        model: modelId,
        contents: finalPrompt,
        config: {
          tools: [{googleSearch: {}}],
        },
    });

    const output = extractOutput(response.text);
    if (typeof output.code === 'string') {
      // This fallback is for safety, in case the AI still fails to produce JSON.
      throw new Error("The AI returned a single string but a JSON project structure was expected for URL cloning. Please try again.");
    }
    return output;

  } catch (error) {
    console.error("Error calling Gemini API for URL cloning:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Gemini API.");
  }
};

export const generateCodeFromContentAdoption = async (
    modelId: string,
    htmlContent: string,
    userContent: string,
    adoptionMode: 'improve' | 'strict',
): Promise<GenerationResult> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }

    const adoptionModeText = adoptionMode === 'improve' ? 'Improve and Add' : 'Strict Content';

    const prompt = `
You are an intelligent content integration assistant. Your task is to take a user-provided HTML template and new content, and merge them into a single, clean HTML file.

**CRITICAL REQUIREMENTS:**
1.  **Preserve Head and Scripts:** You MUST preserve the original HTML's \`<head>\` section, including all \`<link>\`, \`<meta>\`, and \`<script>\` tags. Also, preserve any external script tags (e.g., \`<script src="..."></script>\`) found anywhere in the original file.
2.  **Content Integration Mode:** The user has selected the "${adoptionModeText}" mode.
    - If the mode is "Improve and Add": Populate the HTML template with the new content. If the new content does not cover all sections of the template (e.g., a footer is in the template but not in the content), you should intelligently generate appropriate placeholder content for those sections, making sure it thematically matches the new content provided. The goal is a complete and coherent webpage.
    - If the mode is "Strict Content": Use ONLY the provided content. Map the content to the relevant sections of the HTML template. Any sections or elements in the template for which no new content is provided MUST be removed entirely from the final output.
3.  **Clean Code:** The final output must be a single, well-formed, and clean HTML file.
4.  **Output Format (THIS IS CRITICAL):**
    - You MUST provide the output as a **single JSON object** enclosed in a single markdown code block.
    - The JSON object must contain two keys:
        1. \`"code"\`: A single string containing the complete, updated HTML file.
        2. \`"suggestions"\`: A JSON array of 3-4 concise, actionable refinement suggestion strings.
    - **DO NOT** add any extra explanations or text outside the single markdown code block.

---

**HTML TEMPLATE TO USE:**
\`\`\`html
${htmlContent}
\`\`\`

---

**NEW CONTENT TO APPLY:**
\`\`\`text
${userContent}
\`\`\`
`;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
        });

        return extractOutput(response.text);

    } catch (error) {
        console.error("Error calling Gemini API for content adoption:", error);
        if (error instanceof Error) {
            throw new Error(`Gemini API Error: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the Gemini API.");
    }
};


export const refineCode = async (
  modelId: string,
  previousCode: string | GeneratedFile[],
  chatHistory: ChatMessage[],
  scriptFramework: string,
  scriptLanguage: string,
): Promise<GenerationResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }

  const isSingleFile = typeof previousCode === 'string';

  const codeBlock = isSingleFile
    ? `\`\`\`html\n${previousCode}\n\`\`\``
    : `\`\`\`json\n${JSON.stringify(previousCode, null, 2)}\n\`\`\``;

  const historyText = chatHistory.map(m => `${m.author === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');
  
  const prompt = `
You are an expert frontend developer. You have previously generated the following code for a ${scriptFramework} project using ${scriptLanguage}.

**PREVIOUS CODE:**
${codeBlock}

You have been conversing with the user. Here is the history:

**CONVERSATION HISTORY:**
${historyText}

Based on the full conversation, please apply the user's latest request to the code.
Provide the **complete, updated project code**. It is critical that you return the entire project, not just the changed parts.

Also, provide a brief, one-sentence response summarizing the changes you made. This response will be shown to the user in the chat.
Finally, provide 3-4 new, relevant refinement suggestions based on the updated code and the user's latest request.

**OUTPUT FORMAT (CRITICAL):**
You MUST provide the output as a single JSON object enclosed in a single markdown code block.
The JSON object must have three keys:
1.  \`"code"\`: The updated code. This should be ${isSingleFile ? "a single string of HTML" : "an array of file objects, maintaining the original structure"}.
2.  \`"suggestions"\`: An array of new refinement suggestion strings.
3.  \`"response"\`: A string containing your summary of the changes.

Do not add any extra explanations or text outside the single markdown code block.
`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });

    return extractOutput(response.text);

  } catch (error) {
    console.error("Error calling Gemini API for refinement:", error);
    if (error instanceof Error) {
      throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Gemini API.");
  }
};