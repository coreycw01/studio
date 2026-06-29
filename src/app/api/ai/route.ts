import { NextResponse } from 'next/server';
import { distillInsightsFromMedia } from '@/ai/flows/distill-insights-from-media';
import { generateReflectiveQuestions } from '@/ai/flows/generate-reflective-questions-flow';
import { suggestConceptDescription } from '@/ai/flows/suggest-concept-description';
import {
  formPositionFromIdea,
  generateClarityCheck,
  generateIdeaQuestions,
  socratesReflect,
  suggestAnnotationConsequences,
  suggestPositionDrafts,
} from '@/ai/flows/philosophy-suggestions';

export const runtime = 'nodejs';

type AiAction =
  | 'distillInsightsFromMedia'
  | 'generateReflectiveQuestions'
  | 'suggestAnnotationConsequences'
  | 'socratesReflect'
  | 'generateIdeaQuestions'
  | 'formPositionFromIdea'
  | 'suggestConceptDescription'
  | 'generateClarityCheck'
  | 'suggestPositionDrafts';

function isAiConfigured() {
  return Boolean(
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY,
  );
}

function noUsableResult(result: unknown) {
  if (result == null) return true;
  if (Array.isArray(result)) return result.length === 0;
  if (typeof result === 'object') return Object.keys(result as Record<string, unknown>).length === 0;
  return false;
}

function aiConfigError() {
  return NextResponse.json(
    {
      error:
        'AI service is not configured. Add GEMINI_API_KEY, GOOGLE_API_KEY, or GOOGLE_GENAI_API_KEY on the server before using AI features.',
    },
    { status: 503 },
  );
}

export async function POST(request: Request) {
  try {
    const { action, payload } = await request.json() as { action?: AiAction; payload?: unknown };

    if (!action) {
      return NextResponse.json({ error: 'An AI action is required.' }, { status: 400 });
    }

    if (!isAiConfigured()) {
      return aiConfigError();
    }

    let result: unknown;
    switch (action) {
      case 'distillInsightsFromMedia':
        result = await distillInsightsFromMedia(payload as Parameters<typeof distillInsightsFromMedia>[0]);
        break;
      case 'generateReflectiveQuestions':
        result = await generateReflectiveQuestions(payload as Parameters<typeof generateReflectiveQuestions>[0]);
        break;
      case 'suggestAnnotationConsequences':
        result = await suggestAnnotationConsequences(payload as Parameters<typeof suggestAnnotationConsequences>[0]);
        break;
      case 'socratesReflect':
        result = await socratesReflect(payload as Parameters<typeof socratesReflect>[0]);
        break;
      case 'generateIdeaQuestions':
        result = await generateIdeaQuestions(payload as Parameters<typeof generateIdeaQuestions>[0]);
        break;
      case 'formPositionFromIdea':
        result = await formPositionFromIdea(payload as Parameters<typeof formPositionFromIdea>[0]);
        break;
      case 'suggestConceptDescription':
        result = await suggestConceptDescription(payload as Parameters<typeof suggestConceptDescription>[0]);
        break;
      case 'generateClarityCheck':
        result = await generateClarityCheck(payload as Parameters<typeof generateClarityCheck>[0]);
        break;
      case 'suggestPositionDrafts':
        result = await suggestPositionDrafts(payload as Parameters<typeof suggestPositionDrafts>[0]);
        break;
      default:
        return NextResponse.json({ error: 'Unknown AI action requested.' }, { status: 400 });
    }

    if (noUsableResult(result)) {
      return NextResponse.json({ error: 'No usable AI response was returned.' }, { status: 422 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI request failed. Please try again.';
    const status = /api key|configured/i.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
