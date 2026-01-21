/* eslint-disable @typescript-eslint/no-explicit-any */
import bcryptjs from "bcryptjs";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { prisma } from "../lib/prisma.js";
import { AuthProviderType } from "../../generated/prisma/enums.js";



passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email: string, password: string, done) => {
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



        const isGoogleAuthenticated = isUserExist.authProviders.some(
          (providerObjects) => providerObjects.provider == AuthProviderType.GOOGLE
        );

        if (isGoogleAuthenticated && !isUserExist.password) {
          return done(null, false, {
            message:
              "You have authenticated through Google. So if you want to login with credentials, then at first login with google and set a password for your Gmail and then you can login with email and password.",
          });
        }

        const isPasswordMatched = await bcryptjs.compare(
          password as string,
          isUserExist.password as string
        );

        if (!isPasswordMatched) {
          return done(null, false, { message: "Password does not match" });
        }

        return done(null, isUserExist);
      } catch (error) {
        console.log(error);
        done(error);
      }
    }
  )
);



passport.serializeUser((user: any, done: (err: any, id?: unknown) => void) => {
  done(null, user._id);
});

passport.deserializeUser(async (id: string, done: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    done(null, user);
  } catch (error) {
    console.log(error);
    done(error);
  }
});
