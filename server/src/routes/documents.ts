// server/src/routes/documents.ts
import { Router, Request, Response } from 'express';
import { documents } from '../../db/documents.js';

const router = Router();

const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    const userId = (req.user as any).id;
    const doc = await documents.create(userId, title || 'Untitled Document');
    res.status(201).json(doc);
  } catch (err) {
    console.error('Create doc error:', err);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const docs = await documents.getByUser(userId);
    res.json(docs);
  } catch (err) {
    console.error('Get docs error:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;
    const doc = await documents.getById(id, userId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found or access denied' });
    }
    res.json(doc);
  } catch (err) {
    console.error('Get doc error:', err);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

router.get('/search-users', requireAuth, async (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    const userId = (req.user as any).id;
    if (!email || typeof email !== 'string' || email.length < 2) {
      return res.json([]);
    }
    const users = await documents.searchUsers(email, userId);
    res.json(users);
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

router.post('/:id/share', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, permission } = req.body;
    const userId = (req.user as any).id;
    if (!email || !['editor', 'viewer'].includes(permission)) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    const doc = await documents.getById(id, userId);
    if (!doc || (doc.permission !== 'owner' && doc.permission !== 'editor')) {
      return res.status(403).json({ error: 'Cannot share this document' });
    }
    const result = await documents.share(id, email, permission as 'editor' | 'viewer', userId);
    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }
    res.json({ success: true, message: 'Document shared successfully' });
  } catch (err) {
    console.error('Share error:', err);
    res.status(500).json({ error: 'Failed to share document' });
  }
});

router.get('/:id/collaborators', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;
    const doc = await documents.getById(id, userId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const collaborators = await documents.getCollaborators(id);
    res.json(collaborators);
  } catch (err) {
    console.error('Get collaborators error:', err);
    res.status(500).json({ error: 'Failed to fetch collaborators' });
  }
});

router.delete('/:id/collaborators/:targetUserId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id, targetUserId } = req.params;
    const userId = (req.user as any).id;
    const result = await documents.removePermission(id, parseInt(targetUserId), userId);
    if (!result.success) {
      return res.status(403).json({ error: result.error });
    }
    res.json({ success: true, message: 'Access removed' });
  } catch (err) {
    console.error('Remove collaborator error:', err);
    res.status(500).json({ error: 'Failed to remove access' });
  }
});

export default router;