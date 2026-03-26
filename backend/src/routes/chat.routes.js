import express from 'express'
import admin from '../firebaseAdmin.js'
import { verifyToken } from '../middleware/authMiddleware.js'

const router = express.Router()

const conversationsCollection = () => admin.firestore().collection('conversations')
const usersCollection = () => admin.firestore().collection('users')

const conversationIdFor = (uidA, uidB) => [uidA, uidB].sort().join('__')

const getUserProfile = async (uid) => {
  const doc = await usersCollection().doc(uid).get()
  return doc.exists ? { uid: doc.id, ...doc.data() } : { uid }
}

router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const snapshot = await conversationsCollection()
      .where('participants', 'array-contains', req.user.uid)
      .get()

    const conversations = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    const otherIds = conversations
      .map((conv) => conv.participants?.find((id) => id !== req.user.uid))
      .filter(Boolean)

    const uniqueIds = Array.from(new Set(otherIds))
    const usersMap = {}

    await Promise.all(
      uniqueIds.map(async (uid) => {
        const profile = await getUserProfile(uid)
        usersMap[uid] = profile
      })
    )

    const sorted = conversations.sort((a, b) => {
      const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0
      const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0
      return timeB - timeA
    })

    const result = sorted.map((conv) => {
      const otherId = conv.participants?.find((id) => id !== req.user.uid)
      return {
        ...conv,
        otherUser: otherId ? usersMap[otherId] : null,
      }
    })

    res.json(result)
  } catch (error) {
    console.error('GET /api/chat/conversations failed:', error)
    res.status(500).json({ message: 'Failed to load conversations' })
  }
})

router.post('/conversations', verifyToken, async (req, res) => {
  try {
    const { participantId } = req.body || {}
    if (!participantId) {
      return res.status(400).json({ message: 'Missing participantId' })
    }

    if (participantId === req.user.uid) {
      return res.status(400).json({ message: 'Invalid participantId' })
    }

    const conversationId = conversationIdFor(req.user.uid, participantId)
    const ref = conversationsCollection().doc(conversationId)
    const doc = await ref.get()

    if (!doc.exists) {
      await ref.set({
        participants: [req.user.uid, participantId].sort(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessage: '',
        lastSenderId: null,
      })
    }

    const updated = await ref.get()
    res.json({ id: updated.id, ...updated.data() })
  } catch (error) {
    res.status(500).json({ message: 'Failed to create conversation' })
  }
})

router.get('/conversations/:id/messages', verifyToken, async (req, res) => {
  try {
    const ref = conversationsCollection().doc(req.params.id)
    const doc = await ref.get()
    if (!doc.exists) {
      return res.status(404).json({ message: 'Conversation not found' })
    }

    const data = doc.data()
    if (!data.participants?.includes(req.user.uid)) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const snapshot = await ref.collection('messages').orderBy('createdAt', 'asc').limit(200).get()
    const messages = snapshot.docs.map((msg) => ({ id: msg.id, ...msg.data() }))

    res.json(messages)
  } catch (error) {
    res.status(500).json({ message: 'Failed to load messages' })
  }
})

router.post('/conversations/:id/messages', verifyToken, async (req, res) => {
  try {
    const { text, attachment } = req.body || {}
    const normalizedText = typeof text === 'string' ? text.trim() : ''

    if (!normalizedText && !attachment) {
      return res.status(400).json({ message: 'Missing content' })
    }

    const ref = conversationsCollection().doc(req.params.id)
    const doc = await ref.get()
    if (!doc.exists) {
      return res.status(404).json({ message: 'Conversation not found' })
    }

    const data = doc.data()
    if (!data.participants?.includes(req.user.uid)) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const messageData = {
      text: normalizedText,
      attachment: attachment || null,
      senderId: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    const msgRef = await ref.collection('messages').add(messageData)
    await ref.update({
      lastMessage: messageData.text
        ? messageData.text.slice(0, 200)
        : messageData.attachment?.name
        ? `Pièce jointe: ${messageData.attachment.name}`.slice(0, 200)
        : 'Pièce jointe',
      lastSenderId: req.user.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    res.status(201).json({ id: msgRef.id, ...messageData })
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message' })
  }
})

export default router
