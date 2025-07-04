module.exports = {
  setAuthToken: function(requestParams, context, ee, next) {
    // Set default auth token if not already set
    if (!context.vars.authToken) {
      context.vars.authToken = 'default-token';
    }
    return next();
  }
};
