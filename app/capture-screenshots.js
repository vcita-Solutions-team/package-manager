import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function captureScreenshots() {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });

  try {
    const page = await browser.newPage();

    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle2' });
    await delay(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '01-login.png'), fullPage: true });
    console.log('   ✓ Screenshot saved: 01-login.png');

    console.log('2. Setting fake JWT token in localStorage...');
    await page.evaluate(() => {
      localStorage.setItem('operator_jwt_token', 'fake-token-for-prototype');
      console.log('Token set:', localStorage.getItem('operator_jwt_token'));
    });
    await delay(500);
    console.log('   ✓ Token set');

    console.log('3. Navigating to Dashboard...');
    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2', timeout: 10000 });
    await delay(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '02-dashboard.png'), fullPage: true });
    console.log('   ✓ Screenshot saved: 02-dashboard.png');

    console.log('4. Navigating to Package List...');
    await page.goto('http://localhost:3001/packages', { waitUntil: 'networkidle2', timeout: 10000 });
    await delay(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '03-package-list.png'), fullPage: true });
    console.log('   ✓ Screenshot saved: 03-package-list.png');

    console.log('5. Navigating to Feature Catalog...');
    await page.goto('http://localhost:3001/features', { waitUntil: 'networkidle2', timeout: 10000 });
    await delay(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '04-feature-catalog.png'), fullPage: true });
    console.log('   ✓ Screenshot saved: 04-feature-catalog.png');

    console.log('6. Navigating to Create Package wizard...');
    await page.goto('http://localhost:3001/packages/new', { waitUntil: 'networkidle2', timeout: 10000 });
    await delay(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '05-create-package.png'), fullPage: true });
    console.log('   ✓ Screenshot saved: 05-create-package.png');

    console.log('7. Navigating to Package Detail (pkg_003)...');
    await page.goto('http://localhost:3001/packages/pkg_003', { waitUntil: 'networkidle2', timeout: 10000 });
    await delay(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '06-package-detail.png'), fullPage: true });
    console.log('   ✓ Screenshot saved: 06-package-detail.png');

    console.log('8. Navigating to Compare page...');
    await page.goto('http://localhost:3001/compare', { waitUntil: 'networkidle2', timeout: 10000 });
    await delay(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '07-compare.png'), fullPage: true });
    console.log('   ✓ Screenshot saved: 07-compare.png');

    console.log('\n✅ All screenshots captured successfully!');
    console.log(`📁 Screenshots saved to: ${screenshotsDir}`);

  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
