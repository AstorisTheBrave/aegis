import { describe, expect, it } from 'vitest';
import { standardWorkflowTemplates, validateStandardWorkflowTemplates } from '../src/index.js';

describe('standard workflow templates', () => {
  it('ships seven versioned no-write lifecycle templates', () => {
    expect(standardWorkflowTemplates).toHaveLength(7);
    expect(validateStandardWorkflowTemplates()).toEqual([]);
    expect(standardWorkflowTemplates.flatMap((template) => template.steps)).toEqual(
      expect.arrayContaining([expect.objectContaining({ providerMutation: false })]),
    );
  });
});
