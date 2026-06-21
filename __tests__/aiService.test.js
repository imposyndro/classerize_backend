/**
 * Unit tests for aiService.js — mocked AI calls so no API key required.
 */

// Capture mock function reference for later override
const mockCreate = jest.fn().mockResolvedValue({
    choices: [{ message: { content: 'Mocked AI response.' } }],
});

jest.mock('openai', () => {
    return jest.fn().mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
    }));
});

process.env.OPENAI_API_KEY = 'test-key';
process.env.AI_PROVIDER = 'openai';

const { summarizeAssignment, generateStudySchedule, assessUrgency } = require('../services/aiService');

describe('aiService', () => {
    const mockAssignment = {
        assignment_id: 1,
        assignment_name: 'Lab Report 3',
        course_name: 'BIO 101',
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        points_possible: 50,
        description: 'Write a 2-page report on cell mitosis.',
        status: 'pending',
    };

    beforeEach(() => {
        mockCreate.mockResolvedValue({
            choices: [{ message: { content: 'Mocked AI response.' } }],
        });
    });

    test('summarizeAssignment returns a string', async () => {
        const result = await summarizeAssignment(mockAssignment);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

    test('generateStudySchedule returns a string for non-empty list', async () => {
        const result = await generateStudySchedule([mockAssignment]);
        expect(typeof result).toBe('string');
    });

    test('generateStudySchedule returns default message for empty list', async () => {
        const result = await generateStudySchedule([]);
        expect(result).toBe('No upcoming assignments to schedule.');
    });

    test('assessUrgency returns empty array for empty input', async () => {
        const result = await assessUrgency([]);
        expect(result).toEqual([]);
    });

    test('assessUrgency handles malformed AI response gracefully', async () => {
        mockCreate.mockResolvedValueOnce({
            choices: [{ message: { content: 'not json at all' } }],
        });
        const result = await assessUrgency([mockAssignment]);
        expect(result).toEqual([]);
    });

    test('assessUrgency returns empty array when all items have no due date', async () => {
        const noDue = { ...mockAssignment, due_date: null };
        const result = await assessUrgency([noDue]);
        expect(result).toEqual([]);
    });
});
