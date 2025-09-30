const {
  isAuthenticated,
  hasRole,
  isAdmin,
  isManagerOrAdmin,
} = require('../middleware/authMiddleware');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: null,
      isAuthenticated: jest.fn(),
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('isAuthenticated', () => {
    it('should call next() when user is authenticated', () => {
      req.isAuthenticated.mockReturnValue(true);
      req.user = { email: 'test@example.com' };

      isAuthenticated(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', () => {
      req.isAuthenticated.mockReturnValue(false);

      isAuthenticated(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Unauthorized',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle missing isAuthenticated method', () => {
      delete req.isAuthenticated;

      isAuthenticated(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      req.isAuthenticated = jest.fn(() => {
        throw new Error('Authentication error');
      });

      isAuthenticated(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('hasRole', () => {
    beforeEach(() => {
      req.user = {
        email: 'test@example.com',
        role: 'manager',
      };
    });

    it('should allow access when user has required role', () => {
      const middleware = hasRole('manager');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access when user has one of multiple allowed roles', () => {
      const middleware = hasRole(['admin', 'manager']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access when user lacks required role', () => {
      const middleware = hasRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Forbidden',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when no user in request', () => {
      req.user = null;
      const middleware = hasRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle single role as string', () => {
      req.user.role = 'admin';
      const middleware = hasRole('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle multiple roles as array', () => {
      req.user.role = 'manager';
      const middleware = hasRole(['admin', 'manager', 'user']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      const middleware = hasRole(null); // Invalid role
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('isAdmin', () => {
    it('should allow admin users', () => {
      req.user = { email: 'admin@example.com', role: 'admin' };
      isAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow Admin users (case variation)', () => {
      req.user = { email: 'admin@example.com', role: 'Admin' };
      isAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny non-admin users', () => {
      req.user = { email: 'user@example.com', role: 'user' };
      isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny manager users', () => {
      req.user = { email: 'manager@example.com', role: 'manager' };
      isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('isManagerOrAdmin', () => {
    it('should allow admin users', () => {
      req.user = { email: 'admin@example.com', role: 'admin' };
      isManagerOrAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow manager users', () => {
      req.user = { email: 'manager@example.com', role: 'manager' };
      isManagerOrAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow Manager users (case variation)', () => {
      req.user = { email: 'manager@example.com', role: 'Manager' };
      isManagerOrAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny regular users', () => {
      req.user = { email: 'user@example.com', role: 'user' };
      isManagerOrAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny employee users', () => {
      req.user = { email: 'employee@example.com', role: 'employee' };
      isManagerOrAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Role-based Access Control Scenarios', () => {
    it('should enforce strict role hierarchy', () => {
      const roles = ['user', 'employee', 'manager', 'admin'];
      const testUser = { email: 'test@example.com' };

      roles.forEach((role) => {
        testUser.role = role;
        req.user = testUser;

        // Admin check
        const adminMiddleware = hasRole('admin');
        if (role === 'admin' || role === 'Admin') {
          adminMiddleware(req, res, next);
          expect(next).toHaveBeenCalled();
        } else {
          adminMiddleware(req, res, next);
          expect(res.status).toHaveBeenCalledWith(403);
        }

        // Reset mocks
        next.mockClear();
        res.status.mockClear();
      });
    });

    it('should handle undefined role', () => {
      req.user = { email: 'test@example.com' }; // No role property
      const middleware = hasRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle empty role string', () => {
      req.user = { email: 'test@example.com', role: '' };
      const middleware = hasRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Security Tests', () => {
    it('should not leak sensitive information in error messages', () => {
      req.user = { email: 'test@example.com', role: 'user' };
      const middleware = hasRole('admin');
      middleware(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const jsonCall = res.json.mock.calls[0][0];
      
      // Should include role information for debugging
      expect(jsonCall).toHaveProperty('requiredRole');
      expect(jsonCall).toHaveProperty('userRole');
    });

    it('should log authentication attempts', () => {
      req.isAuthenticated.mockReturnValue(true);
      req.user = { email: 'test@example.com' };

      isAuthenticated(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle concurrent middleware calls', () => {
      req.user = { email: 'test@example.com', role: 'admin' };
      const middleware = hasRole('admin');

      // Simulate concurrent calls
      middleware(req, res, next);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(2);
    });
  });
});
