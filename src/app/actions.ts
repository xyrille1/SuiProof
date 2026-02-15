'use server';

import {
  contentVerificationExplanation,
  type ContentVerificationExplanationOutput,
} from '@/ai/flows/content-verification-explanation';

export async function getVerificationResult(
  mediaDataUri: string
): Promise<ContentVerificationExplanationOutput> {
  try {
    const result = await contentVerificationExplanation({ mediaDataUri });
    return result;
  } catch (error) {
    console.error('Error in content verification flow:', error);
    // Return a structured error response that the client can handle
    return {
      isVerified: false,
      explanation: 'An unexpected error occurred during the audit. Please try again.',
    };
  }
}
