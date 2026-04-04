const express = require('express');
const listingController = require('./listing.controller');
const adminKeyMiddleware = require('../../middleware/adminKey.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const { cacheMiddleware, TTL, invalidate } = require('../../config/cache');

const router = express.Router();

function invalidateListings(req, res, next) {
  const origJson = res.json.bind(res);
  res.json = (body) => { invalidate('listings'); return origJson(body); };
  next();
}

router.get('/listings', cacheMiddleware('listings', TTL.LONG), listingController.getAllListingsController);
router.get('/listings/:id', listingController.getListingByIdController);
router.post('/listings/:id/rating', authMiddleware, listingController.rateListingController);

router.post('/admin/listings', adminKeyMiddleware, invalidateListings, listingController.createListingController);
router.put('/admin/listings/:id', adminKeyMiddleware, invalidateListings, listingController.updateListingController);
router.delete('/admin/listings/:id', adminKeyMiddleware, invalidateListings, listingController.deleteListingController);

module.exports = router;
