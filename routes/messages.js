const router = require('express').Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET /api/messages/:userId — ১-অন-১ চ্যাট হিস্টোরি
router.get('/:userId', async (req, res) => {
  const myId = req.user.id;
  const otherId = req.params.userId;

  const messages = await Message.find({
    $or: [
      { sender: myId, receiver: otherId },
      { sender: otherId, receiver: myId },
    ],
  }).sort('createdAt').limit(200);

  res.json(messages);
});

// POST /api/messages — নতুন মেসেজ
router.post('/', async (req, res) => {
  const { receiver, text } = req.body;
  if (!receiver || !text)
    return res.status(400).json({ message: 'receiver and text required' });

  const msg = await Message.create({
    sender: req.user.id,
    receiver,
    text,
  });

  res.status(201).json(msg);
});

module.exports = router;
