import { db } from './index.js';

export const documents = {
  // Create new document
  create: async (ownerId: number, title: string = 'Untitled Document') => {
    const result = await db.query(
      `INSERT INTO documents (title, owner_id) 
       VALUES ($1, $2) RETURNING *`,
      [title, ownerId]
    );
    
    // Grant owner permission
    await db.query(
      `INSERT INTO document_permissions (document_id, user_id, permission, granted_by)
       VALUES ($1, $2, 'owner', $2)`,
      [result.rows[0].id, ownerId]
    );
    
    return result.rows[0];
  },

  // Get documents for a user (owned + shared)
  getByUser: async (userId: number) => {
    const result = await db.query(
      `SELECT 
        d.*,
        dp.permission,
        u.name as owner_name,
        u.avatar as owner_avatar,
        (SELECT COUNT(*) FROM document_permissions WHERE document_id = d.id) as collaborator_count
       FROM documents d
       JOIN document_permissions dp ON d.id = dp.document_id
       JOIN users u ON d.owner_id = u.id
       WHERE dp.user_id = $1
       ORDER BY d.updated_at DESC`,
      [userId]
    );
    return result.rows;
  },

  // Get document with permission check
  getById: async (documentId: string, userId: number) => {
    const result = await db.query(
      `SELECT 
        d.*,
        dp.permission,
        u.name as owner_name,
        u.email as owner_email,
        u.avatar as owner_avatar
       FROM documents d
       JOIN document_permissions dp ON d.id = dp.document_id
       JOIN users u ON d.owner_id = u.id
       WHERE d.id = $1 AND dp.user_id = $2`,
      [documentId, userId]
    );
    return result.rows[0];
  },

  // Update document content
  updateContent: async (documentId: string, content: any) => {
    await db.query(
      `UPDATE documents SET content = $1, updated_at = NOW() WHERE id = $2`,
      [content, documentId]
    );
  },

  // Search users by email (for sharing)
  searchUsers: async (email: string, excludeUserId: number) => {
    const result = await db.query(
      `SELECT id, email, name, avatar 
       FROM users 
       WHERE email ILIKE $1 AND id != $2
       LIMIT 10`,
      [`${email}%`, excludeUserId]
    );
    return result.rows;
  },

  // Share document with user
  share: async (documentId: string, targetEmail: string, permission: 'editor' | 'viewer', grantedBy: number) => {
    // Find target user
    const userResult = await db.query(
      `SELECT id FROM users WHERE email = $1`,
      [targetEmail.toLowerCase()]
    );
    
    if (userResult.rows.length === 0) {
      return { success: false, error: 'User not found' };
    }
    
    const targetUserId = userResult.rows[0].id;
    
    // Check if already shared
    const existing = await db.query(
      `SELECT * FROM document_permissions WHERE document_id = $1 AND user_id = $2`,
      [documentId, targetUserId]
    );
    
    if (existing.rows.length > 0) {
      // Update permission if already shared
      await db.query(
        `UPDATE document_permissions SET permission = $1, granted_at = NOW() 
         WHERE document_id = $2 AND user_id = $3`,
        [permission, documentId, targetUserId]
      );
    } else {
      // Insert new permission
      await db.query(
        `INSERT INTO document_permissions (document_id, user_id, permission, granted_by)
         VALUES ($1, $2, $3, $4)`,
        [documentId, targetUserId, permission, grantedBy]
      );
    }
    
    return { success: true, userId: targetUserId };
  },

  // Get collaborators for a document
  getCollaborators: async (documentId: string) => {
    const result = await db.query(
      `SELECT 
        u.id, u.email, u.name, u.avatar, dp.permission, dp.granted_at
       FROM document_permissions dp
       JOIN users u ON dp.user_id = u.id
       WHERE dp.document_id = $1
       ORDER BY dp.permission DESC, u.name`,
      [documentId]
    );
    return result.rows;
  },

  // Remove permission (owner only)
  removePermission: async (documentId: string, targetUserId: number, requestedBy: number) => {
    // Verify requester is owner
    const ownerCheck = await db.query(
      `SELECT owner_id FROM documents WHERE id = $1`,
      [documentId]
    );
    
    if (ownerCheck.rows[0]?.owner_id !== requestedBy) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // Cannot remove owner permission
    const targetPerm = await db.query(
      `SELECT permission FROM document_permissions WHERE document_id = $1 AND user_id = $2`,
      [documentId, targetUserId]
    );
    
    if (targetPerm.rows[0]?.permission === 'owner') {
      return { success: false, error: 'Cannot remove owner' };
    }
    
    await db.query(
      `DELETE FROM document_permissions WHERE document_id = $1 AND user_id = $2`,
      [documentId, targetUserId]
    );
    
    return { success: true };
  },

  // Log activity for "last edited" indicators
  logActivity: async (documentId: string, userId: number, action: string, lineNumber?: number) => {
    await db.query(
      `INSERT INTO document_activity (document_id, user_id, action, line_number)
       VALUES ($1, $2, $3, $4)`,
      [documentId, userId, action, lineNumber || null]
    );
  },

  // Get recent activity for a document
  getRecentActivity: async (documentId: string, limit: number = 10) => {
    const result = await db.query(
      `SELECT 
        da.*,
        u.name, u.avatar, u.email
       FROM document_activity da
       JOIN users u ON da.user_id = u.id
       WHERE da.document_id = $1
       ORDER BY da.timestamp DESC
       LIMIT $2`,
      [documentId, limit]
    );
    return result.rows;
  }
};