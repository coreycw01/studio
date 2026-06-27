'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LinkTypeSchema = z.enum(['supports', 'challenges', 'coheres', 'defines', 'refines', 'contradicts', 'exemplifies', 'inspired_by', 'tested_by', 'expressed_in', 'changed_by']);

const SuggestAnnotationConsequencesInputSchema = z.object({
  annotationText: z.string(),
  annotationType: z.string().optional(),
  sourceTitle: z.string().optional(),
  existingConcepts: z.array(z.string()).optional(),
  existingInquiries: z.array(z.string()).optional(),
  existingPositions: z.array(z.string()).optional(),
});

const SuggestAnnotationConsequencesOutputSchema = z.object({
  thoughtKind: z.enum(['claim_agree', 'claim_reject', 'question', 'definition', 'example', 'contradiction', 'personal_reaction']),
  suggestedConcepts: z.array(z.string()).max(5),
  suggestedInquiry: z.string().optional(),
  suggestedPosition: z.string().optional(),
  suggestedLinkType: LinkTypeSchema.optional(),
  rationale: z.string(),
});

export async function suggestAnnotationConsequences(input: z.infer<typeof SuggestAnnotationConsequencesInputSchema>) {
  return suggestAnnotationConsequencesFlow(input);
}

const suggestAnnotationConsequencesPrompt = ai.definePrompt({
  name: 'suggestAnnotationConsequencesPrompt',
  input: {schema: SuggestAnnotationConsequencesInputSchema},
  output: {schema: SuggestAnnotationConsequencesOutputSchema},
  prompt: `You are a Socratic assistant for Noesis. Suggest what this annotation might do next, but do not claim certainty.

Annotation: {{{annotationText}}}
Type: {{annotationType}}
Source: {{sourceTitle}}
Existing concepts: {{existingConcepts}}
Existing inquiries: {{existingInquiries}}
Existing positions: {{existingPositions}}

Return concise suggestions. Use "challenges" only when the note clearly creates pressure against a position.`,
});

const suggestAnnotationConsequencesFlow = ai.defineFlow({
  name: 'suggestAnnotationConsequencesFlow',
  inputSchema: SuggestAnnotationConsequencesInputSchema,
  outputSchema: SuggestAnnotationConsequencesOutputSchema,
}, async (input) => {
  const {output} = await suggestAnnotationConsequencesPrompt(input);
  return output!;
});

const SuggestPositionDraftsInputSchema = z.object({
  conceptName: z.string().optional(),
  annotations: z.array(z.string()),
  sourceTitles: z.array(z.string()).optional(),
});

const SuggestPositionDraftsOutputSchema = z.object({
  drafts: z.array(z.object({
    claim: z.string(),
    confidence: z.enum(['low', 'medium', 'high']),
    supportSummary: z.string(),
    challengeToConsider: z.string(),
  })).min(1).max(4),
});

export async function suggestPositionDrafts(input: z.infer<typeof SuggestPositionDraftsInputSchema>) {
  return suggestPositionDraftsFlow(input);
}

const suggestPositionDraftsPrompt = ai.definePrompt({
  name: 'suggestPositionDraftsPrompt',
  input: {schema: SuggestPositionDraftsInputSchema},
  output: {schema: SuggestPositionDraftsOutputSchema},
  prompt: `Draft editable philosophical positions from these notes. Do not overstate what the user believes.

Concept: {{conceptName}}
Sources: {{sourceTitles}}
Annotations:
{{#each annotations}}
- {{{this}}}
{{/each}}

Return 2 to 4 clear claim drafts with a support summary and one challenge to consider.`,
});

const suggestPositionDraftsFlow = ai.defineFlow({
  name: 'suggestPositionDraftsFlow',
  inputSchema: SuggestPositionDraftsInputSchema,
  outputSchema: SuggestPositionDraftsOutputSchema,
}, async (input) => {
  const {output} = await suggestPositionDraftsPrompt(input);
  return output!;
});

const SuggestTypedLinksInputSchema = z.object({
  fromLabel: z.string(),
  fromType: z.string(),
  toLabel: z.string(),
  toType: z.string(),
  context: z.string().optional(),
});

const SuggestTypedLinksOutputSchema = z.object({
  linkType: LinkTypeSchema,
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
});

export async function suggestTypedLinks(input: z.infer<typeof SuggestTypedLinksInputSchema>) {
  return suggestTypedLinksFlow(input);
}

const suggestTypedLinksPrompt = ai.definePrompt({
  name: 'suggestTypedLinksPrompt',
  input: {schema: SuggestTypedLinksInputSchema},
  output: {schema: SuggestTypedLinksOutputSchema},
  prompt: `Choose the most likely philosophical link type between two Noesis objects.

From: {{fromType}} - {{{fromLabel}}}
To: {{toType}} - {{{toLabel}}}
Context: {{{context}}}

Be humble. Prefer coheres, supports, challenges, defines, refines, exemplifies, tested_by, expressed_in, or inspired_by unless contradiction is explicit.`,
});

const suggestTypedLinksFlow = ai.defineFlow({
  name: 'suggestTypedLinksFlow',
  inputSchema: SuggestTypedLinksInputSchema,
  outputSchema: SuggestTypedLinksOutputSchema,
}, async (input) => {
  const {output} = await suggestTypedLinksPrompt(input);
  return output!;
});

const DetectPossibleTensionsInputSchema = z.object({
  positions: z.array(z.object({
    id: z.string().optional(),
    title: z.string(),
    statement: z.string(),
  })),
  concepts: z.array(z.string()).optional(),
});

const DetectPossibleTensionsOutputSchema = z.object({
  tensions: z.array(z.object({
    firstTitle: z.string(),
    secondTitle: z.string(),
    tension: z.string(),
    suggestedQuestion: z.string(),
  })).max(5),
});

export async function detectPossibleTensions(input: z.infer<typeof DetectPossibleTensionsInputSchema>) {
  return detectPossibleTensionsFlow(input);
}

const detectPossibleTensionsPrompt = ai.definePrompt({
  name: 'detectPossibleTensionsPrompt',
  input: {schema: DetectPossibleTensionsInputSchema},
  output: {schema: DetectPossibleTensionsOutputSchema},
  prompt: `Look for possible tensions among these positions. Do not declare contradictions as fact.

Concepts: {{concepts}}
Positions:
{{#each positions}}
- {{{title}}}: {{{statement}}}
{{/each}}

Return possible tensions only when they would help the user think more clearly.`,
});

const detectPossibleTensionsFlow = ai.defineFlow({
  name: 'detectPossibleTensionsFlow',
  inputSchema: DetectPossibleTensionsInputSchema,
  outputSchema: DetectPossibleTensionsOutputSchema,
}, async (input) => {
  const {output} = await detectPossibleTensionsPrompt(input);
  return output!;
});

const SummarizeEvolutionEventInputSchema = z.object({
  entityType: z.string(),
  entityTitle: z.string(),
  oldState: z.string().optional(),
  newState: z.string(),
  evidence: z.array(z.string()).optional(),
});

const SummarizeEvolutionEventOutputSchema = z.object({
  summary: z.string(),
  cause: z.string(),
});

export async function summarizeEvolutionEvent(input: z.infer<typeof SummarizeEvolutionEventInputSchema>) {
  return summarizeEvolutionEventFlow(input);
}

const summarizeEvolutionEventPrompt = ai.definePrompt({
  name: 'summarizeEvolutionEventPrompt',
  input: {schema: SummarizeEvolutionEventInputSchema},
  output: {schema: SummarizeEvolutionEventOutputSchema},
  prompt: `Summarize a meaningful change for the Noesis Evolution timeline.

Object: {{entityType}} - {{{entityTitle}}}
Old state: {{{oldState}}}
New state: {{{newState}}}
Evidence:
{{#each evidence}}
- {{{this}}}
{{/each}}

Write this as a short record of changed thinking, not routine activity.`,
});

const summarizeEvolutionEventFlow = ai.defineFlow({
  name: 'summarizeEvolutionEventFlow',
  inputSchema: SummarizeEvolutionEventInputSchema,
  outputSchema: SummarizeEvolutionEventOutputSchema,
}, async (input) => {
  const {output} = await summarizeEvolutionEventPrompt(input);
  return output!;
});

const SocratesReflectInputSchema = z.object({
  question: z.string(),
  initialAnswer: z.string(),
  exchanges: z.array(z.object({
    probe: z.string(),
    response: z.string(),
  })).optional(),
});

const SocratesReflectOutputSchema = z.object({
  ready: z.boolean(),
  probe: z.string().optional(),
  focus: z.string().optional(),
  positionTitle: z.string().optional(),
  statement: z.string().optional(),
  description: z.string().optional(),
  confidence: z.number().min(1).max(5).int().optional(),
});

export async function socratesReflect(input: z.infer<typeof SocratesReflectInputSchema>) {
  return socratesReflectFlow(input);
}

const socratesReflectPrompt = ai.definePrompt({
  name: 'socratesReflectPrompt',
  input: { schema: SocratesReflectInputSchema },
  output: { schema: SocratesReflectOutputSchema },
  prompt: `You are Socrates in a philosophical dialogue. The user is working toward a clear position on a question.

Question: {{{question}}}

User's initial answer: {{{initialAnswer}}}

{{#if exchanges}}
Previous exchanges:
{{#each exchanges}}
Your probe: {{{probe}}}
User's response: {{{response}}}
{{/each}}
{{/if}}

Number of exchanges so far: {{exchanges.length}}

Rules:
- If exchanges < 2 and clarity is LOW: ask one more probing question (ready: false). Pick a dimension not yet explored: scope of claim, personal evidence, key exception, what this rules out, commitment level.
- If exchanges >= 2 OR the user's answers are already clear enough to crystallize: set ready: true and synthesize the position.
- Each probe must be specific to what the user actually said — do not ask generic philosophy questions.
- When ready: distill a precise, ownable claim from all their answers. Keep positionTitle under 12 words. Statement is one sentence. Description is 2-3 sentences of their own reasoning reflected back sharply.
- Confidence 1-5: read their certainty from the text (hedging = lower, conviction = higher; default 3).
- When not ready: set probe and a short focus label (2-4 words), leave position fields absent.`,
});

const socratesReflectFlow = ai.defineFlow({
  name: 'socratesReflectFlow',
  inputSchema: SocratesReflectInputSchema,
  outputSchema: SocratesReflectOutputSchema,
}, async (input) => {
  const { output } = await socratesReflectPrompt(input);
  return output!;
});

const GenerateIdeaQuestionsInputSchema = z.object({
  ideaTitle: z.string(),
  ideaBody: z.string().optional(),
});

const GenerateIdeaQuestionsOutputSchema = z.object({
  questions: z.array(z.object({
    question: z.string(),
    focus: z.string(),
  })).length(3),
});

export async function generateIdeaQuestions(input: z.infer<typeof GenerateIdeaQuestionsInputSchema>) {
  return generateIdeaQuestionsFlow(input);
}

const generateIdeaQuestionsPrompt = ai.definePrompt({
  name: 'generateIdeaQuestionsPrompt',
  input: { schema: GenerateIdeaQuestionsInputSchema },
  output: { schema: GenerateIdeaQuestionsOutputSchema },
  prompt: `You are a Socratic assistant. The user has written an idea and needs to turn it into a clear philosophical position.

Idea title: {{{ideaTitle}}}
Idea body: {{{ideaBody}}}

Generate exactly 3 questions that will help the user clarify and commit to a specific position. Each question should surface a different dimension: scope of the claim, the evidence or experience behind it, and a key objection or limit. Be specific to THIS idea. Return a short "focus" label (2-4 words) for each.`,
});

const generateIdeaQuestionsFlow = ai.defineFlow({
  name: 'generateIdeaQuestionsFlow',
  inputSchema: GenerateIdeaQuestionsInputSchema,
  outputSchema: GenerateIdeaQuestionsOutputSchema,
}, async (input) => {
  const { output } = await generateIdeaQuestionsPrompt(input);
  return output!;
});

const FormPositionFromIdeaInputSchema = z.object({
  ideaTitle: z.string(),
  ideaBody: z.string().optional(),
  qa: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })),
});

const FormPositionFromIdeaOutputSchema = z.object({
  positionTitle: z.string(),
  statement: z.string(),
  description: z.string(),
  confidence: z.number().min(1).max(5).int(),
});

export async function formPositionFromIdea(input: z.infer<typeof FormPositionFromIdeaInputSchema>) {
  return formPositionFromIdeaFlow(input);
}

const formPositionFromIdeaPrompt = ai.definePrompt({
  name: 'formPositionFromIdeaPrompt',
  input: { schema: FormPositionFromIdeaInputSchema },
  output: { schema: FormPositionFromIdeaOutputSchema },
  prompt: `Synthesize a philosophical position from this idea and the user's answers to Socratic questions.

Original idea: {{{ideaTitle}}}
{{ideaBody}}

User's answers:
{{#each qa}}
Q: {{{question}}}
A: {{{answer}}}
{{/each}}

Write:
- positionTitle: a short bold claim the user can own (under 12 words)
- statement: the core claim in one precise sentence
- description: 2-3 sentences of reasoning drawn from their answers
- confidence: 1–5 integer reflecting how certain they seem (default 3)

Reflect the user's actual views. Do not add claims beyond what they expressed.`,
});

const formPositionFromIdeaFlow = ai.defineFlow({
  name: 'formPositionFromIdeaFlow',
  inputSchema: FormPositionFromIdeaInputSchema,
  outputSchema: FormPositionFromIdeaOutputSchema,
}, async (input) => {
  const { output } = await formPositionFromIdeaPrompt(input);
  return output!;
});

const GenerateClarityCheckInputSchema = z.object({
  conceptName: z.string(),
  conceptDefinition: z.string().optional(),
  positionStatements: z.array(z.string()).max(4),
  annotationTexts: z.array(z.string()).max(5),
  relatedConcepts: z.array(z.string()).max(6),
});

const ClarityCheckOptionSchema = z.object({
  id: z.enum(['a', 'b', 'c', 'd']),
  text: z.string(),
  isClosest: z.boolean(),
});

const ClarityCheckQuestionSchema = z.object({
  text: z.string(),
  dimension: z.enum(['definition', 'distinction', 'application', 'tension', 'connection']),
  options: z.array(ClarityCheckOptionSchema).min(4).max(4),
  feedback: z.string(),
});

const GenerateClarityCheckOutputSchema = z.object({
  questions: z.array(ClarityCheckQuestionSchema).min(3).max(5),
});

export type ClarityCheckQuestion = z.infer<typeof ClarityCheckQuestionSchema>;
export type ClarityCheckOption = z.infer<typeof ClarityCheckOptionSchema>;

export async function generateClarityCheck(input: z.infer<typeof GenerateClarityCheckInputSchema>) {
  return generateClarityCheckFlow(input);
}

const generateClarityCheckPrompt = ai.definePrompt({
  name: 'generateClarityCheckPrompt',
  input: { schema: GenerateClarityCheckInputSchema },
  output: { schema: GenerateClarityCheckOutputSchema },
  prompt: `Generate a Clarity Check for a philosophical concept. This is NOT a quiz testing memory — it reveals what the user believes and where their thinking is unclear.

Concept: {{{conceptName}}}
Definition: {{{conceptDefinition}}}

Current positions:
{{#each positionStatements}}
- {{{this}}}
{{/each}}

Key annotations:
{{#each annotationTexts}}
- {{{this}}}
{{/each}}

Related concepts: {{relatedConcepts}}

Generate 3-5 questions. Each tests ONE dimension:
- definition: what this concept means
- distinction: how it differs from a closely related concept
- application: when or how this applies in real life
- tension: where the concept creates difficulty or conflict
- connection: how it relates to another idea

Rules:
- Questions must be specific to THIS user's notes — not generic philosophy
- Each question has exactly 4 options (id: a/b/c/d), ONE marked isClosest: true
- isClosest should match what the user's notes suggest they believe
- Do NOT make isClosest obvious — require genuine self-reflection
- feedback: one sentence explaining what the closest option reveals
- Option text under 20 words each`,
});

const generateClarityCheckFlow = ai.defineFlow({
  name: 'generateClarityCheckFlow',
  inputSchema: GenerateClarityCheckInputSchema,
  outputSchema: GenerateClarityCheckOutputSchema,
}, async (input) => {
  const { output } = await generateClarityCheckPrompt(input);
  return output!;
});

const SuggestDailyPhilosophyPromptInputSchema = z.object({
  rawAnnotationCount: z.number(),
  openInquiryCount: z.number(),
  unsupportedPositionCount: z.number(),
  untestedPositionCount: z.number(),
  recentChanges: z.array(z.string()).optional(),
});

const SuggestDailyPhilosophyPromptOutputSchema = z.object({
  title: z.string(),
  prompt: z.string(),
  actionLabel: z.string(),
  targetArea: z.enum(['annotations', 'inquiries', 'positions', 'works', 'practices', 'evolution']),
});

export async function suggestDailyPhilosophyPrompt(input: z.infer<typeof SuggestDailyPhilosophyPromptInputSchema>) {
  return suggestDailyPhilosophyPromptFlow(input);
}

const suggestDailyPhilosophyPromptPrompt = ai.definePrompt({
  name: 'suggestDailyPhilosophyPromptPrompt',
  input: {schema: SuggestDailyPhilosophyPromptInputSchema},
  output: {schema: SuggestDailyPhilosophyPromptOutputSchema},
  prompt: `Choose one useful next philosophical action for today. Do not overwhelm the user.

Raw annotations: {{rawAnnotationCount}}
Open inquiries: {{openInquiryCount}}
Unsupported positions: {{unsupportedPositionCount}}
Untested positions: {{untestedPositionCount}}
Recent changes: {{recentChanges}}

Return one calm, specific prompt.`,
});

const suggestDailyPhilosophyPromptFlow = ai.defineFlow({
  name: 'suggestDailyPhilosophyPromptFlow',
  inputSchema: SuggestDailyPhilosophyPromptInputSchema,
  outputSchema: SuggestDailyPhilosophyPromptOutputSchema,
}, async (input) => {
  const {output} = await suggestDailyPhilosophyPromptPrompt(input);
  return output!;
});
