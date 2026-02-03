module.exports = function handler(req, res) {
  res.status(200).json({
    status: "ok",
    name: "EchoHypno API",
    version: "0.1.0"
  });
};
