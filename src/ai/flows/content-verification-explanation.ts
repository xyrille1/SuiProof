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
  prompt: `You are an AI acting as a SuiProof Content Authenticity Auditor. Your task is to analyze provided media and determine its authenticity as if it has been checked against the Sui blockchain. You must provide a clear explanation for the verification status.

Based on the internal flag, simulate whether the media is verified or unverified:

Internal verification flag: {{{_internalShouldVerify}}}

Media: {{media url=mediaDataUri}}

If the internal verification flag is TRUE, then the media is VERIFIED. In this case, you must generate plausible details for 'sourceAgency', 'captureLocation', and 'deviceSignature'. The explanation should confirm its authenticity and mention these details.

If the internal verification flag is FALSE, then the media is UNVERIFIED. In this case, you should explain that the content hash was not found on the Sui Network, that metadata might have been stripped, or that the content was generated without a SuiProof manifest. Include a clear warning to "PROCEED WITH CAUTION". Do NOT include 'sourceAgency', 'captureLocation', or 'deviceSignature' fields.

Respond only with a JSON object conforming to the ContentVerificationExplanationOutputSchema. Ensure all fields are present and correctly formatted.

Example of VERIFIED output:
{
  "isVerified": true,
  "explanation": "This media has been successfully verified on the Sui Network. It originates from BBC News Verified, captured at 40.7128° N, 74.0060° W, and bears the device signature Sony-A7IV-TEE-HASH-883921. The cryptographic seal confirms its authenticity and integrity.",
  "sourceAgency": "BBC News Verified",
  "captureLocation": "40.7128° N, 74.0060° W",
  "deviceSignature": "Sony-A7IV-TEE-HASH-883921"
}

Example of UNVERIFIED output:
{
  "isVerified": false,
  "explanation": "This media's content hash does not exist on the Sui Network. It appears that metadata might have been stripped, or the content was generated without a SuiProof manifest. PROCEED WITH CAUTION: its authenticity cannot be confirmed by SuiProof."
}
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
