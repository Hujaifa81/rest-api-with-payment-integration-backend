/* eslint-disable @typescript-eslint/no-explicit-any */
import bcryptjs from "bcryptjs";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LocalStrategy } from "passport-local";
import { AuthProviderType, Role } from "../../generated/prisma/enums";
import ENV from "./env";
import { prisma } from "../lib/prisma";
passport.use(new LocalStrategy({
    usernameField: "email",
    passwordField: "password",
}, async (email, password, done) => {
    try {
        const isUserExist = await prisma.user.findUnique({
            where: { email },
            include: {
                authProviders: true,
            },
        });
        if (!isUserExist) {
            return done("User does not exist");
        }
        if (isUserExist.isDeleted) {
            return done("User is deleted");
        }
        if (!isUserExist.isVerified) {
            return done(null, false, {
                message: `User is not verified.Use verified email and verify email by otp.`,
            });
        }
        const isGoogleAuthenticated = isUserExist.authProviders.some((providerObjects) => providerObjects.provider == AuthProviderType.GOOGLE);
        if (isGoogleAuthenticated && !isUserExist.password) {
            return done(null, false, {
                message: "You have authenticated through Google. So if you want to login with credentials, then at first login with google and set a password for your Gmail and then you can login with email and password.",
            });
        }
        const isPasswordMatched = await bcryptjs.compare(password, isUserExist.password);
        if (!isPasswordMatched) {
            return done(null, false, { message: "Password does not match" });
        }
        return done(null, isUserExist);
    }
    catch (error) {
        console.log(error);
        done(error);
    }
}));
passport.use(new GoogleStrategy({
    clientID: ENV.GOOGLE.GOOGLE_CLIENT_ID,
    clientSecret: ENV.GOOGLE.GOOGLE_CLIENT_SECRET,
    callbackURL: ENV.GOOGLE.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile?.emails?.[0]?.value;
        if (!email) {
            return done(null, false, { message: "No email found" });
        }
        const existingGoogleProvider = await prisma.authProvider.findFirst({
            where: {
                provider: AuthProviderType.GOOGLE,
                providerId: profile.id,
            },
        });
        if (existingGoogleProvider) {
            const user = await prisma.user.findUnique({
                where: { id: existingGoogleProvider.userId },
            });
            if (!user) {
                return done(null, false, { message: "User not found" });
            }
            if (!user.isVerified) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { isVerified: true },
                });
            }
            if (user?.isDeleted) {
                return done(null, false, { message: "User is deleted" });
            }
            return done(null, user);
        }
        const user = await prisma.user.findUnique({
            where: { email },
            include: { authProviders: true },
        });
        if (user) {
            if (user.isDeleted) {
                return done(null, false, { message: "User is deleted" });
            }
            await prisma.user.update({
                where: { id: user.id },
                data: { isVerified: true },
            });
            await prisma.authProvider.create({
                data: {
                    provider: AuthProviderType.GOOGLE,
                    providerId: profile.id,
                    userId: user.id,
                },
            });
            return done(null, user);
        }
        const newUser = await prisma.$transaction(async (tx) => {
            const createdUser = await tx.user.create({
                data: {
                    email,
                    name: profile.displayName,
                    role: Role.USER,
                    isVerified: true,
                },
            });
            await tx.authProvider.create({
                data: {
                    provider: AuthProviderType.GOOGLE,
                    providerId: profile.id,
                    userId: createdUser.id,
                },
            });
            return createdUser;
        });
        return done(null, newUser);
    }
    catch (error) {
        console.error("Google Strategy Error", error);
        return done(error);
    }
}));
passport.serializeUser((user, done) => {
    done(null, user._id);
});
passport.deserializeUser(async (id, done) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id },
        });
        done(null, user);
    }
    catch (error) {
        console.log(error);
        done(error);
    }
});
//# sourceMappingURL=passport.js.map