import { Router } from 'express';
import passport from 'passport';

const router = Router();

// Start Google OAuth
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth Callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/login`,
  }),
  (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL}/editor`);
  }
);

// Logout
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    
    // Clear the session cookie
    res.clearCookie('connect.sid', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

export default router;