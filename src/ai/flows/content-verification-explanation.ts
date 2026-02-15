'use server';
/**
 * @fileOverview A Genkit flow for determining the authenticity of user-uploaded media.
 *
 * - contentVerificationExplanation - A function that handles the content authenticity audit process.
 * - ContentVerificationExplanationInput - The input type for the contentVerificationExplanation function.
 * - ContentVerificationExplanationOutput - The return type for the contentVerificationExplanation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Public Input Schema
const ContentVerificationExplanationInputSchema = z.object({
  mediaDataUri: z
    .string()
    .describe(
      "The media content (image or video) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ContentVerificationExplanationInput = z.infer<typeof ContentVerificationExplanationInputSchema>;

// Public Output Schema
const ContentVerificationExplanationOutputSchema = z.object({
  isVerified: z
    .boolean()
    .describe("True if the media's authenticity is confirmed by SuiProof, false if it's unverified."),
  explanation: z
    .string()
    .describe(
      "A detailed, human-readable explanation of the audit findings. If verified, this includes details like source, location, and device. If unverified, it explains why and provides a warning."
    ),
  sourceAgency: z.string().optional().describe("If verified, the source agency of the media (e.g., 'BBC News Verified', 'Associated Press')."),
  captureLocation: z.string().optional().describe("If verified, the GPS coordinates of the capture location (e.g., '40.7128° N, 74.0060° W')."),
  deviceSignature: z.string().optional().describe("If verified, the unique device signature (e.g., 'Sony-A7IV-TEE-HASH-883921')."),
});
export type ContentVerificationExplanationOutput = z.infer<typeof ContentVerificationExplanationOutputSchema>;

// Internal Input Schema for the prompt and flow, including the simulation flag
const _InternalPromptInputSchema = ContentVerificationExplanationInputSchema.extend({
  _internalShouldVerify: z.boolean().describe("Internal flag to control verification status for simulation purposes."),
});
type _InternalPromptInput = z.infer<typeof _InternalPromptInputSchema>;


const contentVerificationExplanationPrompt = ai.definePrompt({
  name: 'contentVerificationExplanationPrompt',
  input: { schema: _InternalPromptInputSchema }, // Use internal input schema
  output: { schema: ContentVerificationExplanationOutputSchema }, // Output is public output schema
  prompt: `You are an AI that provides content authenticity audit results.
Respond with a JSON object that conforms to the ContentVerificationExplanationOutputSchema.

If _internalShouldVerify is true, the media is verified. Generate plausible details for sourceAgency, captureLocation, and deviceSignature.
If _internalShouldVerify is false, the media is unverified. Do not include sourceAgency, captureLocation, or deviceSignature.

_internalShouldVerify: {{_internalShouldVerify}}
Media: {{media url=mediaDataUri}}
`,
});

const contentVerificationExplanationFlow = ai.defineFlow(
  {
    name: 'contentVerificationExplanationFlow',
    inputSchema: _InternalPromptInputSchema, // Flow takes the internal input schema
    outputSchema: ContentVerificationExplanationOutputSchema,
  },
  async (input: _InternalPromptInput) => {
    const { output } = await contentVerificationExplanationPrompt(input);
    if (!output) {
      throw new Error('Failed to get output from Genkit prompt.');
    }
    return output;
  }
);

export async function contentVerificationExplanation(
  input: ContentVerificationExplanationInput
): Promise<ContentVerificationExplanationOutput> {
  // Simulate verification status randomly for demonstration purposes, as actual blockchain interaction is not available.
  const shouldVerify = Math.random() > 0.5;

  const flowInput: _InternalPromptInput = {
    ...input,
    _internalShouldVerify: shouldVerify,
  };

  const output = await contentVerificationExplanationFlow(flowInput);
  return output;
}
