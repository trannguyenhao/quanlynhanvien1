const roleMiddleware = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Truy cập bị từ chối' });
  }
  next();
};

module.exports = roleMiddleware;