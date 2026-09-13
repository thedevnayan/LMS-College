const AuditLog = require('../models/AuditLog');

/**
 * Record an audit log entry
 */
const logAudit = async ({ actor, action, entity, entityId, metadata = {} }) => {
  try {
    const actorId = actor ? (actor._id || actor.id) : null;
    const actorName = actor ? actor.name : 'System';
    const actorRole = actor ? actor.role : 'system';

    await AuditLog.create({
      actorId,
      actorName,
      actorRole,
      action,
      entity,
      entityId: String(entityId),
      metadata,
    });
  } catch (err) {
    console.error('Audit logging failed:', err.message);
  }
};

module.exports = { logAudit };
