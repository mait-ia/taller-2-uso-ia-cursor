const express = require('express');

function buildVaultRouter(controller) {
  const router = express.Router();
  router.post('/tokenize', controller.tokenize);
  router.post('/detokenize', controller.detokenize);
  router.post('/anonymize', controller.anonymize);
  return router;
}

module.exports = { buildVaultRouter };
