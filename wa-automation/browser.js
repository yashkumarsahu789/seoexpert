const fs = require('fs')
const path = require('path')

function fileExists(candidate) {
  try {
    return Boolean(candidate && fs.existsSync(candidate))
  } catch {
    return false
  }
}

function resolveSystemBrowser() {
  const candidates = []

  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH)
  if (process.env.PUPPETEER_EXECUTABLE_PATH) candidates.push(process.env.PUPPETEER_EXECUTABLE_PATH)

  if (process.platform === 'win32') {
    const pf = process.env.ProgramFiles || 'C:\\Program Files'
    const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
    const local = process.env.LOCALAPPDATA || ''
    candidates.push(
      path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(local, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(pf86, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
    )
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    )
  } else {
    candidates.push(
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium'
    )
  }

  return candidates.find(fileExists) || ''
}

function resolvePuppeteerBrowser() {
  try {
    const puppeteer = require('puppeteer')
    if (typeof puppeteer.executablePath === 'function') {
      const bundled = puppeteer.executablePath()
      if (fileExists(bundled)) return bundled
    }
  } catch {
    /* puppeteer cache empty */
  }
  return ''
}

function getBrowserExecutable() {
  return resolveSystemBrowser() || resolvePuppeteerBrowser()
}

function getPuppeteerConfig() {
  const executablePath = getBrowserExecutable()
  const config = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  }

  if (executablePath) {
    config.executablePath = executablePath
  }

  return { config, executablePath }
}

function getBrowserHelpMessage() {
  return [
    'Chrome/Chromium nahi mila.',
    'Windows: Google Chrome install karo, ya run karo:',
    '  npm run wa:chrome --prefix wa-automation',
    'Optional env: CHROME_PATH=C:\\path\\to\\chrome.exe',
  ].join(' ')
}

module.exports = {
  getBrowserExecutable,
  getBrowserHelpMessage,
  getPuppeteerConfig,
}
