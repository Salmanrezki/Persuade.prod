import 'dotenv/config'
import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Recréer __dirname en ES module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const defaultServiceAccountPath = path.join(__dirname, '../serviceAccountKey.json')
const configuredServiceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  ? path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  : defaultServiceAccountPath

const loadServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  }

  if (fs.existsSync(configuredServiceAccountPath)) {
    return JSON.parse(fs.readFileSync(configuredServiceAccountPath, 'utf8'))
  }

  throw new Error(
    'Firebase Admin credentials not found. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH.'
  )
}

const serviceAccount = loadServiceAccount()

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

export default admin
