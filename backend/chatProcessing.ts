import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL_DEFAULT || 'gemini-3-flash-preview';

interface ChatRequest {
  suggestion: string;
  context?: {
    category?: string;
    contentArea?: string;
    currentContent?: string;
  };
  phase: 'suggestions' | 'implementation';
}

interface ComponentGenerationRequest {
  implementation: string;
  context?: {
    category?: string;
    contentArea?: string;
    currentContent?: string;
  };
}

export async function processChatSuggestion(request: ChatRequest) {
  try {
    const model = genAI.getGenerativeModel({ model: DEFAULT_GEMINI_MODEL });
    
    const systemPrompt = buildSystemPrompt(request.context, request.phase);
    const userPrompt = buildUserPrompt(request.suggestion, request.context, request.phase);
    
    const result = await model.generateContent(systemPrompt + '\n\n' + userPrompt);
    
    const response = result.response.text();
    
    if (request.phase === 'suggestions') {
      return {
        type: 'suggestions',
        content: response,
        suggestions: parseImplementationOptions(response, request.context)
      };
    } else {
      return {
        type: 'implementation_options',
        content: response,
        suggestions: parseImplementationOptions(response, request.context)
      };
    }
  } catch (error) {
    console.error('Error processing chat suggestion:', error);
    throw new Error('Failed to process chat request');
  }
}

export async function generateChatComponent(request: ComponentGenerationRequest) {
  try {
    const model = genAI.getGenerativeModel({ model: DEFAULT_GEMINI_MODEL });
    
    const prompt = buildComponentGenerationPrompt(request.implementation, request.context);
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    try {
      const componentData = JSON.parse(responseText);
      return {
        ...componentData,
        id: Math.random().toString(36).substr(2, 9),
        metadata: {
          ...componentData.metadata,
          generated: true,
          timestamp: new Date().toISOString()
        }
      };
    } catch (parseError) {
      console.error('Failed to parse component JSON:', parseError);
      return createFallbackComponent(request.implementation, request.context);
    }
  } catch (error) {
    console.error('Error generating chat component:', error);
    return createFallbackComponent(request.implementation, request.context);
  }
}

function buildSystemPrompt(context?: any, phase: string = 'suggestions'): string {
  const basePrompt = `You are an AI assistant specialized in creating high-converting digital product content. You help users create professional, conversion-optimized content for digital products.`;
  
  if (!context?.category) {
    return basePrompt;
  }

  const categoryPrompts = {
    'AI_PROMPTS': `${basePrompt} You specialize in AI prompt frameworks and technical content for developers and AI professionals. Focus on systematic approaches, multi-model compatibility, and proven results.`,
    'NOTION_TEMPLATES': `${basePrompt} You specialize in Notion productivity templates for professionals and teams. Focus on organization systems, database capabilities, and workflow automation.`,
    'DIGITAL_PLANNERS': `${basePrompt} You specialize in aesthetic digital planners for creative professionals and lifestyle enthusiasts. Focus on beautiful design, daily inspiration, and iPad optimization.`,
    'DESIGN_TEMPLATES': `${basePrompt} You specialize in professional design systems for agencies and freelancers. Focus on client work, commercial licensing, and business value.`
  };

  return categoryPrompts[context.category as keyof typeof categoryPrompts] || basePrompt;
}

function buildUserPrompt(suggestion: string, context?: any, phase: string = 'suggestions'): string {
  if (phase === 'suggestions') {
    return `The user has selected this suggestion: "${suggestion}". 
    
    Context: Category: ${context?.category || 'General'}, Content Area: ${context?.contentArea || 'General'}
    
    Provide a helpful response that acknowledges their selection and offers specific implementation options. Be concise and actionable.`;
  }

  return `The user wants to implement: "${suggestion}".
  
  Context: Category: ${context?.category || 'General'}
  
  Provide specific implementation options that would create valuable, conversion-focused content blocks. Each option should be concrete and actionable.`;
}

function buildComponentGenerationPrompt(implementation: string, context?: any): string {
  const basePrompt = `Generate a high-quality content block for: "${implementation}"

Context: Category: ${context?.category || 'General'}

Requirements:
- Create content that converts visitors to customers
- Use specific, measurable benefits where possible
- Include social proof elements when appropriate
- Match the tone and style for the category
- Ensure content is professional and polished`;

  const categorySpecifics = {
    'AI_PROMPTS': `
- Focus on technical credibility and systematic approaches
- Include metrics like "85% improvement" or "tested across 10,000+ prompts"
- Mention multi-model compatibility (GPT-4, Claude, Gemini)
- Use developer-friendly language`,

    'NOTION_TEMPLATES': `
- Emphasize productivity and organization benefits
- Include time-saving metrics like "save 5+ hours weekly"
- Mention collaboration and team features
- Use professional, business-focused language`,

    'DIGITAL_PLANNERS': `
- Focus on aesthetic appeal and inspiration
- Include lifestyle benefits and daily motivation
- Mention iPad optimization and app compatibility
- Use creative, inspiring language`,

    'DESIGN_TEMPLATES': `
- Emphasize professional quality and business value
- Include ROI metrics and time savings
- Mention commercial licensing and client work
- Use agency-appropriate, professional language`
  };

  const categorySpecific = categorySpecifics[context?.category as keyof typeof categorySpecifics] || '';
  
  return basePrompt + categorySpecific;
}

function parseImplementationOptions(response: string, context?: any): string[] {
  // Extract potential implementation options from the AI response
  const lines = response.split('\n');
  const options: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const option = trimmed.replace(/^[-*•]\s*/, '').trim();
      if (option.length > 10 && option.length < 100) {
        options.push(option);
      }
    }
  }
  
  // If no options found, provide category-specific defaults
  if (options.length === 0) {
    return getCategoryDefaultOptions(context?.category);
  }
  
  return options.slice(0, 4); // Max 4 options
}

function getCategoryDefaultOptions(category?: string): string[] {
  const defaults = {
    'AI_PROMPTS': [
      "Create framework showcase component",
      "Build technical credibility section", 
      "Generate developer testimonials",
      "Design multi-model compatibility guide"
    ],
    'NOTION_TEMPLATES': [
      "Build database showcase component",
      "Create productivity benefits section",
      "Generate setup simplicity guide",
      "Design professional testimonials"
    ],
    'DIGITAL_PLANNERS': [
      "Create aesthetic gallery showcase",
      "Build lifestyle benefits section", 
      "Generate app compatibility guide",
      "Design creative community section"
    ],
    'DESIGN_TEMPLATES': [
      "Build agency ROI calculator",
      "Create platform compatibility matrix",
      "Generate professional case studies", 
      "Design commercial license guide"
    ]
  };
  
  return defaults[category as keyof typeof defaults] || [
    "Create interactive component",
    "Build informational section",
    "Generate comparison table",
    "Design visual showcase"
  ];
}

function createFallbackComponent(implementation: string, context?: any) {
  const category = context?.category || 'general';
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    type: 'feature-grid',
    title: `Generated: ${implementation}`,
    content: `This ${implementation.toLowerCase()} has been generated for your ${category.replace('_', ' ').toLowerCase()} product. It includes key features and benefits designed to convert visitors into customers.`,
    metadata: {
      generated: true,
      category: category,
      implementation: implementation,
      fallback: true,
      timestamp: new Date().toISOString()
    }
  };
}