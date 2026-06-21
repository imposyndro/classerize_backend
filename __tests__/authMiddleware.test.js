/**
 * Unit tests for authMiddleware.verifyToken
 */

process.env.JWT_SECRET = 'test_secret_for_jest_do_not_use_in_prod';

const jwt = require('jsonwebtoken');
const { verifyToken } = require('../middleware/authMiddleware');

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('verifyToken middleware', () => {
    test('calls next() with a valid token in cookies', () => {
        const token = jwt.sign({ userId: 42 }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const req = { cookies: { token } };
        const res = mockRes();
        const next = jest.fn();

        verifyToken(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.user).toMatchObject({ userId: 42 });
    });

    test('returns 401 when no cookie present', () => {
        const req = { cookies: {} };
        const res = mockRes();
        const next = jest.fn();

        verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 with an expired token', () => {
        const expired = jwt.sign({ userId: 1 }, process.env.JWT_SECRET, { expiresIn: '-1s' });
        const req = { cookies: { token: expired } };
        const res = mockRes();
        const next = jest.fn();

        verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 with a tampered token', () => {
        const token = jwt.sign({ userId: 1 }, 'wrong_secret');
        const req = { cookies: { token } };
        const res = mockRes();
        const next = jest.fn();

        verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
    });
});
