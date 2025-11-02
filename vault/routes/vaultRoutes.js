const express = require('express');

function buildVaultRouter(controller) {
  const router = express.Router();
  router.post('/tokenize', controller.tokenize);
  router.post('/detokenize', controller.detokenize);
  router.post('/anonymize', controller.anonymize);
  router.post('/deanonymize', controller.deanonymize);
  router.post('/secureChatGPT', controller.secureChatGPT);
  return router;
}

module.exports = { buildVaultRouter };
