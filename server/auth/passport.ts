import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { db } from '../db/index.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: '/auth/google/callback',
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0].value || '';
        const name = profile.displayName;
        const avatar = profile.photos?.[0].value || '';

        // Check if user exists
        const result = await db.query(
          'SELECT * FROM users WHERE google_id = $1',
          [googleId]
        );

        let user = result.rows[0];

        // Create user if new
        if (!user) {
          const createResult = await db.query(
            `INSERT INTO users (google_id, email, name, avatar) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [googleId, email, name, avatar]
          );
          user = createResult.rows[0];
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: number, done) => {
  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err, null);
  }
});

export default passport;