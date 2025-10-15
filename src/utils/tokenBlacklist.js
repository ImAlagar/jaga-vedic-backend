import jwt from "jsonwebtoken";
import { createHash } from "crypto";
import prisma from "../config/prisma.js";

/**
 * Hash token for secure storage
 */
function hashToken(token) {
    return createHash('sha256').update(token).digest('hex');
}

/**
 * Add token to blacklist
 */
export async function addToBlacklist(token) {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) {
            throw new Error('Invalid token: cannot decode or no expiration');
        }

        const tokenHash = hashToken(token);
        const expiresAt = new Date(decoded.exp * 1000);

        // Store hash instead of actual token for security
        await prisma.tokenBlacklist.upsert({
            where: { tokenHash },
            update: { expiresAt },
            create: {
                tokenHash,
                expiresAt
            }
        });

        console.log('✅ Token blacklisted in database');
        return true;
    } catch (error) {
        console.error('❌ Error blacklisting token in database:', error);
        return false;
    }
}

/**
 * Check if token is blacklisted
 */
export async function isTokenBlacklisted(token) {
    try {
        const tokenHash = hashToken(token);
        
        const blacklistedToken = await prisma.tokenBlacklist.findUnique({
            where: { tokenHash }
        });

        if (!blacklistedToken) {
            return false;
        }

        // Check if token is expired and clean up
        if (new Date() > blacklistedToken.expiresAt) {
            await prisma.tokenBlacklist.delete({
                where: { tokenHash }
            });
            return false;
        }

        return true;
    } catch (error) {
        console.error('❌ Error checking token blacklist:', error);
        return false;
    }
}

/**
 * Get blacklist statistics
 */
export async function getBlacklistStats() {
    try {
        const count = await prisma.tokenBlacklist.count({
            where: {
                expiresAt: {
                    gt: new Date()
                }
            }
        });
        
        return {
            storage: 'database',
            count
        };
    } catch (error) {
        return {
            storage: 'database',
            count: 0,
            error: error.message
        };
    }
}

/**
 * Cleanup expired tokens
 */
export async function cleanupExpiredTokens() {
    try {
        const result = await prisma.tokenBlacklist.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date()
                }
            }
        });
        
        if (result.count > 0) {
            console.log(`✅ Cleaned up ${result.count} expired tokens from database`);
        }
        
        return result.count;
    } catch (error) {
        console.error('❌ Error cleaning up expired tokens:', error);
        return 0;
    }
}

/**
 * Manual cleanup function (can be called via API if needed)
 */
export async function manualCleanup() {
    try {
        const count = await cleanupExpiredTokens();
        return {
            success: true,
            message: `Cleaned up ${count} expired tokens`,
            cleanedCount: count
        };
    } catch (error) {
        return {
            success: false,
            message: 'Cleanup failed: ' + error.message
        };
    }
}

// Run cleanup every 6 hours
setInterval(cleanupExpiredTokens, 6 * 60 * 60 * 1000);

// Run immediate cleanup on startup
setTimeout(cleanupExpiredTokens, 5000);