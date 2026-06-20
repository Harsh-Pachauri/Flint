// server.js
const { server } = require('./app');

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Dating app server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
