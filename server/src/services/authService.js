import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import prisma from '../config/prisma.js';

export class AuthService {
  /**
   * Generates a signed JWT token
   */
  static generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );
  }

  /**
   * Authenticates user credentials and issues token
   *
   * @param {string} email
   * @param {string} password
   */
  static async login(email, password) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        author: {
          select: {
            id: true,
            authorCode: true,
            name: true,
            phone: true,
            city: true,
            joinedDate: true,
          },
        },
      },
    });

    if (!user) {
      throw AppError.unauthorized('Invalid email or password combination.', 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw AppError.unauthorized('Invalid email or password combination.', 'INVALID_CREDENTIALS');
    }

    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        author: user.author || null,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Retrieves profile details for the authenticated user
   *
   * @param {string} userId
   */
  static async getCurrentUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            authorCode: true,
            name: true,
            phone: true,
            city: true,
            joinedDate: true,
            _count: {
              select: {
                books: true,
                tickets: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw AppError.notFound('User profile not found.', 'USER_NOT_FOUND');
    }

    return user;
  }
}

export default AuthService;
