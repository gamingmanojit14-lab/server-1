const router = require('express').Router();
const Item = require('../models/Item');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', async (req, res) => {
  const item = await Item.create({ ...req.body, owner: req.user.id });
  res.status(201).json(item);
});

router.get('/', async (req, res) => {
  const items = await Item.find({ owner: req.user.id }).sort('-createdAt').limit(100);
  res.json(items);
});

router.get('/:id', async (req, res) => {
  const item = await Item.findOne({ _id: req.params.id, owner: req.user.id });
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
});

router.patch('/:id', async (req, res) => {
  const item = await Item.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
});

router.delete('/:id', async (req, res) => {
  const result = await Item.deleteOne({ _id: req.params.id, owner: req.user.id });
  if (!result.deletedCount) return res.status(404).json({ message: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
