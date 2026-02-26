const express = require('express');
const listingController = require('./listing.controller');
const adminKeyMiddleware = require('../../middleware/adminKey.middleware');
const authMiddleware = require('../../middleware/auth.middleware');

const router = express.Router();

router.get('/listings', listingController.getAllListingsController);
router.get('/listings/:id', listingController.getListingByIdController);
router.post('/listings/:id/rating', authMiddleware, listingController.rateListingController);

router.post('/admin/listings', adminKeyMiddleware, listingController.createListingController);
router.put('/admin/listings/:id', adminKeyMiddleware, listingController.updateListingController);
router.delete('/admin/listings/:id', adminKeyMiddleware, listingController.deleteListingController);

module.exports = router;
