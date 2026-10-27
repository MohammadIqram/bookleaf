import { AuthService } from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.login(email, password);

  // Set httpOnly cookie for web security, while also providing token in response for clients
  const isProduction = env.NODE_ENV === 'production';
  res.cookie('token', result.token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(200).json({
    message: 'Authentication successful',
    token: result.token,
    user: result.user,
  });
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });

  res.status(200).json({
    message: 'Logged out successfully',
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await AuthService.getCurrentUser(req.user.id);

  res.status(200).json({
    user,
  });
});
