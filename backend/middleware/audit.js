const { AuditLog } = require('../models');

/**
 * Express middleware to automatically log successful data mutations to the audit_logs table.
 * Intercepts res.send to execute audit logging after a successful response.
 */
const auditLogger = (req, res, next) => {
  // Capture the original res.send function
  const originalSend = res.send;

  res.send = function (body) {
    // Restore the original send immediately to prevent infinite recursion
    res.send = originalSend;

    // Send the response to the client
    const response = originalSend.call(this, body);

    // Audit only mutating methods on success (2xx status codes)
    const mutatingMethods = ['POST', 'PUT', 'DELETE'];
    if (mutatingMethods.includes(req.method) && res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const userId = req.user ? req.user.id : null;
        
        // Extract IP Address
        let ipAddress = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || '';
        if (Array.isArray(ipAddress)) {
          ipAddress = ipAddress[0];
        }
        ipAddress = ipAddress.split(',')[0].trim();

        // Inferred action and table name
        const pathParts = req.originalUrl.split('?')[0].split('/').filter(p => p && p !== 'api');
        const tableName = pathParts[0] || 'general';
        
        let action = `${req.method}_${tableName.toUpperCase()}`;
        if (req.originalUrl.includes('/auth/login')) {
          action = 'USER_LOGIN';
        } else if (req.originalUrl.includes('/auth/logout')) {
          action = 'USER_LOGOUT';
        } else if (req.originalUrl.includes('/dispense')) {
          action = 'DISPENSE_PRESCRIPTION';
        } else if (req.originalUrl.includes('/payment')) {
          action = 'RECORD_PAYMENT';
        }

        // Retrieve record ID: either explicitly set on req by the controller or parsed from URL parameter
        let recordId = req.auditRecordId || null;
        if (!recordId && req.params && req.params.id) {
          recordId = parseInt(req.params.id, 10);
        }

        // Try to parse recordId from JSON body response if it was a POST request and contains an id
        if (!recordId && req.method === 'POST') {
          try {
            const parsedBody = JSON.parse(body);
            if (parsedBody && parsedBody.id) {
              recordId = parsedBody.id;
            } else if (parsedBody && parsedBody.data && parsedBody.data.id) {
              recordId = parsedBody.data.id;
            }
          } catch (e) {
            // Body was not JSON or did not have id, ignore
          }
        }

        // Create audit log entry asynchronously
        AuditLog.create({
          user_id: userId,
          action: action.substring(0, 255),
          table_name: tableName.substring(0, 255),
          record_id: isNaN(recordId) ? null : recordId,
          ip_address: ipAddress.substring(0, 45)
        }).catch(err => {
          console.error('[Audit Logger Error] Failed to write to audit log:', err.message);
        });
      } catch (err) {
        console.error('[Audit Logger Error] Execution failed:', err);
      }
    }

    return response;
  };

  next();
};

module.exports = auditLogger;
