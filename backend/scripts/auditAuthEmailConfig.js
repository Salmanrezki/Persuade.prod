// Read-only audit: does not send emails, generate action links, or modify accounts.
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import admin from '../src/firebaseAdmin.js'

const frontendEnv = dotenv.parse(fs.readFileSync(fileURLToPath(new URL('../../front/.env.local', import.meta.url))))
const credential = admin.app().options.credential
const projectId = credential.projectId || admin.app().options.projectId
const report = { frontendProjectId: frontendEnv.VITE_FIREBASE_PROJECT_ID, backendProjectId: projectId, sameProject: projectId === frontendEnv.VITE_FIREBASE_PROJECT_ID, authDomain: frontendEnv.VITE_FIREBASE_AUTH_DOMAIN }
try {
  const { access_token } = await credential.getAccessToken()
  const response = await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/${encodeURIComponent(projectId)}/config`, {
    headers: { Authorization: `Bearer ${access_token}` }, signal: AbortSignal.timeout(15000),
  })
  const data = await response.json()
  report.configStatus = response.status
  if (response.ok) {
    const email = data.notification?.sendEmail || {}
    report.passwordSignInEnabled = data.signIn?.email?.enabled
    report.passwordRequired = data.signIn?.email?.passwordRequired
    report.authorizedDomains = data.authorizedDomains || []
    report.emailMethod = email.method || 'DEFAULT'
    report.defaultLocale = data.notification?.defaultLocale || 'unspecified'
    report.callbackUri = email.callbackUri || null
    report.customDomainState = email.dnsInfo?.customDomainState || null
    report.customDomain = email.dnsInfo?.customDomain || null
    report.emailTemplates = Object.fromEntries(['resetPasswordTemplate', 'verifyEmailTemplate', 'changeEmailTemplate'].map(key => {
      const template = email[key] || {}
      return [key, { configured: !!email[key], senderDisplayName: template.senderDisplayName || '', senderLocalPart: template.senderLocalPart || '', customized: template.customized === true, containsActionLink: template.body ? template.body.includes('%LINK%') : null }]
    }))
  } else report.configError = data.error?.status || 'UNKNOWN'
  const publicResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${encodeURIComponent(frontendEnv.VITE_FIREBASE_API_KEY || '')}`, { signal: AbortSignal.timeout(15000) })
  const publicData = await publicResponse.json()
  report.frontendApiKeyStatus = publicResponse.status
  if (publicResponse.ok) {
    report.frontendApiProjectId = publicData.projectId
    report.frontendApiKeyMatchesApp = String(publicData.projectId) === frontendEnv.VITE_FIREBASE_APP_ID?.split(':')[1]
    report.frontendAuthDomainAuthorized = publicData.authorizedDomains?.includes(frontendEnv.VITE_FIREBASE_AUTH_DOMAIN) || false
  } else report.frontendApiKeyError = publicData.error?.status || 'UNKNOWN'
  const handler = new URL(`https://${frontendEnv.VITE_FIREBASE_AUTH_DOMAIN}/__/auth/action`)
  const handlerResponse = await fetch(handler, { signal: AbortSignal.timeout(15000) })
  report.defaultActionHandlerStatus = handlerResponse.status
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  console.log(JSON.stringify({ ...report, auditFailed: true, code: error.code || error.cause?.code || error.name }, null, 2))
  process.exitCode = 1
}
