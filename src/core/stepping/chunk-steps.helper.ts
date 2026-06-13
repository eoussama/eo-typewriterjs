/**
 * @description
 * Group an ordered array of step tokens into chunks of a given size.
 * The final chunk may contain fewer tokens if the total does not divide evenly.
 *
 * @param steps - The ordered array of step tokens to group
 * @param amount - The number of tokens per chunk
 * @returns An array of chunk strings, each formed by joining `amount` tokens
 */
export function chunkSteps(steps: string[], amount: number): string[] {
  if (amount <= 0) {
    return steps;
  }

  const chunks: string[] = [];

  for (let i = 0; i < steps.length; i += amount) {
    chunks.push(steps.slice(i, i + amount).join(""));
  }

  return chunks;
}
